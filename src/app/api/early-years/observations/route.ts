import { createClient } from '@/utils/supabase/server'
import { route, ok, parseJson } from '@/lib/api/handler'
import { MANAGEMENT_ROLES, hasAny } from '@/lib/auth/roles'
import { assertStudentInScope, teacherClassIds } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get('student_id')
    const term_id = searchParams.get('term_id')
    const class_id = searchParams.get('class_id')

    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage')) || 50))
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const supabase = await createClient()

    if (student_id) {
      await assertStudentInScope(user, student_id)
    }

    let query = supabase.from('learning_area_progress').select(
      `
        id,
        student_id,
        term_id,
        class_id,
        learning_area,
        achievement_level,
        teacher_observation,
        next_steps,
        age_band,
        characteristics,
        evidence_url,
        is_final,
        created_at
      `,
      { count: 'exact' }
    )

    if (student_id) {
      query = query.eq('student_id', student_id)
    } else if (user.roles.includes('Student')) {
      query = query.eq('student_id', user.id)
    } else if (user.roles.includes('Parent')) {
      const { data: parentLinks } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', user.id)
      const childIds = (parentLinks || []).map((l: { student_id: string }) => l.student_id)
      query = query.in('student_id', childIds.length > 0 ? childIds : ['00000000-0000-0000-0000-000000000000'])
    } else if (user.roles.includes('Teacher') && !hasAny(user.roles, MANAGEMENT_ROLES)) {
      const classIds = await teacherClassIds(user.id)
      query = query.in('class_id', classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000'])
    }

    if (term_id) {
      query = query.eq('term_id', term_id)
    }
    if (class_id) {
      query = query.eq('class_id', class_id)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApiError('INTERNAL', 'Failed to fetch observations')
    }

    return ok(data || [], {
      requestId,
      total: count || 0,
      page,
      perPage,
    })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher', 'Student', 'Parent'] }
)

export const POST = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const body = await parseJson<{
      id?: string
      student_id?: string
      term_id?: string
      class_id?: string
      learning_area?: string
      achievement_level?: string
      teacher_observation?: string
      next_steps?: string
      age_band?: string
      characteristics?: unknown[]
      evidence_url?: string | null
      is_final?: boolean
    }>(req)

    const {
      id,
      student_id,
      term_id,
      class_id,
      learning_area,
      achievement_level,
      teacher_observation,
      next_steps,
      age_band,
      characteristics,
      evidence_url,
      is_final,
    } = body

    if (!student_id || !term_id || !learning_area || !achievement_level || !teacher_observation) {
      throw badRequest({ fields: 'Missing required parameters' })
    }

    await assertStudentInScope(user, student_id)

    if (id) {
      const { error: updateErr } = await supabase
        .from('learning_area_progress')
        .update({
          class_id: class_id || null,
          learning_area,
          achievement_level,
          teacher_observation,
          next_steps: next_steps || '',
          age_band: age_band || '',
          characteristics: characteristics || [],
          evidence_url: evidence_url || null,
          is_final: Boolean(is_final),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw new ApiError('INTERNAL', 'Failed to update observation')
      return ok({ success: true }, { requestId })
    }

    if (is_final) {
      const { data: existing } = await supabase
        .from('learning_area_progress')
        .select('id')
        .eq('student_id', student_id)
        .eq('term_id', term_id)
        .eq('learning_area', learning_area)
        .eq('is_final', true)
        .maybeSingle()

      if (existing) {
        const { error: updateErr } = await supabase
          .from('learning_area_progress')
          .update({
            class_id: class_id || null,
            achievement_level,
            teacher_observation,
            next_steps: next_steps || '',
            age_band: age_band || '',
            characteristics: characteristics || [],
            evidence_url: evidence_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updateErr) throw new ApiError('INTERNAL', 'Failed to update final observation')
      } else {
        const { error: insertErr } = await supabase.from('learning_area_progress').insert({
          student_id,
          term_id,
          class_id: class_id || null,
          learning_area,
          achievement_level,
          teacher_observation,
          next_steps: next_steps || '',
          age_band: age_band || '',
          characteristics: characteristics || [],
          evidence_url: evidence_url || null,
          is_final: true,
        })

        if (insertErr) throw new ApiError('INTERNAL', 'Failed to create final observation')
      }
    } else {
      const { error: insertErr } = await supabase.from('learning_area_progress').insert({
        student_id,
        term_id,
        class_id: class_id || null,
        learning_area,
        achievement_level,
        teacher_observation,
        next_steps: next_steps || '',
        age_band: age_band || '',
        characteristics: characteristics || [],
        evidence_url: evidence_url || null,
        is_final: false,
      })

      if (insertErr) throw new ApiError('INTERNAL', 'Failed to create draft observation')
    }

    return ok({ success: true }, { requestId }, 201)
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)

export const DELETE = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) throw badRequest({ id: 'Missing observation id' })

    const supabase = await createClient()

    const { data: obs, error: fetchErr } = await supabase
      .from('learning_area_progress')
      .select('student_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !obs) {
      throw new ApiError('NOT_FOUND', 'Observation not found')
    }

    await assertStudentInScope(user, obs.student_id)

    const { error } = await supabase.from('learning_area_progress').delete().eq('id', id)
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to delete observation')
    }

    return ok({ success: true }, { requestId })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)
