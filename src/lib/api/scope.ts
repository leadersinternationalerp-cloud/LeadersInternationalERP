import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'
import { type ApiUser } from '@/lib/auth/session'
import { MANAGEMENT_ROLES, hasAny } from '@/lib/auth/roles'
import { inferWing, isCrossWingRole, matchesWingFilter } from '@/lib/wing'
import { ApiError } from './errors'

export const teacherClassIds = cache(async (teacherId: string): Promise<string[]> => {
  const supabase = await createClient()
  const [subjectClasses, homeroomClasses, teacherProfile] = await Promise.all([
    supabase.from('class_subjects').select('class_id, classes:class_id(*)').eq('teacher_id', teacherId),
    supabase.from('classes').select('*').eq('class_teacher_id', teacherId),
    supabase.from('profiles').select('*').eq('id', teacherId).maybeSingle(),
  ])

  let wingRestriction: 'Cambridge' | 'NECTA' | 'Both' = 'Both'
  if (teacherProfile.data) {
    const rawWing = (teacherProfile.data.wing || '').toLowerCase()
    if (rawWing === 'cambridge') wingRestriction = 'Cambridge'
    else if (rawWing === 'necta') wingRestriction = 'NECTA'
    else if (Array.isArray(teacherProfile.data.roles)) {
      if (teacherProfile.data.roles.some((r: string) => r.toLowerCase() === 'wing:cambridge')) {
        wingRestriction = 'Cambridge'
      } else if (teacherProfile.data.roles.some((r: string) => r.toLowerCase() === 'wing:necta')) {
        wingRestriction = 'NECTA'
      }
    }
  }

  const ids = new Set<string>()
  subjectClasses.data?.forEach((row: any) => {
    const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes
    if (row.class_id && matchesWingFilter(cls, wingRestriction)) {
      ids.add(row.class_id)
    }
  })
  homeroomClasses.data?.forEach((row: any) => {
    if (row.id && matchesWingFilter(row, wingRestriction)) {
      ids.add(row.id)
    }
  })

  return Array.from(ids)
})

export async function assertClassInScope(user: ApiUser, classId: string): Promise<void> {
  const supabase = await createClient()

  // Enforce wing boundary for wing-restricted users (e.g. Cambridge Dean/HOS/Teacher/Learner)
  if (!isCrossWingRole(user.roles) && (user.wing === 'Cambridge' || user.wing === 'NECTA')) {
    const { data: cls } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle()

    if (cls && inferWing(cls) !== user.wing) {
      throw new ApiError('FORBIDDEN', `Access restricted to ${user.wing} Wing classes only`)
    }
  }

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
  const supabase = await createClient()

  // Enforce wing boundary for wing-restricted users
  if (!isCrossWingRole(user.roles) && (user.wing === 'Cambridge' || user.wing === 'NECTA')) {
    const { data: targetStudent } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle()

    if (targetStudent && inferWing(targetStudent) !== user.wing) {
      throw new ApiError('FORBIDDEN', `Access restricted to ${user.wing} Wing learners only`)
    }
  }

  if (hasAny(user.roles, MANAGEMENT_ROLES) || user.roles.includes('Receptionist')) {
    return
  }

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
