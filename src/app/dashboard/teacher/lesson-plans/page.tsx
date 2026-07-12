import { redirect } from 'next/navigation'

export default function TeacherLessonPlansRootPage() {
  redirect('/dashboard/teacher/lesson-plans/new')
}
