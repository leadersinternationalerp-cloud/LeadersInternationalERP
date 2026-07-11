import { createClient } from '@/utils/supabase/server'
import { LessonPlanForm } from './LessonPlanForm'

export default async function NewLessonPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch classes assigned to this teacher
  const { data: classSubjects } = await supabase
    .from('class_subjects')
    .select(`
      id,
      class_id,
      subject_id,
      classes (id, name),
      subjects (id, name)
    `)
    .eq('teacher_id', user?.id)

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Submit Lesson Plan</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Upload your weekly lesson plan for review by your Head of Section or Dean.
      </p>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
        <LessonPlanForm classSubjects={classSubjects || []} teacherId={user?.id || ''} />
      </div>
    </div>
  )
}
