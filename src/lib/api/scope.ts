import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'
import { type ApiUser } from '@/lib/auth/session'
import { MANAGEMENT_ROLES, hasAny } from '@/lib/auth/roles'
import { ApiError } from './errors'

export const teacherClassIds = cache(async (teacherId: string): Promise<string[]> => {
  const supabase = await createClient()
  const [subjectClasses, homeroomClasses] = await Promise.all([
    supabase.from('class_subjects').select('class_id').eq('teacher_id', teacherId),
    supabase.from('classes').select('id').eq('class_teacher_id', teacherId),
  ])

  const ids = new Set<string>()
  subjectClasses.data?.forEach((row: { class_id: string }) => {
    if (row.class_id) ids.add(row.class_id)
  })
  homeroomClasses.data?.forEach((row: { id: string }) => {
    if (row.id) ids.add(row.id)
  })

  return Array.from(ids)
})

export async function assertClassInScope(user: ApiUser, classId: string): Promise<void> {
  if (hasAny(user.roles, MANAGEMENT_ROLES)) {
    return
  }

  if (user.roles.includes('Teacher')) {
    const classIds = await teacherClassIds(user.id)
    if (classIds.includes(classId)) {
      return
    }
  }

  throw new ApiError('FORBIDDEN', 'You do not have access to this resource')
}

export async function assertStudentInScope(user: ApiUser, studentId: string): Promise<void> {
  if (hasAny(user.roles, MANAGEMENT_ROLES)) {
    return
  }

  const supabase = await createClient()

  if (user.roles.includes('Teacher')) {
    const classIds = await teacherClassIds(user.id)
    if (classIds.length > 0) {
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .in('class_id', classIds)
        .maybeSingle()

      if (data) return
    }
    throw new ApiError('NOT_FOUND', 'Student not found')
  }

  if (user.roles.includes('Parent')) {
    const { data } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('student_id', studentId)
      .maybeSingle()

    if (data) return
    throw new ApiError('NOT_FOUND', 'Student not found')
  }

  if (user.roles.includes('Student')) {
    if (user.id === studentId) return
    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('id', user.id)
      .maybeSingle()

    if (data) return
    throw new ApiError('NOT_FOUND', 'Student not found')
  }

  throw new ApiError('FORBIDDEN', 'You do not have access to this resource')
}

export async function assertParentOf(user: ApiUser, studentId: string): Promise<void> {
  if (hasAny(user.roles, MANAGEMENT_ROLES)) {
    return
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('student_parents')
    .select('student_id')
    .eq('parent_id', user.id)
    .eq('student_id', studentId)
    .maybeSingle()

  if (!data) {
    throw new ApiError('NOT_FOUND', 'Student not found')
  }
}
