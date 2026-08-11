import { createClient } from '@/utils/supabase/server'
import TeacherLessonPlansClient, { LessonPlanItem } from './TeacherLessonPlansClient'

export default async function TeacherLessonPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Authentication Required</h2>
      </div>
    )
  }

  // Fetch lesson plans for this teacher
  const { data: lessonPlans, error } = await supabase
    .from('lesson_plans')
    .select(`
      *,
      classes ( id, name, section ),
      subjects ( id, name ),
      reviewer:reviewer_id ( id, first_name, last_name, role )
    `)
    .eq('teacher_id', user.id)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching teacher lesson plans:', error)
  }

  return (
    <TeacherLessonPlansClient plans={(lessonPlans as unknown as LessonPlanItem[]) || []} />
  )
}
