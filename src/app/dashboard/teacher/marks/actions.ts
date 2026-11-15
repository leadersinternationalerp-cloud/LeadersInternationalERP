'use server'

import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  parseGradingLevels,
  getGradeForPercentage,
  formatGradingScaleMeta,
} from '@/utils/grading'

export async function saveMarksAction(formData: FormData) {
  const supabase = await createClient()
  const classId = (formData.get('classId') as string)?.trim()
  const subjectId = (formData.get('subjectId') as string)?.trim()
  const assessmentType = (formData.get('assessmentType') as string)?.trim()
  const term = (formData.get('term') as string)?.trim()
  const mode = (formData.get('mode') as 'draft' | 'publish') || 'draft'
  const outOfRaw = parseFloat((formData.get('outOf') as string) || '100')
  const outOfVal = Number.isFinite(outOfRaw) && outOfRaw > 0 ? outOfRaw : 100
  const shouldPublish = mode === 'publish'

  if (!classId || !subjectId) {
    return { success: false, error: 'Missing class or subject selection.' }
  }

  if (!assessmentType) {
    return { success: false, error: 'Missing assessment type.' }
  }

  if (!term) {
    return { success: false, error: 'Missing academic term.' }
  }

  try {
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

    const isAdminUser =
      userRoles.includes('System Admin') ||
      userRoles.includes('Director') ||
      userRoles.includes('Principal') ||
      userRoles.includes('Dean') ||
      userRoles.includes('Head of Section')

    if (!isAdminUser) {
      const { data: allocation } = await supabase
        .from('class_subjects')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .maybeSingle()

      if (!allocation) {
        return {
          success: false,
          error: 'Unauthorized: You are not assigned to this class and subject combination.',
        }
      }
    }

    // Fetch existing marks to check lock status and preserve is_released status
    const { data: existingMarks } = await supabase
      .from('marks')
      .select('id, student_id, is_locked, is_released')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('assessment_type', assessmentType)
      .eq('term', term)

    const isAlreadyReadOnly = existingMarks?.some(
      (m) => m.is_locked === true || m.is_released === true
    )
    if (isAlreadyReadOnly && !isAdminUser) {
      return {
        success: false,
        error:
          'Forbidden: Marks are already submitted/locked or published and cannot be modified unless unlocked by the Dean or Principal.',
      }
    }

    // Resolve academic_year from terms table if available
    const { data: termRow } = await supabase
      .from('terms')
      .select('academic_year, name, term_name, is_current')
      .or(`name.eq.${term},term_name.eq.${term}`)
      .limit(1)
      .maybeSingle()

    const academicYear = termRow?.academic_year || '2026-2027'

    // Load grading scale for accurate grade metadata
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grading_scale')
      .maybeSingle()
    const gradingLevels = parseGradingLevels(settingData?.value)

    interface MarkUpdate {
      id?: string
      student_id: string
      class_id: string
      subject_id: string
      assessment_type: string
      term: string
      academic_year: string
      score: number
      raw_score?: number
      out_of?: number
      remarks: string
      grading_scale: string
      graded_by?: string
      is_locked: boolean
      is_released: boolean
    }

    const existingByStudent = new Map<
      string,
      { id: string; is_locked?: boolean; is_released?: boolean }
    >()
    ;(existingMarks || []).forEach((m: any) => {
      existingByStudent.set(m.student_id, m)
    })

    const updates: MarkUpdate[] = []

    formData.forEach((value, key) => {
      if (key.startsWith('score_')) {
        const studentId = key.replace('score_', '')
        const rawStr = String(value ?? '').trim()
        if (rawStr === '') return

        const rawScore = parseFloat(rawStr)
        const remarksVal = ((formData.get(`remarks_${studentId}`) as string) || '').trim()

        if (!isNaN(rawScore) && rawScore >= 0 && rawScore <= outOfVal) {
          const percentage =
            outOfVal > 0 ? Math.round(((rawScore / outOfVal) * 100) * 100) / 100 : 0
          const grade = getGradeForPercentage(percentage, gradingLevels)
          const gradingScale = formatGradingScaleMeta(outOfVal, rawScore, grade)
          const existing = existingByStudent.get(studentId)

          const payload: MarkUpdate = {
            student_id: studentId,
            class_id: classId,
            subject_id: subjectId,
            assessment_type: assessmentType,
            term,
            academic_year: academicYear,
            score: percentage,
            raw_score: rawScore,
            out_of: outOfVal,
            remarks: remarksVal,
            grading_scale: gradingScale,
            graded_by: user.id,
            is_locked: shouldPublish,
            is_released: shouldPublish ? true : (existing?.is_released ?? false),
          }

          if (existing?.id) {
            payload.id = existing.id
          }

          updates.push(payload)
        }
      }
    })

    if (updates.length === 0) {
      return {
        success: false,
        error: 'Please enter at least one valid student score before saving.',
      }
    }

    const errors: string[] = []
    let savedCount = 0

    for (const update of updates) {
      let { error } = await supabase.from('marks').upsert(update, {
        onConflict: 'student_id,class_id,subject_id,assessment_type,term',
        ignoreDuplicates: false,
      })

      // Fallback if raw_score / out_of columns have not yet been migrated on remote DB
      if (
        error &&
        (error.message?.includes('raw_score') ||
          error.message?.includes('out_of') ||
          error.code === 'PGRST204')
      ) {
        const { raw_score: _r, out_of: _o, ...fallbackUpdate } = update
        const retry = await supabase.from('marks').upsert(fallbackUpdate, {
          onConflict: 'student_id,class_id,subject_id,assessment_type,term',
          ignoreDuplicates: false,
        })
        error = retry.error
      }

      if (error) {
        errors.push(`${update.student_id}: ${error.message}`)
      } else {
        savedCount++
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Failed to save ${errors.length} mark(s):\n${errors.join('\n')}`,
      }
    }

    revalidatePath('/dashboard/teacher/marks')
    revalidatePath('/dashboard/dean/marks')
    revalidatePath('/dashboard/dean/marks-overview')
    revalidatePath('/dashboard/hos/marks')
    revalidatePath('/dashboard/student/results')
    revalidatePath('/dashboard/parent/academic-reports')
    return { success: true, savedCount }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}

export async function unlockMarksAction(formData: FormData) {
  const supabase = await createClient()
  const classId = (formData.get('classId') as string)?.trim()
  const subjectId = (formData.get('subjectId') as string)?.trim()
  const assessmentType = (formData.get('assessmentType') as string)?.trim()
  const term = (formData.get('term') as string)?.trim()

  if (!classId || !subjectId || !assessmentType || !term) {
    return { success: false, error: 'Missing required parameters to unlock marks.' }
  }

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

  const canUnlock =
    userRoles.includes('System Admin') ||
    userRoles.includes('Director') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Dean') ||
    userRoles.includes('Head of Section')

  if (!canUnlock) {
    return {
      success: false,
      error: 'Only Management (Dean, Principal, Director, HOS, or Admin) can unlock submitted marks.',
    }
  }

  const { error } = await supabase
    .from('marks')
    .update({ is_locked: false, is_released: false })
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .eq('assessment_type', assessmentType)
    .eq('term', term)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/teacher/marks')
  revalidatePath('/dashboard/dean/marks')
  revalidatePath('/dashboard/dean/marks-overview')
  return { success: true }
}

export async function getRandomGradeCommentAction(subjectId: string, grade: string) {
  const supabase = await createClient()

  if (!subjectId || !grade) {
    return { success: false, error: 'Missing subjectId or grade' }
  }

  try {
    const { data, error } = await supabase
      .from('subject_grade_comments')
      .select('comment')
      .eq('subject_id', subjectId)
      .eq('grade', grade)
      .limit(100)

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      // Fallback to constructive_grade_comments or principal_grade_comments if subject doesn't have custom rows
      const { data: fallbackData } = await supabase
        .from('principal_grade_comments')
        .select('comment')
        .eq('grade', grade)
        .limit(50)

      if (fallbackData && fallbackData.length > 0) {
        const randomIndex = Math.floor(Math.random() * fallbackData.length)
        return { success: true, comment: fallbackData[randomIndex].comment }
      }

      return { success: true, comment: null }
    }

    const randomIndex = Math.floor(Math.random() * data.length)
    const selectedComment = data[randomIndex].comment

    return { success: true, comment: selectedComment }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}

export async function getBatchGradeCommentsAction(
  subjectId: string,
  items: { studentId: string; grade: string }[]
) {
  const supabase = await createClient()
  if (!subjectId || !items || items.length === 0) {
    return { success: false, comments: {} as Record<string, string> }
  }

  try {
    const { data } = await supabase
      .from('subject_grade_comments')
      .select('grade, comment')
      .eq('subject_id', subjectId)
      .limit(500)

    const poolByGrade = new Map<string, string[]>()
    ;(data || []).forEach((row: { grade: string; comment: string }) => {
      const list = poolByGrade.get(row.grade) || []
      list.push(row.comment)
      poolByGrade.set(row.grade, list)
    })

    // Also load fallback comments from principal_grade_comments if subject pool is empty
    if (poolByGrade.size === 0) {
      const { data: fallback } = await supabase
        .from('principal_grade_comments')
        .select('grade, comment')
        .limit(300)
      ;(fallback || []).forEach((row: { grade: string; comment: string }) => {
        const list = poolByGrade.get(row.grade) || []
        list.push(row.comment)
        poolByGrade.set(row.grade, list)
      })
    }

    const result: Record<string, string> = {}
    items.forEach(({ studentId, grade }) => {
      const candidates = poolByGrade.get(grade) || []
      if (candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length)
        result[studentId] = candidates[idx]
      }
    })

    return { success: true, comments: result }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg, comments: {} as Record<string, string> }
  }
}
