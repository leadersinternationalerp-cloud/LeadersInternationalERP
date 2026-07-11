import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import MarksForm from './MarksForm'

export default async function TeacherMarksPage({
  searchParams
}: {
  searchParams: Promise<{ class_id?: string; subject_id?: string; assessment_type?: string; term?: string }>
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

  // Fetch classes and subjects for filter dropdowns
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true })

  const params = await searchParams
  const selectedClassId = params.class_id || (classes && classes.length > 0 ? classes[0].id : '')
  const selectedSubjectId = params.subject_id || (subjects && subjects.length > 0 ? subjects[0].id : '')
  const selectedAssessmentType = params.assessment_type || 'Test 1'
  const selectedTerm = params.term || 'Term 1'

  // Fetch students in selected class
  let classStudents: any[] = []
  let isLocked = false
  let existingMarks: any[] = []

  if (selectedClassId) {
    const selectedClass = classes?.find(c => c.id === selectedClassId)
    if (selectedClass) {
      const { data: students } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          grade_level,
          section,
          profiles:id (first_name, last_name)
        `)
        .eq('grade_level', selectedClass.name)
        .eq('section', selectedClass.section)

      classStudents = students || []

      // Fetch existing marks
      const { data: marksLogs } = await supabase
        .from('marks')
        .select('*')
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .eq('assessment_type', selectedAssessmentType)
        .eq('term', selectedTerm)

      existingMarks = marksLogs || []
      isLocked = existingMarks.some(m => m.is_locked === true)
    }
  }

  // Server Action to save marks
  async function handleSaveMarks(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const classId = formData.get('classId') as string
    const subjectId = formData.get('subjectId') as string
    const assessmentType = formData.get('assessmentType') as string
    const term = formData.get('term') as string
    const lock = formData.get('lock') === 'true'

    if (!classId || !subjectId) return

    const { data: { user } } = await supabase.auth.getUser()

    const updates: any[] = []

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
            is_locked: lock,
            is_released: false // default false until officially released by HOS/Dean
          })
        }
      }
    })

    // Upsert records
    for (const update of updates) {
      // Find matching existing mark ID to update, or let upsert match
      const { data: existing } = await supabase
        .from('marks')
        .select('id')
        .eq('student_id', update.student_id)
        .eq('class_id', update.class_id)
        .eq('subject_id', update.subject_id)
        .eq('assessment_type', update.assessment_type)
        .eq('term', update.term)
        .single()

      if (existing) {
        update.id = existing.id
      }

      const { error } = await supabase
        .from('marks')
        .upsert(update)

      if (error) {
        console.error('Error saving mark record:', error.message)
      }
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

      {/* Filter Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <form method="GET" action="/dashboard/teacher/marks" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Class</label>
            <select name="class_id" defaultValue={selectedClassId} className="input-field" required>
              {classes?.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <select name="subject_id" defaultValue={selectedSubjectId} className="input-field" required>
              {subjects?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assessment</label>
            <select name="assessment_type" defaultValue={selectedAssessmentType} className="input-field" required>
              <option value="Test 1">Test 1</option>
              <option value="Test 2">Test 2</option>
              <option value="Mid-Term">Mid-Term</option>
              <option value="Terminal">Terminal</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Term</label>
            <select name="term" defaultValue={selectedTerm} className="input-field" required>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem' }}>
            Load Marks Form
          </button>
        </form>
      </div>

      {/* Marks Form */}
      {classStudents.length > 0 ? (
        <MarksForm
          students={classStudents}
          existingMarks={existingMarks}
          isLocked={isLocked}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          assessmentType={selectedAssessmentType}
          term={selectedTerm}
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
