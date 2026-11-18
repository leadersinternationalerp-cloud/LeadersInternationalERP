import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { fetchErpTeachers } from '@/lib/timetableContext'
import TimetableClient from './TimetableClient'

export default async function TimetablePage() {
  const supabase = await createClient()

  // Verify authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
  const userRoles = normalizeRoles(prof)

  const isAdmin = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section'].includes(r))
  if (!isAdmin) {
    redirect('/dashboard')
  }

  // Fetch classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  // Fetch teachers uniformly from User Management (single & multi-role)
  const teachers = await fetchErpTeachers(supabase)

  // Fetch allocations (class_subjects table)
  const { data: allocations } = await supabase
    .from('class_subjects')
    .select(`
      id,
      class_id,
      teacher_id,
      subject_id,
      periods_per_week,
      periods_per_card,
      group_id,
      allowed_classroom_ids,
      joint_class_ids,
      co_teacher_ids,
      color,
      profiles (first_name, last_name),
      subjects (name)
    `)
    .order('created_at', { ascending: false })

  return (
    <TimetableClient 
      classes={classes || []}
      teachers={teachers || []}
      allocations={(allocations || []) as unknown as React.ComponentProps<typeof TimetableClient>['allocations']}
    />
  )
}
