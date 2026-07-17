'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveMarksAction(formData: FormData) {
  const supabase = await createClient()
  const classId = formData.get('classId') as string
  const subjectId = formData.get('subjectId') as string
  const assessmentType = formData.get('assessmentType') as string
  const ALLOWED_ASSESSMENT_TYPES = ['Test 1', 'Test 2', 'Mid-Term', 'Terminal', 'CA'] as const;

  if (!ALLOWED_ASSESSMENT_TYPES.includes(assessmentType as typeof ALLOWED_ASSESSMENT_TYPES[number])) {
    return {
      success: false,
      error: `Invalid assessment_type: "${assessmentType}". Allowed values: ${ALLOWED_ASSESSMENT_TYPES.join(', ')}`
    };
  }

  console.log('[ANTIGRAVITY-MARKS] assessment_type accepted:', assessmentType);
  const term = formData.get('term') as string
  const mode = formData.get('mode') as 'draft' | 'publish'
  const shouldPublish = mode === 'publish'

  console.log('[ANTIGRAVITY-MARKS] ACTION STARTED', { classId, subjectId, assessmentType, term, mode, scoreCount: Array.from(formData.keys()).filter(k => k.startsWith('score_')).length })

  if (!classId || !subjectId) {
    return { success: false, error: 'Missing classId or subjectId' }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify user is allowed to edit selected class-subject allocation
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .single()
    const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

    const isAdminUser = userRoles.includes('System Admin') || userRoles.includes('Director')

    if (!isAdminUser) {
      const { data: allocation } = await supabase
        .from('class_subjects')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .maybeSingle()

      if (!allocation) {
        return { success: false, error: 'Unauthorized: You are not assigned to this class-subject combination.' }
      }
    }

    // Fetch existing marks to check lock status and preserve is_released status
    const { data: existingMarks } = await supabase
      .from('marks')
      .select('student_id, is_locked, is_released')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('assessment_type', assessmentType)
      .eq('term', term)

    const isAlreadyReadOnly = existingMarks?.some(m => m.is_locked === true || m.is_released === true)
    if (isAlreadyReadOnly && !isAdminUser) {
      return { success: false, error: 'Forbidden: Marks are already submitted/locked or published and cannot be modified.' }
    }

    interface MarkUpdate {
      id?: string
      student_id: string
      class_id: string
      subject_id: string
      assessment_type: string
      term: string
      academic_year: string
      score: number
      remarks: string
      grading_scale: string
      graded_by?: string
      is_locked: boolean
      is_released: boolean
    }

    const updates: MarkUpdate[] = []

    formData.forEach((value, key) => {
      if (key.startsWith('score_')) {
        const studentId = key.replace('score_', '')
        const score = parseFloat(value as string)
        const remarksVal = formData.get(`remarks_${studentId}`) as string
        const gradingScale = formData.get(`grade_${studentId}`) as string

        if (!isNaN(score)) {
          console.log(`[ANTIGRAVITY-COMMENTS] Preparing mark update for student_id=${studentId}: remarks="${remarksVal || ''}"`)
          updates.push({
            student_id: studentId,
            class_id: classId,
            subject_id: subjectId,
            assessment_type: assessmentType,
            term,
            academic_year: '2025-2026',
            score,
            remarks: remarksVal || '',
            grading_scale: gradingScale || 'Standard',
            graded_by: user?.id,
            is_locked: false,
            is_released: false
          })
        }
      }
    })

    const errors: string[] = []
    let savedCount = 0

    // Upsert records
    for (const update of updates) {
      const { data: existing } = await supabase
        .from('marks')
        .select('id, is_released')
        .eq('student_id', update.student_id)
        .eq('class_id', update.class_id)
        .eq('subject_id', update.subject_id)
        .eq('assessment_type', update.assessment_type)
        .eq('term', update.term)
        .maybeSingle()

      if (existing) {
        update.id = existing.id
      }

      update.is_locked = shouldPublish
      update.is_released = shouldPublish ? true : (existing?.is_released ?? false)

      console.log('[ANTIGRAVITY-MARKS] upserting with assessment_type =', update.assessment_type);
      const { error } = await supabase
        .from('marks')
        .upsert(update, {
          onConflict: 'student_id,class_id,subject_id,assessment_type,term',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`[ANTIGRAVITY-MARKS] Upsert FAILED for student_id=${update.student_id}:`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        errors.push(`${update.student_id}: ${error.message}`)
      } else {
        savedCount++
      }
    }

    if (errors.length > 0) {
      return { success: false, error: `Failed to save ${errors.length} mark(s):\n${errors.join('\n')}` }
    }

    console.log('[ANTIGRAVITY-MARKS] SUCCESSFULLY SAVED', savedCount, 'records')
    revalidatePath('/dashboard/teacher/marks')
    return { success: true, savedCount }
  } catch (err) {
    console.error('[ANTIGRAVITY-MARKS] Action caught error:', err)
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}

export async function getRandomGradeCommentAction(subjectId: string, grade: string) {
  const supabase = await createClient()
  console.log('[ANTIGRAVITY-GRADING] getRandomGradeCommentAction called with:', { subjectId, grade })

  if (!subjectId || !grade) {
    console.error('[ANTIGRAVITY-GRADING] Missing subjectId or grade')
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
      console.error('[ANTIGRAVITY-GRADING] Error fetching comments:', error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      console.warn('[ANTIGRAVITY-GRADING] No comments found for:', { subjectId, grade })
      return { success: true, comment: null }
    }

    const randomIndex = Math.floor(Math.random() * data.length)
    const selectedComment = data[randomIndex].comment

    console.log('[ANTIGRAVITY-GRADING] Successfully returned random comment for grade:', grade, 'comment:', selectedComment)
    return { success: true, comment: selectedComment }
  } catch (err) {
    console.error('[ANTIGRAVITY-GRADING] Action caught error:', err)
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}
