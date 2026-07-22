import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TimetableClient from './TimetableClient'

export default async function TimetablePage() {
  const supabase = await createClient()

  // Verify authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  const isAdmin = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Dean', 'HOS'].includes(r))
  if (!isAdmin) {
    redirect('/dashboard')
  }

  // Fetch classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  // Fetch teachers
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'Teacher')
    .order('first_name', { ascending: true })

  // Fetch allocations (class_subjects table)
  const { data: allocations } = await supabase
    .from('class_subjects')
    .select(`
      id,
      class_id,
      teacher_id,
      subject_id,
      profiles (first_name, last_name),
      subjects (name)
    `)
    .order('created_at', { ascending: false })

  return (
    <TimetableClient 
      classes={classes || []}
      teachers={teachers || []}
      allocations={(allocations || []) as any}
    />
  )
}
