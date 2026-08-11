import { createClient } from '@/utils/supabase/server'
import { LessonPlanForm } from './LessonPlanForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewLessonPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch classes & subjects assigned to this teacher
  const { data: classSubjects } = await supabase
    .from('class_subjects')
    .select(`
      id,
      class_id,
      subject_id,
      classes (id, name, section),
      subjects (id, name)
    `)
    .eq('teacher_id', user?.id)

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/teacher/lesson-plans" style={{ textDecoration: 'none', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Lesson Plans</span>
        </Link>
      </div>

      <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
        Submit Weekly Lesson Plan
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Upload your weekly lesson plan document for review and feedback by your Head of Section, Academic Dean, or Principal.
      </p>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
        <LessonPlanForm classSubjects={classSubjects || []} teacherId={user?.id || ''} />
      </div>
    </div>
  )
}
