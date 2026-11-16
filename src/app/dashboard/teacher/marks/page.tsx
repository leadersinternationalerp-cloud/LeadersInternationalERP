import { getSessionUser } from '@/lib/auth/session'
import {
  getCachedAssessmentWeights,
  getCachedGradingScale,
  getCachedTerms,
} from '@/lib/cache/referenceData'
import Link from 'next/link'
import { getWingContext } from '@/lib/wingServer'
import { matchesWingFilter } from '@/lib/wing'
import MarksForm from './MarksForm'
import MarksFilters, { AssessmentTypeOption, TermOptionItem } from './MarksFilters'
import AssessmentPaperBanner from './AssessmentPaperBanner'
import { parseGradingLevels } from '@/utils/grading'
import { saveMarksAction } from './actions'

interface AllocationRecord {
  class_id: string
  subject_id: string
  classes:
    | { id: string; name: string; section?: string }
    | { id: string; name: string; section?: string }[]
    | null
  subjects: { id: string; name: string } | { id: string; name: string }[] | null
}

interface StudentRecord {
  id: string
  student_id: string
  grade_level: string
  profiles: {
    first_name: string
    last_name: string
  }
}

interface MarkRecord {
  student_id: string
  score: number
  raw_score?: number | null
  out_of?: number | null
  remarks: string
  grading_scale?: string
  is_locked?: boolean
  is_released?: boolean
}

