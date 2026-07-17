import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import MarksForm from './MarksForm'
import MarksFilters from './MarksFilters'
import { parseGradingLevels } from '@/utils/grading'
import { saveMarksAction } from './actions'

interface AllocationRecord {
  class_id: string
  subject_id: string
  classes: { id: string; name: string; section?: string } | { id: string; name: string; section?: string }[] | null
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
  remarks: string
  grading_scale?: string
  is_locked?: boolean
  is_released?: boolean
}

export default async function TeacherMarksPage({
  searchParams
}: {
  searchParams: Promise<{ class_id?: string; class?: string; subject_id?: string; subject?: string; assessment_type?: string; term?: string }>
}) {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Teacher') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Determine if admin
  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')

  let allocations: AllocationRecord[] = []
  if (isAdmin) {
    // Admins can see all allocations
    const { data: allAllocations } = await supabase
      .from('class_subjects')
      .select(`
        class_id,
        subject_id,
        classes (id, name, section),
        subjects (id, name)
      `)
    allocations = (allAllocations as unknown as AllocationRecord[]) || []
  } else {
    // Teachers only see their assigned class-subject combinations
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

  // Derive class options from allocations
  const classMap = new Map<string, { id: string; name: string; section?: string }>()
  allocations.forEach(alloc => {
    const cls = Array.isArray(alloc.classes) ? alloc.classes[0] : alloc.classes
    if (cls) {
      classMap.set(cls.id, { id: cls.id, name: cls.name, section: cls.section })
    }
  })
  const classes = Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  // Normalize query parameters
  const params = await searchParams
  const rawClassId = params.class_id || params.class
  const rawSubjectId = params.subject_id || params.subject

  const selectedClassId = rawClassId || (classes.length > 0 ? classes[0].id : '')

  // Derive subject options based on the selected class
  const classSubjects = allocations
    .filter(alloc => alloc.class_id === selectedClassId)
    .map(alloc => {
      const subj = Array.isArray(alloc.subjects) ? alloc.subjects[0] : alloc.subjects
      return subj ? { id: subj.id, name: subj.name } : null
    })
    .filter(Boolean) as { id: string; name: string }[]

  // Deduplicate subjects
  const subjectMap = new Map<string, { id: string; name: string }>()
  classSubjects.forEach(s => subjectMap.set(s.id, s))
  const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const selectedSubjectId = rawSubjectId || (subjects.length > 0 ? subjects[0].id : '')
  const selectedAssessmentType = params.assessment_type || 'Test 1'
  const selectedTerm = params.term || 'Term 1'

  // Safety assignment check for non-admin requests
  if (!isAdmin && selectedClassId && selectedSubjectId) {
    const isAssigned = allocations.some(alloc => alloc.class_id === selectedClassId && alloc.subject_id === selectedSubjectId)
    if (!isAssigned) {
      return (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>You are not assigned to this class and subject combination.</p>
        </div>
      )
    }
  }

  // Fetch system settings for grading scale
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'grading_scale')
    .maybeSingle()

  const gradingLevels = parseGradingLevels(settingData?.value)

  // Fetch students in selected class
  let classStudents: StudentRecord[] = []
  let existingMarks: MarkRecord[] = []

  if (selectedClassId) {
    const { data: students } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        grade_level,
        profiles (first_name, last_name)
      `)
      .eq('class_id', selectedClassId)

    classStudents = (students as unknown as StudentRecord[]) || []

    // Fetch existing marks
    const { data: marksLogs } = await supabase
      .from('marks')
      .select('*')
      .eq('class_id', selectedClassId)
      .eq('subject_id', selectedSubjectId)
      .eq('assessment_type', selectedAssessmentType)
      .eq('term', selectedTerm)

    existingMarks = (marksLogs as unknown as MarkRecord[]) || []
  }

  const cleanAllocations = allocations.map(alloc => {
    const subj = Array.isArray(alloc.subjects) ? alloc.subjects[0] : alloc.subjects
    return {
      class_id: alloc.class_id,
      subject_id: alloc.subject_id,
      subject_name: subj?.name || 'Unknown'
    }
  })

  // Server Action to save marks
  const handleSaveMarks = saveMarksAction

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Enter Class Marks & Grading
        </h1>
        <Link href="/dashboard/teacher" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <MarksFilters
        classes={classes}
        allocations={cleanAllocations}
        selectedClassId={selectedClassId}
        selectedSubjectId={selectedSubjectId}
        selectedAssessmentType={selectedAssessmentType}
        selectedTerm={selectedTerm}
      />

      {/* Marks Form */}
      {classStudents.length > 0 ? (
        <MarksForm
          key={`${selectedClassId}_${selectedSubjectId}_${selectedAssessmentType}_${selectedTerm}`}
          students={classStudents}
          existingMarks={existingMarks}
          isLocked={existingMarks.some(m => m.is_locked === true)}
          isReleased={existingMarks.some(m => m.is_released === true)}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          assessmentType={selectedAssessmentType}
          term={selectedTerm}
          gradingLevels={gradingLevels}
          saveAction={handleSaveMarks}
        />
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
          No student records found matching this class level/section.
        </div>
      )}
    </div>
  )
}
