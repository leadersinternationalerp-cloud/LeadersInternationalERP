import { createClient } from '@/utils/supabase/server'
import { normalizeRoles } from '@/lib/auth/roles'
import { getExpectedSchoolDates } from '@/lib/attendance/tanzaniaHolidays'
import HOSAttendanceClient, { AbsenteeItem, ClassSummaryItem } from './HOSAttendanceClient'

const ALLOWED_ROLES = ['System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section']

export default async function HOSAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>Please log in to view attendance overview.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()

  const userRoles = normalizeRoles(profile)
  if (!userRoles.some(r => ALLOWED_ROLES.includes(r))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  const params = await searchParams
  const todayStr = new Date().toISOString().split('T')[0]
  const selectedDate = params.date && params.date <= todayStr ? params.date : todayStr
  const period: 'daily' | 'weekly' | 'monthly' =
    params.period === 'weekly' || params.period === 'monthly' ? params.period : 'daily'

  const endD = new Date(selectedDate + 'T00:00:00')
  const startD = new Date(endD)
  if (period === 'weekly') {
    startD.setDate(endD.getDate() - 6)
  } else if (period === 'monthly') {
    startD.setDate(endD.getDate() - 29)
  }
  const periodStart = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-${String(startD.getDate()).padStart(2, '0')}`
  const periodEnd = selectedDate

  const expectedSchoolDates = getExpectedSchoolDates(periodStart, periodEnd)

  const [{ data: classes }, { data: periodLogs }, { data: dayAbsentees }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, section')
      .order('name', { ascending: true }),
    supabase
      .from('attendance')
      .select('class_id, date, status')
      .gte('date', periodStart)
      .lte('date', periodEnd),
    supabase
      .from('attendance')
      .select(`
        id,
        student_id,
        class_id,
        status,
        reason,
        classes (name),
        students (
          student_id,
          profiles (first_name, last_name)
        )
      `)
      .eq('date', selectedDate)
      .in('status', ['Absent', 'Late', 'Excused']),
  ])

  const classList = classes || []
  const logs = periodLogs || []

  // Group logs by class_id
  const logsByClass = new Map<string, Array<{ date: string; status: string }>>()
  const markedDatesByClass = new Map<string, Set<string>>()

  for (const l of logs) {
    if (!l.class_id) continue
    if (!logsByClass.has(l.class_id)) logsByClass.set(l.class_id, [])
    logsByClass.get(l.class_id)!.push({ date: l.date, status: l.status })

    if (!markedDatesByClass.has(l.class_id)) markedDatesByClass.set(l.class_id, new Set())
    markedDatesByClass.get(l.class_id)!.add(l.date)
  }

  let classesMarkedOnDate = 0
  const classSummaries: ClassSummaryItem[] = classList.map((c: any) => {
    const clsLogs = logsByClass.get(c.id) || []
    const markedDates = markedDatesByClass.get(c.id) || new Set<string>()
    const markedToday = markedDates.has(selectedDate)
    if (markedToday) classesMarkedOnDate++

    let present = 0
    let absent = 0
    let late = 0
    let excused = 0

    for (const row of clsLogs) {
      if (row.status === 'Present') present++
      else if (row.status === 'Absent') absent++
      else if (row.status === 'Late') late++
      else if (row.status === 'Excused') excused++
    }

    const total = clsLogs.length
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
    const unmarkedDates = expectedSchoolDates.filter(d => !markedDates.has(d))

    return {
      class_id: c.id,
      class_name: c.name,
      section: c.section || '',
      present,
      absent,
      late,
      excused,
      total_records: total,
      attendance_rate_pct: rate,
      marked_today: markedToday,
      unmarked_dates: unmarkedDates,
    }
  })

  const absentees: AbsenteeItem[] = (dayAbsentees || []).map((row: any) => {
    const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes
    const stud = Array.isArray(row.students) ? row.students[0] : row.students
    const prof = stud ? (Array.isArray(stud.profiles) ? stud.profiles[0] : stud.profiles) : null
    const fullName = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Student'

    return {
      id: row.id,
      student_id: row.student_id,
      student_code: stud?.student_id || '',
      student_name: fullName || 'Student',
      class_id: row.class_id || '',
      class_name: cls?.name || 'Unknown Class',
      status: row.status,
      reason: row.reason || '',
    }
  })

  return (
    <HOSAttendanceClient
      selectedDate={selectedDate}
      period={period}
      periodStart={periodStart}
      periodEnd={periodEnd}
      expectedSchoolDaysCount={expectedSchoolDates.length}
      totalClasses={classList.length}
      classesMarkedOnDate={classesMarkedOnDate}
      absentees={absentees}
      classSummaries={classSummaries}
    />
  )
}
