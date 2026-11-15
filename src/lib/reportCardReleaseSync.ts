import type { SupabaseClient } from '@supabase/supabase-js'

export interface SyncReleaseParams {
  classId: string
  termId?: string
  termName?: string
  release: boolean
  publishedBy?: string
  includedAssessments?: string[]
  showRank?: boolean
}

export async function syncClassReportCardRelease(
  supabase: SupabaseClient,
  params: SyncReleaseParams
) {
  const {
    classId,
    termId,
    termName,
    release,
    publishedBy,
    includedAssessments,
    showRank = false,
  } = params

  // 1. Resolve term row
  let termRow: any = null
  if (termId) {
    const { data } = await supabase
      .from('terms')
      .select('*')
      .eq('id', termId)
      .maybeSingle()
    termRow = data
  }
  if (!termRow && termName) {
    const { data } = await supabase
      .from('terms')
      .select('*')
      .or(`name.eq.${termName},term_name.eq.${termName}`)
      .limit(1)
      .maybeSingle()
    termRow = data
  }

  const resolvedTermName =
    termName || termRow?.term_name || termRow?.name || 'Term 1'
  const resolvedTermId = termId || termRow?.id || null
  const academicYear = termRow?.academic_year || '2026-2027'

  // 2. Update marks release & lock status for this class + term
  const markUpdatePayload = release
    ? { is_released: true, is_locked: true }
    : { is_released: false }

  await supabase
    .from('marks')
    .update(markUpdatePayload)
    .eq('class_id', classId)
    .eq('term', resolvedTermName)

  if (!resolvedTermId) {
    return { success: true, resolvedTermName }
  }

  // 3. Record release audit in report_card_releases
  const { data: existingRelease } = await supabase
    .from('report_card_releases')
    .select('id')
    .eq('class_id', classId)
    .eq('term_id', resolvedTermId)
    .limit(1)
    .maybeSingle()

  const releasePayload: Record<string, any> = {
    class_id: classId,
    term_id: resolvedTermId,
    is_published: release,
    published_at: new Date().toISOString(),
    published_by: publishedBy || null,
  }

  if (existingRelease?.id) {
    await supabase
      .from('report_card_releases')
      .update(releasePayload)
      .eq('id', existingRelease.id)
  } else {
    await supabase.from('report_card_releases').insert(releasePayload)
  }

  // 4. Sync report_cards rows for all students in this class
  const { data: classInfo } = await supabase
    .from('classes')
    .select('id, name, section')
    .eq('id', classId)
    .maybeSingle()

  const { data: students } = await supabase
    .from('students')
    .select('id, grade_level')
    .eq('class_id', classId)

  if (students && students.length > 0) {
    const assessmentsQuery =
      includedAssessments && includedAssessments.length > 0
        ? `&assessments=${encodeURIComponent(includedAssessments.join(','))}`
        : ''

    for (const s of students) {
      const pdfUrl = `/api/report-cards/download?student_id=${s.id}&term_id=${resolvedTermId}&show_rank=${showRank}${assessmentsQuery}&download=true`

      const { data: existingCard } = await supabase
        .from('report_cards')
        .select('id')
        .eq('student_id', s.id)
        .eq('term_id', resolvedTermId)
        .limit(1)
        .maybeSingle()

      const extendedCardPayload: Record<string, any> = {
        student_id: s.id,
        term_id: resolvedTermId,
        class_id: classId,
        term: resolvedTermName,
        academic_year: academicYear,
        grade_level: s.grade_level || classInfo?.name || 'Grade 1',
        pdf_url: pdfUrl,
        is_published: release,
        status: release ? 'RELEASED' : 'DRAFT',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const coreCardPayload: Record<string, any> = {
        student_id: s.id,
        term_id: resolvedTermId,
        academic_year: academicYear,
        grade_level: s.grade_level || classInfo?.name || 'Grade 1',
        pdf_url: pdfUrl,
        is_published: release,
        updated_at: new Date().toISOString(),
      }

      if (existingCard?.id) {
        const { error: extErr } = await supabase
          .from('report_cards')
          .update(extendedCardPayload)
          .eq('id', existingCard.id)
        if (extErr) {
          await supabase
            .from('report_cards')
            .update(coreCardPayload)
            .eq('id', existingCard.id)
        }
      } else {
        const { error: extErr } = await supabase
          .from('report_cards')
          .insert(extendedCardPayload)
        if (extErr) {
          await supabase.from('report_cards').insert(coreCardPayload)
        }
      }
    }
  }

  return { success: true, resolvedTermName, resolvedTermId }
}
