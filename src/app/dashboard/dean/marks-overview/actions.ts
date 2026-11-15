'use server'

import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function flagAndUnlockMarkAction(markId: string, reason?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const userRoles = normalizeRoles(profile)

  const canModerate =
    userRoles.includes('Dean') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Director') ||
    userRoles.includes('System Admin') ||
    userRoles.includes('Head of Section')

  if (!canModerate) {
    return { success: false, error: 'Forbidden' }
  }

  const { data: mark } = await supabase
    .from('marks')
    .select(`
      id,
      graded_by,
      assessment_type,
      term,
      subjects ( name ),
      classes ( name, section ),
      students ( student_id, profiles ( first_name, last_name ) )
    `)
    .eq('id', markId)
    .maybeSingle()

  if (!mark) {
    return { success: false, error: 'Mark record not found.' }
  }

  const { error: updateErr } = await supabase
    .from('marks')
    .update({ is_locked: false, is_released: false })
    .eq('id', markId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Notify teacher if graded_by is recorded
  if (mark.graded_by) {
    const subj: any = Array.isArray(mark.subjects) ? mark.subjects[0] : mark.subjects
    const cls: any = Array.isArray(mark.classes) ? mark.classes[0] : mark.classes
    const stud: any = Array.isArray(mark.students) ? mark.students[0] : mark.students
    const prof: any = Array.isArray(stud?.profiles) ? stud.profiles[0] : stud?.profiles
    const studentName = prof
      ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
      : stud?.student_id || 'Student'

    await supabase.from('notifications').insert({
      user_id: mark.graded_by,
      title: 'Mark Flagged & Unlocked for Review',
      message: `Mark for ${studentName} in ${subj?.name || 'Subject'} (${cls?.name || 'Class'}, ${mark.assessment_type} - ${mark.term}) has been unlocked for review.${reason ? ` Note: ${reason}` : ''}`,
      is_read: false,
    })
  }

  revalidatePath('/dashboard/dean/marks-overview')
  revalidatePath('/dashboard/dean/marks')
  revalidatePath('/dashboard/teacher/marks')
  return { success: true }
}
