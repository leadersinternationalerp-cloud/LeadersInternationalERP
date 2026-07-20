import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import TeacherAssignmentsClient from './TeacherAssignmentsClient'

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient()

  const { data: teachers } = await supabase.from('profiles').select('id, first_name, last_name').eq('role', 'Teacher').order('first_name', { ascending: true })
  const { data: classes } = await supabase.from('classes').select('*').order('name', { ascending: true })
  const { data: subjects } = await supabase.from('subjects').select('*').order('name', { ascending: true })

  const { data: allocations, error: allocError } = await supabase
    .from('class_subjects')
    .select(`
      id,
      teacher_id,
      class_id,
      subject_id,
      created_at,
      profiles(first_name, last_name),
      classes(name, section, is_early_years),
      subjects(name)
    `)
    .order('created_at', { ascending: false })

  async function assignTeacherAction(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const teacher_id = formData.get('teacher_id') as string
    const class_id = formData.get('class_id') as string
    const subject_id = formData.get('subject_id') as string

    if (!teacher_id || !class_id) return

    // Fetch class to verify if it is Early Years
    const { data: cls } = await supabase
      .from('classes')
      .select('id, name, is_early_years')
      .eq('id', class_id)
      .maybeSingle()

    const isEarlyYears = cls?.is_early_years || 
      ['baby', 'nursery', 'reception', 'kg', 'playgroup', 'pre-primary'].some(ey => (cls?.name || '').toLowerCase().includes(ey))

    const isHomeroom = isEarlyYears || subject_id === 'HOMEROOM'

    if (isHomeroom) {
      // 1. Assign Homeroom Class Teacher on classes table
      await supabase
        .from('classes')
        .update({ class_teacher_id: teacher_id })
        .eq('id', class_id)

      // 2. Insert into class_subjects with subject_id null
      await supabase
        .from('class_subjects')
        .insert({
          teacher_id,
          class_id,
          subject_id: null
        })
    } else {
      if (!subject_id) return
      // Regular Primary class subject allocation
      await supabase
        .from('class_subjects')
        .insert({
          teacher_id,
          class_id,
          subject_id
        })
    }

    revalidatePath('/dashboard/admin/teacher-assignments')
    revalidatePath('/dashboard/teacher/early-years')
    revalidatePath('/api/report-cards/download')
  }

  async function removeAllocationAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('allocation_id') as string
    
    if (id) {
      // Fetch allocation info before deleting
      const { data: alloc } = await supabase
        .from('class_subjects')
        .select('class_id, subject_id, classes(is_early_years, class_teacher_id)')
        .eq('id', id)
        .maybeSingle()

      await supabase.from('class_subjects').delete().eq('id', id)

      // Clear class_teacher_id if this was a homeroom allocation (subject_id is null)
      if (alloc?.class_id && alloc.subject_id === null) {
        const { count } = await supabase
          .from('class_subjects')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', alloc.class_id)
          .is('subject_id', null)

        if (count === 0) {
          await supabase
            .from('classes')
            .update({ class_teacher_id: null })
            .eq('id', alloc.class_id)
        }
      }

      revalidatePath('/dashboard/admin/teacher-assignments')
      revalidatePath('/dashboard/teacher/early-years')
      revalidatePath('/api/report-cards/download')
    }
  }

  return (
    <TeacherAssignmentsClient
      teachers={teachers || []}
      classes={classes || []}
      subjects={subjects || []}
      allocations={(allocations || []) as any}
      allocError={allocError}
      assignTeacherAction={assignTeacherAction}
      removeAllocationAction={removeAllocationAction}
    />
  )
}