export default async function TeacherMarksPage({
  searchParams,
}: {
  searchParams: Promise<{
    class_id?: string
    class?: string
    subject_id?: string
    subject?: string
    assessment_type?: string
    term?: string
  }>
}) {
  const { user, profile, roles: userRoles, supabase } = await getSessionUser()
  const wingContext = await getWingContext(user?.id, profile)
  const lockedWing = wingContext.assignedWing !== 'Both' ? wingContext.assignedWing : null

  const isGlobalStaff =
    userRoles.includes('System Admin') ||
    userRoles.includes('Director') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Dean') ||
    userRoles.includes('Head of Section')

  if (!userRoles.includes('Teacher') && !isGlobalStaff) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  let allocations: AllocationRecord[] = []
  if (isGlobalStaff) {
    const { data: allAllocations } = await supabase.from('class_subjects').select(`
        class_id,
        subject_id,
        classes (id, name, section),
        subjects (id, name)
      `)
    allocations = (allAllocations as unknown as AllocationRecord[]) || []
  } else {
    const { data: teacherAllocations } = await supabase
      .from('class_subjects')
      .select(`
        class_id,
        subject_id,
        classes (id, name, section),
        subjects (id, name)
      `)
      .eq('teacher_id', user?.id)
    allocations = (teacherAllocations as unknown as AllocationRecord[]) || []
  }

  // Enforce symmetric wing isolation if user is assigned to a specific wing
  if (lockedWing) {
    allocations = allocations.filter((alloc) => {
      const cls = Array.isArray(alloc.classes) ? alloc.classes[0] : alloc.classes
      return cls ? matchesWingFilter(cls, lockedWing) : false
    })
  }

  // Derive class options from allocations
  const classMap = new Map<string, { id: string; name: string; section?: string }>()
  allocations.forEach((alloc) => {
    const cls = Array.isArray(alloc.classes) ? alloc.classes[0] : alloc.classes
    if (cls) {
      classMap.set(cls.id, { id: cls.id, name: cls.name, section: cls.section })
    }
  })
  const classes = Array.from(classMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  // Fetch configured Assessment Types, Terms, and Grading Scale via shared cache
  const [dbWeights, dbTerms, cachedGradingValue] = await Promise.all([
    getCachedAssessmentWeights(),
    getCachedTerms(),
    getCachedGradingScale(),
  ])

  let assessmentOptions: AssessmentTypeOption[] = []
  if (dbWeights && dbWeights.length > 0) {
    // Include active manual assessment types (exclude online-only QUIZZES unless no other types exist)
    const manualActive = dbWeights.filter(
      (w: any) =>
        w.is_active !== false &&
        String(w.assessment_type || '').toUpperCase() !== 'QUIZZES'
    )
    const sourceList = manualActive.length > 0 ? manualActive : dbWeights
    assessmentOptions = sourceList.map((w: any) => ({
      name: w.assessment_type,
      weight: Number(w.weight || 0),
      is_active: w.is_active,
    }))
  }

  if (assessmentOptions.length === 0) {
    assessmentOptions = [
      { name: 'Test 1', weight: 20, is_active: true },
      { name: 'Test 2', weight: 20, is_active: true },
      { name: 'Mid-Term', weight: 20, is_active: true },
      { name: 'Terminal', weight: 40, is_active: true },
    ]
  }

  const termOptionsMap = new Map<string, TermOptionItem>()
  ;(dbTerms || []).forEach((t: any) => {
    const tName = t.term_name || t.name
    if (tName && !termOptionsMap.has(tName)) {
      termOptionsMap.set(tName, {
        name: tName,
        academic_year: t.academic_year,
        is_current: Boolean(t.is_current),
      })
    }
  })
  if (termOptionsMap.size === 0) {
    termOptionsMap.set('Term 1', { name: 'Term 1', is_current: true })
    termOptionsMap.set('Term 2', { name: 'Term 2' })
    termOptionsMap.set('Term 3', { name: 'Term 3' })
  }
  const termOptions = Array.from(termOptionsMap.values())
  const defaultTerm =
    termOptions.find((t) => t.is_current)?.name || termOptions[0]?.name || 'Term 1'

  // Normalize query parameters
  const params = await searchParams
  const rawClassId = params.class_id || params.class
  const rawSubjectId = params.subject_id || params.subject

  const selectedClassId = rawClassId || (classes.length > 0 ? classes[0].id : '')

  // Derive subject options based on the selected class
  const classSubjects = allocations
    .filter((alloc) => alloc.class_id === selectedClassId)
    .map((alloc) => {
      const subj = Array.isArray(alloc.subjects) ? alloc.subjects[0] : alloc.subjects
      return subj ? { id: subj.id, name: subj.name } : null
    })
    .filter(Boolean) as { id: string; name: string }[]

  const subjectMap = new Map<string, { id: string; name: string }>()
  classSubjects.forEach((s) => subjectMap.set(s.id, s))
  const subjects = Array.from(subjectMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const selectedSubjectId =
    rawSubjectId || (subjects.length > 0 ? subjects[0].id : '')
  const selectedAssessmentType =
    params.assessment_type || assessmentOptions[0]?.name || 'Test 1'
  const selectedTerm = params.term || defaultTerm

  // Ensure selectedAssessmentType & selectedTerm appear in dropdown options even if passed via URL
  if (!assessmentOptions.some((a) => a.name === selectedAssessmentType)) {
    assessmentOptions.push({ name: selectedAssessmentType })
  }
  if (!termOptions.some((t) => t.name === selectedTerm)) {
    termOptions.push({ name: selectedTerm })
  }

  // Safety assignment check for non-admin requests
  if (!isGlobalStaff && selectedClassId && selectedSubjectId) {
    const isAssigned = allocations.some(
      (alloc) =>
        alloc.class_id === selectedClassId && alloc.subject_id === selectedSubjectId
    )
    if (!isAssigned) {
      return (
        <div
          className="glass-panel"
          style={{ padding: '2rem', textAlign: 'center' }}
        >
          <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            You are not assigned to this class and subject combination.
          </p>
        </div>
      )
    }
  }

  const gradingLevels = parseGradingLevels(cachedGradingValue)

  // Fetch students in selected class
  let classStudents: StudentRecord[] = []
  let existingMarks: MarkRecord[] = []

  if (selectedClassId) {
    const [{ data: students }, { data: marksLogs }] = await Promise.all([
      supabase
        .from('students')
        .select(`
          id,
          student_id,
          grade_level,
          profiles (first_name, last_name)
        `)
        .eq('class_id', selectedClassId),
      supabase
        .from('marks')
        .select('student_id, score, raw_score, out_of, remarks, grading_scale, is_locked, is_released')
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .eq('assessment_type', selectedAssessmentType)
        .eq('term', selectedTerm),
    ])

    const rawStudents = ((students as unknown as any[]) || []).map((s) => {
      const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      return {
        id: s.id,
        student_id: s.student_id || '',
        grade_level: s.grade_level || '',
        profiles: {
          first_name: prof?.first_name || '',
          last_name: prof?.last_name || '',
        },
      }
    })

    classStudents = rawStudents.sort((a, b) => {
      const nameA = `${a.profiles.first_name} ${a.profiles.last_name}`.trim()
      const nameB = `${b.profiles.first_name} ${b.profiles.last_name}`.trim()
      return nameA.localeCompare(nameB)
    })

    existingMarks = (marksLogs as unknown as MarkRecord[]) || []
  }

  const cleanAllocations = allocations.map((alloc) => {
    const subj = Array.isArray(alloc.subjects) ? alloc.subjects[0] : alloc.subjects
    return {
      class_id: alloc.class_id,
      subject_id: alloc.subject_id,
      subject_name: subj?.name || 'Unknown',
    }
  })

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Enter Class Marks &amp; Grading
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/teacher/ca-tests"
            className="btn btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.85rem' }}
          >
            📝 Create &amp; Grade C.A. Tests
          </Link>
          {isGlobalStaff && (
            <>
              <Link
                href="/dashboard/admin/settings/grading"
                className="btn btn-secondary"
                style={{ textDecoration: 'none', fontSize: '0.85rem' }}
              >
                ⚙️ Grading Scale
              </Link>
              <Link
                href="/dashboard/admin/settings/assessment-weights"
                className="btn btn-secondary"
                style={{ textDecoration: 'none', fontSize: '0.85rem' }}
              >
                ⚖️ Assessment Weights
              </Link>
            </>
          )}
          <Link
            href="/dashboard/teacher"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.85rem' }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <MarksFilters
        classes={classes}
        allocations={cleanAllocations}
        selectedClassId={selectedClassId}
        selectedSubjectId={selectedSubjectId}
        selectedAssessmentType={selectedAssessmentType}
        selectedTerm={selectedTerm}
        assessmentTypes={assessmentOptions}
        terms={termOptions}
        initialWingFilter={wingContext.activeWingFilter}
        lockedWing={lockedWing}
      />

      {classStudents.length > 0 ? (
        <>
          {selectedClassId && selectedSubjectId && selectedAssessmentType && selectedTerm && (
            <AssessmentPaperBanner
              classId={selectedClassId}
              subjectId={selectedSubjectId}
              assessmentType={selectedAssessmentType}
              term={selectedTerm}
            />
          )}
          <MarksForm
            key={`${selectedClassId}_${selectedSubjectId}_${selectedAssessmentType}_${selectedTerm}`}
          students={classStudents}
          existingMarks={existingMarks}
          isLocked={existingMarks.some((m) => m.is_locked === true)}
          isReleased={existingMarks.some((m) => m.is_released === true)}
          canUnlock={isGlobalStaff}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          assessmentType={selectedAssessmentType}
          term={selectedTerm}
          gradingLevels={gradingLevels}
          saveAction={saveMarksAction}
        />
        </>
      ) : (
        <div
          className="glass-panel"
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          No student records found matching this class level/section.
        </div>
      )}
    </div>
  )
}
