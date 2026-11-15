import { getSessionUser } from '@/lib/auth/session'
import { normalizeRoles } from '@/lib/auth/roles'
import { buildCacheKey, CACHE_TTL, getOrSetCache } from '@/lib/cache/redisCache'
import { getWingContext } from '@/lib/wingServer'
import { inferWing, matchesWingFilter } from '@/lib/wing'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  FileText,
  Calendar as CalendarIcon,
  Briefcase,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  ClipboardCheck,
  GraduationCap,
  ArrowRight,
  PenLine,
  FileSpreadsheet,
  School,
} from 'lucide-react'
import { formatDate } from '@/utils/date'

export default async function PrincipalDashboardPage() {
  const { user, profile, roles: userRoles, supabase } = await getSessionUser()

  if (
    !user ||
    (!userRoles.includes('Principal') &&
      !userRoles.includes('Director') &&
      !userRoles.includes('System Admin'))
  ) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const wingContext = await getWingContext(user.id, profile)
  const activeWingLabel =
    wingContext.activeWingFilter === 'all'
      ? 'All Wings (Cambridge & NECTA)'
      : `${wingContext.activeWingFilter} Wing`

  // Fetch all Principal Dashboard metrics in a single parallel batch (cached 60s per wing filter)
  const data = await getOrSetCache(
    buildCacheKey('dashboard:principal_summary_v2', [], wingContext.activeWingFilter),
    CACHE_TTL.DASHBOARD_SUMMARY,
    async () => {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

      const [
        { data: studentsRaw },
        { data: profilesRaw },
        { data: classesRaw },
        { data: lessonPlansRaw },
        { data: attendanceTodayRaw },
        { data: marksRaw },
        { data: invoicesRaw },
        { data: paymentsTodayRaw },
        { data: admissionsRaw },
        { count: leaveCnt },
        { count: advCnt },
        { data: eventsData },
      ] = await Promise.all([
        supabase
          .from('students')
          .select('id, grade_level, section, class_id, status, created_at'),
        supabase
          .from('profiles')
          .select('id, first_name, last_name, role, roles'),
        supabase
          .from('classes')
          .select('id, name, section'),
        supabase
          .from('lesson_plans')
          .select('id, teacher_id, status, term, week_number, submitted_at, class_id')
          .order('submitted_at', { ascending: false })
          .limit(300),
        supabase
          .from('attendance')
          .select('id, student_id, class_id, status')
          .eq('date', todayStr),
        supabase
          .from('marks')
          .select('id, graded_by, class_id, is_released, is_locked')
          .limit(1000),
        supabase
          .from('invoices')
          .select('id, net_amount, paid_amount, total_paid, status, students:student_id(grade_level, section)'),
        supabase
          .from('payments')
          .select('id, amount, payment_method, students:student_id(grade_level, section)')
          .gte('payment_date', startOfToday.toISOString()),
        supabase
          .from('admission_applications')
          .select('id, status, grade_applied, wing, created_at')
          .limit(500),
        supabase
          .from('leave_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Submitted'),
        supabase
          .from('salary_advances')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Submitted'),
        supabase
          .from('calendar_events')
          .select('id, title, event_type, start_date')
          .gte('start_date', startOfToday.toISOString())
          .order('start_date', { ascending: true })
          .limit(7),
      ])

      // 1. STUDENT POPULATION & GROWTH
      const allActiveStudents = (studentsRaw || []).filter(
        (s: any) => !s.status || s.status === 'Active'
      )
      const cambridgeTotal = allActiveStudents.filter(
        (s: any) => inferWing(s) === 'Cambridge'
      ).length
      const nectaTotal = allActiveStudents.filter(
        (s: any) => inferWing(s) === 'NECTA'
      ).length

      const scopedStudents = allActiveStudents.filter((s: any) =>
        matchesWingFilter(s, wingContext.activeWingFilter)
      )

      const newStudents30d = scopedStudents.filter(
        (s: any) => s.created_at && s.created_at >= thirtyDaysAgo
      ).length
      const newStudents90d = scopedStudents.filter(
        (s: any) => s.created_at && s.created_at >= ninetyDaysAgo
      ).length

      // Grade / Section distribution
      const gradeCountsMap: Record<string, number> = {}
      scopedStudents.forEach((s: any) => {
        const grade = (s.grade_level || 'Unassigned').trim()
        gradeCountsMap[grade] = (gradeCountsMap[grade] || 0) + 1
      })
      const gradeDistribution = Object.entries(gradeCountsMap)
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // Admissions pipeline
      const scopedAdmissions = (admissionsRaw || []).filter((a: any) =>
        matchesWingFilter(
          { wing: a.wing, grade_level: a.grade_applied },
          wingContext.activeWingFilter
        )
      )
      const totalApplications = scopedAdmissions.length
      const pendingApplications = scopedAdmissions.filter((a: any) =>
        ['Submitted', 'Pending', 'Under Review', 'Pending Payment'].includes(
          String(a.status || 'Pending')
        )
      ).length
      const approvedApplications = scopedAdmissions.filter((a: any) =>
        ['Approved', 'Enrolled', 'Admitted'].includes(String(a.status || ''))
      ).length

      // 2. STAFF & TEACHER COMPLIANCE
      const allProfiles = profilesRaw || []
      const staffMembers = allProfiles.filter((p: any) => {
        const r = normalizeRoles(p)
        return r.some((role) =>
          ['Teacher', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Director'].includes(role)
        )
      })
      const teachers = allProfiles.filter((p: any) => normalizeRoles(p).includes('Teacher'))

      const lessonPlans = lessonPlansRaw || []
      const pendingLessonPlans = lessonPlans.filter((lp: any) => lp.status === 'Submitted').length
      const approvedLessonPlans = lessonPlans.filter((lp: any) => lp.status === 'Approved').length

      const marks = marksRaw || []

      const teacherComplianceRows = teachers.map((t: any) => {
        const tPlans = lessonPlans.filter((lp: any) => lp.teacher_id === t.id)
        const tMarks = marks.filter((m: any) => m.graded_by === t.id)

        let planStatus: 'Approved' | 'Submitted' | 'Returned' | 'Not Submitted' = 'Not Submitted'
        if (tPlans.some((p: any) => p.status === 'Approved')) {
          planStatus = 'Approved'
        } else if (tPlans.some((p: any) => p.status === 'Submitted')) {
          planStatus = 'Submitted'
        } else if (tPlans.some((p: any) => p.status === 'Returned')) {
          planStatus = 'Returned'
        }

        return {
          id: t.id,
          name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Teacher',
          planStatus,
          plansCount: tPlans.length,
          marksEnteredCount: tMarks.length,
        }
      })

      // Sort so teachers needing review or not submitted appear prominently
      teacherComplianceRows.sort((a, b) => {
        const order = { Submitted: 0, 'Not Submitted': 1, Returned: 2, Approved: 3 }
        return order[a.planStatus] - order[b.planStatus]
      })

      const compliantTeachersCount = teacherComplianceRows.filter(
        (t) => t.planStatus === 'Approved' || t.planStatus === 'Submitted'
      ).length
      const teachersWithMarksCount = teacherComplianceRows.filter(
        (t) => t.marksEnteredCount > 0
      ).length

      const lessonPlanCompliancePct =
        teachers.length > 0 ? Math.round((compliantTeachersCount / teachers.length) * 100) : 100
      const marksEntryCompliancePct =
        teachers.length > 0 ? Math.round((teachersWithMarksCount / teachers.length) * 100) : 100

      // Daily Attendance Compliance
      const scopedClasses = (classesRaw || []).filter((c: any) =>
        matchesWingFilter(c, wingContext.activeWingFilter)
      )
      const attendanceToday = attendanceTodayRaw || []
      const classesMarkedSet = new Set(
        attendanceToday.map((a: any) => a.class_id).filter(Boolean)
      )
      const classesMarkedCount = classesMarkedSet.size
      const totalClassesCount = scopedClasses.length
      const attendanceMarkingCompliancePct =
        totalClassesCount > 0
          ? Math.min(100, Math.round((classesMarkedCount / totalClassesCount) * 100))
          : 100

      const presentTodayCount = attendanceToday.filter(
        (a: any) => a.status === 'Present' || a.status === 'Late'
      ).length
      const studentAttendanceRatePct =
        attendanceToday.length > 0
          ? Math.round((presentTodayCount / attendanceToday.length) * 100)
          : 100

      // 3. FEE COLLECTION
      const scopedInvoices = (invoicesRaw || []).filter((inv: any) =>
        matchesWingFilter(inv.students || {}, wingContext.activeWingFilter)
      )
      let feesBilled = 0
      let feesCollected = 0
      let paidInvoicesCount = 0
      let partialInvoicesCount = 0
      let unpaidInvoicesCount = 0

      scopedInvoices.forEach((inv: any) => {
        const net = Number(inv.net_amount || 0)
        const paid = Number(inv.total_paid ?? inv.paid_amount ?? 0)
        feesBilled += net
        feesCollected += paid
        if (paid >= net && net > 0) {
          paidInvoicesCount++
        } else if (paid > 0 && paid < net) {
          partialInvoicesCount++
        } else {
          unpaidInvoicesCount++
        }
      })

      const feesOutstanding = Math.max(0, feesBilled - feesCollected)
      const collectionRatePct =
        feesBilled > 0 ? Math.min(100, Math.round((feesCollected / feesBilled) * 100)) : 0

      const scopedPaymentsToday = (paymentsTodayRaw || []).filter((p: any) =>
        matchesWingFilter(p.students || {}, wingContext.activeWingFilter)
      )
      const collectedToday = scopedPaymentsToday.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0
      )

      return {
        // Population
        totalStudents: scopedStudents.length,
        cambridgeTotal,
        nectaTotal,
        newStudents30d,
        newStudents90d,
        gradeDistribution,
        totalApplications,
        pendingApplications,
        approvedApplications,
        // Staff & Compliance
        totalStaff: staffMembers.length,
        totalTeachers: teachers.length,
        compliantTeachersCount,
        lessonPlanCompliancePct,
        pendingLessonPlans,
        approvedLessonPlans,
        teachersWithMarksCount,
        marksEntryCompliancePct,
        totalMarksCount: marks.length,
        teacherComplianceRows: teacherComplianceRows.slice(0, 8),
        classesMarkedCount,
        totalClassesCount,
        attendanceMarkingCompliancePct,
        studentAttendanceRatePct,
        attendanceRecordsToday: attendanceToday.length,
        // Finance
        feesBilled,
        feesCollected,
        feesOutstanding,
        collectionRatePct,
        collectedToday,
        todayTxCount: scopedPaymentsToday.length,
        paidInvoicesCount,
        partialInvoicesCount,
        unpaidInvoicesCount,
        // Operations & Events
        pendingLeave: leaveCnt || 0,
        pendingAdvances: advCnt || 0,
        upcomingEvents: eventsData || [],
      }
    }
  )

  const formatTZS = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompactTZS = (amount: number) => {
    if (amount >= 1_000_000_000) return `TZS ${(amount / 1_000_000_000).toFixed(2)}B`
    if (amount >= 1_000_000) return `TZS ${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `TZS ${(amount / 1_000).toFixed(0)}K`
    return `TZS ${amount.toLocaleString()}`
  }

  const totalDualWing = data.cambridgeTotal + data.nectaTotal
  const cambridgePct =
    totalDualWing > 0 ? Math.round((data.cambridgeTotal / totalDualWing) * 100) : 50
  const nectaPct = totalDualWing > 0 ? 100 - cambridgePct : 50

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', margin: 0, fontWeight: 800 }}>
            Principal Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Teacher compliance, student population growth, fee collection, and school events • Scope:{' '}
            <strong>{activeWingLabel}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/principal/lesson-plans"
            className="btn btn-primary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <FileText size={15} /> Review Lesson Plans
          </Link>
          <Link
            href="/dashboard/principal/admissions"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <GraduationCap size={15} /> Admissions Desk
          </Link>
          <Link
            href="/dashboard/principal/collection-report"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <Wallet size={15} /> Collection Report
          </Link>
        </div>
      </div>

      {/* Top Executive KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* 1. Student Population & Growth */}
        <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Student Population
            </span>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 179, 195, 0.12)', borderRadius: 'var(--radius-md)' }}>
              <Users size={18} color="var(--color-secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            {data.totalStudents}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={13} /> +{data.newStudents30d} new (30d) • +{data.newStudents90d} this term
          </div>
        </div>

        {/* 2. Teacher Compliance */}
        <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Teacher Compliance
            </span>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', borderRadius: 'var(--radius-md)' }}>
              <UserCheck size={18} color="var(--color-success)" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {data.lessonPlanCompliancePct}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            <strong>{data.compliantTeachersCount}/{data.totalTeachers}</strong> lesson plans •{' '}
            <strong style={{ color: data.pendingLessonPlans > 0 ? 'var(--color-error)' : 'inherit' }}>
              {data.pendingLessonPlans} to review
            </strong>
          </div>
        </div>

        {/* 3. Daily Attendance Rate */}
        <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Attendance Today
            </span>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(0, 38, 75, 0.08)', borderRadius: 'var(--radius-md)' }}>
              <ClipboardCheck size={18} color="var(--color-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            {data.studentAttendanceRatePct}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            <strong>{data.classesMarkedCount}/{data.totalClassesCount}</strong> classes marked ({data.attendanceRecordsToday} learners)
          </div>
        </div>

        {/* 4. Fee Collection Rate */}
        <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Fee Collection Rate
            </span>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(247, 178, 57, 0.15)', borderRadius: 'var(--radius-md)' }}>
              <Wallet size={18} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-success)' }}>
            {data.collectionRatePct}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            <strong>{formatCompactTZS(data.feesCollected)}</strong> of {formatCompactTZS(data.feesBilled)}
          </div>
        </div>

        {/* 5. Admissions Pipeline */}
        <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Admissions Pipeline
            </span>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 179, 195, 0.12)', borderRadius: 'var(--radius-md)' }}>
              <GraduationCap size={18} color="var(--color-secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {data.totalApplications}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            <strong style={{ color: 'var(--color-warning)' }}>{data.pendingApplications} pending</strong> •{' '}
            <strong style={{ color: 'var(--color-success)' }}>{data.approvedApplications} admitted</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid: Teacher Compliance & Student Population Growth */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* SECTION 1: TEACHER COMPLIANCE & ACADEMIC OVERSIGHT */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <UserCheck size={20} color="var(--color-primary)" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                Teacher Compliance & Academic Delivery
              </h2>
            </div>
            <Link
              href="/dashboard/principal/lesson-plans"
              style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Full Compliance Report <ArrowRight size={14} />
            </Link>
          </div>

          {/* 3 Compliance Progress Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            {/* Lesson Plan Submission */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  Weekly Lesson Plans Submitted
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  {data.compliantTeachersCount} / {data.totalTeachers} Teachers ({data.lessonPlanCompliancePct}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${data.lessonPlanCompliancePct}%`,
                    height: '100%',
                    backgroundColor: data.lessonPlanCompliancePct >= 80 ? 'var(--color-success)' : data.lessonPlanCompliancePct >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Marks Entry Activity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  Term Marks & Grading Entry
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                  {data.teachersWithMarksCount} / {data.totalTeachers} Teachers ({data.marksEntryCompliancePct}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${data.marksEntryCompliancePct}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-secondary)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Daily Class Attendance Marking */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  Daily Class Register Marked (Today)
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                  {data.classesMarkedCount} / {data.totalClassesCount} Classes ({data.attendanceMarkingCompliancePct}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${data.attendanceMarkingCompliancePct}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-primary)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Teacher Roster Compliance Snapshot */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
              Teacher Compliance Roster
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.teacherComplianceRows.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  No teacher profiles found.
                </p>
              ) : (
                data.teacherComplianceRows.map((t) => {
                  const badgeStyle =
                    t.planStatus === 'Approved'
                      ? { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', label: 'Plan Approved' }
                      : t.planStatus === 'Submitted'
                      ? { bg: 'rgba(245, 158, 11, 0.15)', color: '#d97706', label: 'Needs Review' }
                      : t.planStatus === 'Returned'
                      ? { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', label: 'Returned' }
                      : { bg: 'rgba(148, 163, 184, 0.16)', color: '#64748b', label: 'No Plan Yet' }

                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {t.marksEnteredCount > 0 ? `${t.marksEnteredCount} marks` : '0 marks'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.18rem 0.55rem',
                            borderRadius: '999px',
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                          }}
                        >
                          {badgeStyle.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link href="/dashboard/dean/marks-overview" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              <PenLine size={14} /> Marks Overview
            </Link>
            <Link href="/dashboard/principal/report-cards" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              <FileSpreadsheet size={14} /> Report Cards
            </Link>
            <Link href="/dashboard/principal/early-years" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              <School size={14} /> Early Years Reports
            </Link>
          </div>
        </div>

        {/* SECTION 2: STUDENT POPULATION GROWTH & WING DISTRIBUTION */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <TrendingUp size={20} color="var(--color-secondary)" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                Student Population & Enrollment Growth
              </h2>
            </div>
            <Link
              href="/dashboard/students"
              style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Student Directory <ArrowRight size={14} />
            </Link>
          </div>

          {/* Growth Summary Mini-Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Learners
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                {data.totalStudents}
              </div>
            </div>
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Joined (Last 90d)
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                +{data.newStudents90d}
              </div>
            </div>
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Pending Admissions
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.2rem' }}>
                {data.pendingApplications}
              </div>
            </div>
          </div>

          {/* Academic Wing Split (Cambridge vs NECTA) */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem' }}>
              <span style={{ color: '#0284c7' }}>Cambridge Wing: {data.cambridgeTotal} ({cambridgePct}%)</span>
              <span style={{ color: '#d97706' }}>NECTA Wing: {data.nectaTotal} ({nectaPct}%)</span>
            </div>
            <div style={{ width: '100%', height: '10px', borderRadius: '999px', overflow: 'hidden', display: 'flex', backgroundColor: 'rgba(0,0,0,0.06)' }}>
              <div style={{ width: `${cambridgePct}%`, height: '100%', backgroundColor: '#0284c7' }} />
              <div style={{ width: `${nectaPct}%`, height: '100%', backgroundColor: '#f59e0b' }} />
            </div>
          </div>

          {/* Population by Grade / Class Level */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
              Enrollment Breakdown by Grade / Class
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {data.gradeDistribution.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  No active student records for this wing filter.
                </p>
              ) : (
                data.gradeDistribution.map((item) => {
                  const pct =
                    data.totalStudents > 0
                      ? Math.max(4, Math.round((item.count / data.totalStudents) * 100))
                      : 0
                  return (
                    <div key={item.grade} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.84rem' }}>
                      <div style={{ width: '130px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.grade}
                      </div>
                      <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-primary)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                      <div style={{ width: '65px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {item.count}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link href="/dashboard/principal/admissions" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              <GraduationCap size={14} /> Open Admissions Desk ({data.pendingApplications} Pending)
            </Link>
            <Link href="/dashboard/students/enroll" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              + Enroll Student
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Two-Column Grid: Fee Collection & School Events / Approvals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* SECTION 3: FEE COLLECTION & FINANCIAL OVERVIEW */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Wallet size={20} color="var(--color-success)" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                School Fee Collection Overview
              </h2>
            </div>
            <Link
              href="/dashboard/principal/collection-report"
              style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Daily Cashier Shift <ArrowRight size={14} />
            </Link>
          </div>

          {/* Collection Progress Bar */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Term Fee Recovery Progress
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)' }}>
                {data.collectionRatePct}% Collected
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${data.collectionRatePct}%`,
                  height: '100%',
                  backgroundColor: data.collectionRatePct >= 75 ? 'var(--color-success)' : data.collectionRatePct >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              <span>Paid Invoices: <strong>{data.paidInvoicesCount}</strong></span>
              <span>Partial: <strong>{data.partialInvoicesCount}</strong></span>
              <span>Unpaid: <strong style={{ color: 'var(--color-error)' }}>{data.unpaidInvoicesCount}</strong></span>
            </div>
          </div>

          {/* Financial Figures Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
            <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Fees Billed
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                {formatTZS(data.feesBilled)}
              </div>
            </div>

            <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Fees Collected
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
                {formatTZS(data.feesCollected)}
              </div>
            </div>

            <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Outstanding Balance
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-error)', marginTop: '0.25rem' }}>
                {formatTZS(data.feesOutstanding)}
              </div>
            </div>

            <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '0.72rem', color: '#059669', textTransform: 'uppercase', fontWeight: 700 }}>
                Collected Today ({data.todayTxCount} tx)
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
                {formatTZS(data.collectedToday)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link href="/dashboard/accountant/fee-balances" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              Fee Balances
            </Link>
            <Link href="/dashboard/accountant/invoices" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              Student Invoices
            </Link>
            <Link href="/dashboard/principal/quick-payment" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              <CreditCard size={14} /> Quick Payment
            </Link>
          </div>
        </div>

        {/* SECTION 4: SCHOOL EVENTS & ACTION REQUIRED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Upcoming School Events */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CalendarIcon size={20} color="var(--color-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                  Upcoming School Events
                </h2>
              </div>
              <Link
                href="/dashboard/calendar"
                style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                School Calendar <ArrowRight size={14} />
              </Link>
            </div>

            {(!data.upcomingEvents || data.upcomingEvents.length === 0) ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '1.25rem 0', margin: 0 }}>
                No upcoming school events scheduled.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data.upcomingEvents.slice(0, 5).map((event: any) => (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <Clock size={12} /> {formatDate(event.start_date)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(59, 179, 195, 0.12)',
                        color: 'var(--color-primary)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                      }}
                    >
                      {event.event_type || 'Event'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Principal Approvals & Administrative Queue */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <AlertCircle size={20} color="var(--color-error)" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                Approvals & Administrative Queue
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
                  <FileText size={16} color="var(--color-primary)" /> Lesson Plans Awaiting Review
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: data.pendingLessonPlans > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                    {data.pendingLessonPlans}
                  </span>
                  <Link href="/dashboard/principal/lesson-plans" style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    Review &rarr;
                  </Link>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
                  <Briefcase size={16} color="var(--color-warning)" /> Staff Leave Requests
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: data.pendingLeave > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                    {data.pendingLeave}
                  </span>
                  <Link href="/dashboard/principal/leave-requests" style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    Review &rarr;
                  </Link>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
                  <CreditCard size={16} color="var(--color-warning)" /> Salary Advance Endorsements
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: data.pendingAdvances > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                    {data.pendingAdvances}
                  </span>
                  <Link href="/dashboard/principal/advance-requests" style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    Review &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
