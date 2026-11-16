'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { normalizeRoles } from '@/lib/auth/roles'
import { getCachedGradingScale, getCachedTerms } from '@/lib/cache/referenceData'
import { formatGradingScaleMeta, getGradeForPercentage, parseGradingLevels } from '@/utils/grading'

const ALLOWED_ROLES = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher']

async function recomputeSubjectCAAverageToMarks(
  supabase: any,
  classId: string,
  subjectId: string,
  term: string,
  gradedBy: string,
  isReleased: boolean
) {
  const { data: tests } = await supabase
    .from('ca_assessments')
    .select('id')
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .eq('term', term)

  const testIds = (tests || []).map((t: any) => t.id)
  if (testIds.length === 0) return

  const { data: allScores } = await supabase
    .from('ca_assessment_scores')
    .select('student_id, percentage')
    .in('assessment_id', testIds)

  if (!allScores || allScores.length === 0) return

  const byStudent = new Map<string, number[]>()
  for (const row of allScores) {
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, [])
    byStudent.get(row.student_id)!.push(Number(row.percentage || 0))
  }

  const [cachedScale, dbTerms] = await Promise.all([
    getCachedGradingScale(),
    getCachedTerms(),
  ])
  const gradingLevels = parseGradingLevels(cachedScale)
  const matchingTerm = (dbTerms || []).find(
    (t: any) => (t.term_name || t.name) === term
  )
  const academicYear = matchingTerm?.academic_year || '2026-2027'

  for (const [studentId, pcts] of byStudent.entries()) {
    const avgPct = Math.round((pcts.reduce((s, v) => s + v, 0) / pcts.length) * 100) / 100
    const grade = getGradeForPercentage(avgPct, gradingLevels)
    const gradingScale = formatGradingScaleMeta(100, avgPct, grade)

    await supabase.from('marks').upsert(
      {
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId,
        assessment_type: 'CA',
        term,
        academic_year: academicYear,
        score: avgPct,
        raw_score: avgPct,
        out_of: 100,
        remarks: `Average of ${pcts.length} C.A. Test(s)`,
        grading_scale: gradingScale,
        graded_by: gradedBy,
        is_released: isReleased,
      },
      { onConflict: 'student_id,class_id,subject_id,assessment_type,term' }
    )
  }
}

export async function createCATestAction(input: {
  class_id: string
  subject_id: string
  term: string
  title: string
  assessment_date: string
  max_mark: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const roles = normalizeRoles(profile)
  if (!roles.some(r => ALLOWED_ROLES.includes(r))) {
    return { error: 'Forbidden: You do not have permission to create C.A. tests.' }
  }

  const title = input.title.trim()
  if (!title) return { error: 'Test title is required.' }
  if (!input.class_id || !input.subject_id || !input.term) {
    return { error: 'Class, subject, and term are required.' }
  }
  const maxMark = Number(input.max_mark)
  if (isNaN(maxMark) || maxMark <= 0) {
    return { error: 'Max mark must be greater than 0.' }
  }

  const { data, error } = await supabase
    .from('ca_assessments')
    .insert({
      class_id: input.class_id,
      subject_id: input.subject_id,
      term: input.term,
      title,
      assessment_date: input.assessment_date || new Date().toISOString().split('T')[0],
      max_mark: maxMark,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/teacher/ca-tests')
  return { success: true, assessment: data }
}

export async function saveCATestScoresAction(input: {
  assessment_id: string
  lock: boolean
  entries: Array<{ student_id: string; raw_score: string; remarks: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: assessment, error: fetchErr } = await supabase
    .from('ca_assessments')
    .select('*')
    .eq('id', input.assessment_id)
    .single()

  if (fetchErr || !assessment) {
    return { error: 'C.A. test not found.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const roles = normalizeRoles(profile)
  const isLeadership = roles.some(r =>
    ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS'].includes(r)
  )

  if (assessment.is_locked && !isLeadership) {
    return { error: 'This C.A. test is locked. Contact leadership to unlock it.' }
  }

  const maxMark = Number(assessment.max_mark || 100)
  const validRows: any[] = []

  for (const entry of input.entries) {
    const trimmed = String(entry.raw_score ?? '').trim()
    if (trimmed === '') continue
    const raw = parseFloat(trimmed)
    if (isNaN(raw) || raw < 0 || raw > maxMark) {
      return { error: `Invalid score "${trimmed}" (must be between 0 and ${maxMark}).` }
    }
    const pct = Math.round(((raw / maxMark) * 100) * 100) / 100
    validRows.push({
      assessment_id: assessment.id,
      student_id: entry.student_id,
      raw_score: raw,
      percentage: pct,
      remarks: (entry.remarks || '').trim(),
      graded_by: user.id,
      updated_at: new Date().toISOString(),
    })
  }

  if (validRows.length === 0) {
    return { error: 'Please enter at least one valid score before saving.' }
  }

  const { error: upsertErr } = await supabase
    .from('ca_assessment_scores')
    .upsert(validRows, { onConflict: 'assessment_id,student_id' })

  if (upsertErr) {
    return { error: upsertErr.message }
  }

  if (input.lock) {
    await supabase
      .from('ca_assessments')
      .update({ is_locked: true, updated_at: new Date().toISOString() })
      .eq('id', assessment.id)
  }

  await recomputeSubjectCAAverageToMarks(
    supabase,
    assessment.class_id,
    assessment.subject_id,
    assessment.term,
    user.id,
    input.lock
  )

  revalidatePath('/dashboard/teacher/ca-tests')
  revalidatePath('/dashboard/teacher/marks')
  return { success: true, savedCount: validRows.length }
}

export async function deleteCATestAction(assessmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: assessment } = await supabase
    .from('ca_assessments')
    .select('*')
    .eq('id', assessmentId)
    .single()

  if (!assessment) return { error: 'C.A. test not found.' }
  if (assessment.is_locked) {
    return { error: 'Cannot delete a locked C.A. test.' }
  }

  const { error } = await supabase
    .from('ca_assessments')
    .delete()
    .eq('id', assessmentId)

  if (error) return { error: error.message }

  await recomputeSubjectCAAverageToMarks(
    supabase,
    assessment.class_id,
    assessment.subject_id,
    assessment.term,
    user.id,
    false
  )

  revalidatePath('/dashboard/teacher/ca-tests')
  return { success: true }
}
