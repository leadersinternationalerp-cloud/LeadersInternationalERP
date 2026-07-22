import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeacherTimetableClient from './TeacherTimetableClient'

export default async function TeacherTimetablePage() {
  const supabase = await createClient()

  // Verify auth & role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  const isTeacher = userRoles.includes('Teacher') || userRoles.includes('System Admin')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  // Fetch slots (try to fallback using GET route pattern)
  // Let's get slots from ANY class since slots are class-based
  const { data: anySlots } = await supabase
    .from('timetable_slots')
    .select('*')
    .order('period_number', { ascending: true })
    .order('start_time', { ascending: true })
  
  let slots = []
  if (anySlots && anySlots.length > 0) {
    const firstClassId = anySlots[0].class_id
    slots = anySlots.filter(s => s.class_id === firstClassId)
  }

  // Fetch entries for this teacher
  const { data: entries } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      class_id,
      class_subject_id,
      day_of_week,
      slot_id,
      room,
      class_subjects (
        id,
        teacher_id,
        subject_id,
        profiles (first_name, last_name),
        subjects (name)
      ),
      classes (name, section)
    `)
    .eq('is_current', true)

  const teacherId = user.id
  const filteredEntries = (entries || []).filter(e => {
    const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
    return cs?.teacher_id === teacherId
  })

  return (
    <TeacherTimetableClient 
      slots={slots}
      entries={filteredEntries as any}
      teacherId={teacherId}
    />
  )
}
