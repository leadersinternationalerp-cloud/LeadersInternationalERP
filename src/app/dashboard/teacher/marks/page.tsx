import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import MarksForm from './MarksForm'
import MarksFilters from './MarksFilters'
import { parseGradingLevels } from '@/utils/grading'

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
  async function handleSaveMarks(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const classId = formData.get('classId') as string
    const subjectId = formData.get('subjectId') as string
    const assessmentType = formData.get('assessmentType') as string
    const term = formData.get('term') as string
    const mode = formData.get('mode') as 'draft' | 'publish'
    const shouldPublish = mode === 'publish'
    console.log('[ANTIGRAVITY-MARKS] handleSaveMarks called', { classId, subjectId, assessmentType, term, mode, scoreCount: Array.from(formData.keys()).filter(k => k.startsWith('score_')).length });

    if (!classId || !subjectId) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Verify user is allowed to edit selected class-subject allocation
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .single()
    const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

    const isAdminUser = userRoles.includes('System Admin') || userRoles.includes('Director')

    if (!isAdminUser) {
      const { data: allocation } = await supabase
        .from('class_subjects')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .maybeSingle()

      if (!allocation) {
        throw new Error('Unauthorized: You are not assigned to this class-subject combination.')
      }
    }

    // Fetch existing marks to check lock status and preserve is_released status
    const { data: existingMarks } = await supabase
      .from('marks')
      .select('student_id, is_locked, is_released')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('assessment_type', assessmentType)
      .eq('term', term)

    const isAlreadyReadOnly = existingMarks?.some(m => m.is_locked === true || m.is_released === true)
    if (isAlreadyReadOnly && !isAdminUser) {
      throw new Error('Forbidden: Marks are already submitted/locked or published and cannot be modified.')
    }

    interface MarkUpdate {
      id?: string
      student_id: string
      class_id: string
      subject_id: string
      assessment_type: string
      term: string
      academic_year: string
      score: number
      remarks: string
      grading_scale: string
      graded_by?: string
      is_locked: boolean
      is_released: boolean
    }

    const updates: MarkUpdate[] = []

    formData.forEach((value, key) => {
      if (key.startsWith('score_')) {
        const studentId = key.replace('score_', '')
        const score = parseFloat(value as string)
        const remarks = formData.get(`remarks_${studentId}`) as string
        const gradingScale = formData.get(`grade_${studentId}`) as string

        if (!isNaN(score)) {
          updates.push({
            student_id: studentId,
            class_id: classId,
            subject_id: subjectId,
            assessment_type: assessmentType,
            term,
            academic_year: '2025-2026',
            score,
            remarks: remarks || '',
            grading_scale: gradingScale || 'Standard',
            graded_by: user?.id,
            is_locked: false,
            is_released: false
          })
        }
      }
    })

    const errors: string[] = []
    let savedCount = 0

    // Upsert records
    for (const update of updates) {
      const { data: existing } = await supabase
        .from('marks')
        .select('id, is_released')
        .eq('student_id', update.student_id)
        .eq('class_id', update.class_id)
        .eq('subject_id', update.subject_id)
        .eq('assessment_type', update.assessment_type)
        .eq('term', update.term)
        .maybeSingle()

      if (existing) {
        update.id = existing.id
      }

      update.is_locked = shouldPublish
      update.is_released = shouldPublish ? true : (existing?.is_released ?? false)

      const { error } = await supabase
        .from('marks')
        .upsert(update, {
          onConflict: 'student_id,class_id,subject_id,assessment_type,term',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`[ANTIGRAVITY-MARKS] Upsert FAILED for student_id=${update.student_id}:`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        errors.push(`${update.student_id}: ${error.message}`);
      } else {
        savedCount++;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to save ${errors.length} mark(s):\n${errors.join('\n')}`)
    }

    revalidatePath('/dashboard/teacher/marks')
  }

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
