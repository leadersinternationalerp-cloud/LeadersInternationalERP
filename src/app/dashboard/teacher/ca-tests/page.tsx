import Link from 'next/link'
import { getSessionUser } from '@/lib/auth/session'
import { getCachedTerms } from '@/lib/cache/referenceData'
import { getWingContext } from '@/lib/wingServer'
import { matchesWingFilter } from '@/lib/wing'
import CATestsClient, { CAScoreRow, CATestItem, StudentRow } from './CATestsClient'

const GLOBAL_ROLES = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS']

export default async function TeacherCATestsPage({
  searchParams,
}: {
  searchParams: Promise<{ class_id?: string; subject_id?: string; term?: string }>
}) {
  const { supabase, user, profile, roles: userRoles } = await getSessionUser()
  const isGlobalStaff = userRoles.some(r => GLOBAL_ROLES.includes(r))

  if (!userRoles.includes('Teacher') && !isGlobalStaff) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to manage C.A. tests.</p>
      </div>
    )
  }

  const wingContext = await getWingContext(user?.id, profile)
  const lockedWing = wingContext.assignedWing !== 'Both' ? wingContext.assignedWing : null

  let allocations: any[] = []
  if (isGlobalStaff) {
    const { data } = await supabase
      .from('class_subjects')
      .select('class_id, subject_id, classes (id, name, section), subjects (id, name)')
    allocations = data || []
  } else {
    const { data } = await supabase
      .from('class_subjects')
      .select('class_id, subject_id, classes (id, name, section), subjects (id, name)')
      .eq('teacher_id', user?.id)
    allocations = data || []
  }

  if (lockedWing) {
    allocations = allocations.filter(a => {
      const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes
      return cls ? matchesWingFilter(cls, lockedWing) : false
    })
  }

  const classMap = new Map<string, { id: string; name: string; section?: string }>()
  allocations.forEach(a => {
    const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes
    if (cls) classMap.set(cls.id, { id: cls.id, name: cls.name, section: cls.section })
  })
  const classes = Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const cleanAllocations = allocations.map(a => {
    const subj = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects
    return {
      class_id: a.class_id,
      subject_id: a.subject_id,
      subject_name: subj?.name || 'Subject',
    }
  })

  const dbTerms = await getCachedTerms()
  const termNames = Array.from(
    new Set((dbTerms || []).map((t: any) => t.term_name || t.name).filter(Boolean))
  ) as string[]
  if (termNames.length === 0) termNames.push('Term 1', 'Term 2', 'Term 3')

  const currentTerm = (dbTerms || []).find((t: any) => t.is_current)
  const defaultTerm = currentTerm?.term_name || currentTerm?.name || termNames[0]

  const params = await searchParams
  const selectedClassId = params.class_id || classes[0]?.id || ''
  const subjectsForClass = cleanAllocations.filter(a => a.class_id === selectedClassId)
  const selectedSubjectId = params.subject_id || subjectsForClass[0]?.subject_id || ''
  const selectedTerm = params.term || defaultTerm

  let tests: CATestItem[] = []
  let students: StudentRow[] = []
  let scores: CAScoreRow[] = []

  if (selectedClassId && selectedSubjectId && selectedTerm) {
    const [{ data: rawTests }, { data: rawStudents }] = await Promise.all([
      supabase
        .from('ca_assessments')
        .select('*')
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .eq('term', selectedTerm)
        .order('assessment_date', { ascending: false }),
      supabase
        .from('students')
        .select('id, student_id, profiles (first_name, last_name)')
        .eq('class_id', selectedClassId),
    ])

    students = (rawStudents || [])
      .map((s: any) => {
        const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        return {
          id: s.id,
          student_id: s.student_id || '',
          first_name: prof?.first_name || '',
          last_name: prof?.last_name || '',
        }
      })
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))

    const testIds = (rawTests || []).map((t: any) => t.id)
    if (testIds.length > 0) {
      const { data: rawScores } = await supabase
        .from('ca_assessment_scores')
        .select('assessment_id, student_id, raw_score, percentage, remarks')
        .in('assessment_id', testIds)
      scores = (rawScores || []) as CAScoreRow[]
    }

    tests = (rawTests || []).map((t: any) => ({
      id: t.id,
      class_id: t.class_id,
      subject_id: t.subject_id,
      term: t.term,
      title: t.title,
      assessment_date: t.assessment_date,
      max_mark: Number(t.max_mark),
      is_locked: Boolean(t.is_locked),
      scored_count: scores.filter(sc => sc.assessment_id === t.id).length,
    }))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Teacher C.A. Tests &amp; Unit Assessments
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            Create custom C.A. tests, grade students out of any max mark, and automatically roll up averages into the C.A. grade.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/dashboard/teacher/marks" className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Back to Marks Entry
          </Link>
        </div>
      </div>

      <CATestsClient
        classes={classes}
        allocations={cleanAllocations}
        terms={termNames}
        selectedClassId={selectedClassId}
        selectedSubjectId={selectedSubjectId}
        selectedTerm={selectedTerm}
        tests={tests}
        students={students}
        scores={scores}
        canUnlock={isGlobalStaff}
      />
    </div>
  )
}
