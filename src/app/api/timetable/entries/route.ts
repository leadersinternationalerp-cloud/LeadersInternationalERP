import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { route, ok, parseJson, apiHeaders } from '@/lib/api/handler'
import { ROLES, MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { badRequest, ApiError } from '@/lib/api/errors'
import { loadTimetableContext } from '@/lib/timetableContext'
import { generateTimetableSchedule, testTimetableFeasibility } from '@/lib/timetableEngine'

export const GET = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const class_id = searchParams.get('class_id')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = Math.min(500, Math.max(1, Number(searchParams.get('perPage')) || 500))
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = supabase
      .from('timetable_entries')
      .select(
        `
        id,
        class_id,
        class_subject_id,
        day_of_week,
        slot_id,
        room,
        classroom_id,
        group_id,
        is_locked,
        week_code,
        card_group_id,
        is_current,
        class_subjects (
          id,
          teacher_id,
          subject_id,
          periods_per_card,
          color,
          profiles (first_name, last_name),
          subjects (name)
        ),
        classes (name, section),
        timetable_classrooms (id, name, short_name),
        timetable_groups (id, division_name, group_name)
      `,
        { count: 'exact' }
      )
      .eq('is_current', true)

    if (class_id) {
      query = query.eq('class_id', class_id)
    }

    const { data: entries, count, error } = await query.range(from, to)

    if (error) {
      throw new ApiError('INTERNAL', 'Failed to fetch timetable entries')
    }

    return NextResponse.json(
      {
        data: entries || [],
        entries: entries || [],
        meta: {
          requestId,
          total: count || 0,
          page,
          perPage,
        },
      },
      {
        status: 200,
        headers: apiHeaders(requestId),
      }
    )
  },
  { roles: ROLES }
)

export const POST = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const body = await parseJson<{
      action?: string
      scope?: 'class' | 'all'
      auto_relax?: boolean
      class_id?: string
      class_subject_id?: string
      day_of_week?: string
      slot_id?: string
      room?: string
      classroom_id?: string | null
      group_id?: string | null
      is_locked?: boolean
      week_code?: string
      entry_id?: string
      entries?: Array<{
        class_id: string
        class_subject_id: string
        day_of_week: string
        slot_id: string
        classroom_id?: string | null
        room?: string | null
        group_id?: string | null
        is_locked?: boolean
        week_code?: string
        card_group_id?: string | null
      }>
      force?: boolean
    }>(req)

    const { action, class_id } = body

    // 1. Pre-generation Test / Feasibility Diagnostics
    if (action === 'test') {
      const ctx = await loadTimetableContext(supabase, class_id || null)
      const targetIds = body.scope === 'all' || !class_id ? undefined : [class_id]
      const diagnostics = testTimetableFeasibility(ctx, targetIds)
      return ok(
        {
          diagnostics,
          errorCount: diagnostics.filter((d) => d.severity === 'error').length,
          warningCount: diagnostics.filter((d) => d.severity === 'warning').length,
        },
        { requestId }
      )
    }

    // 2. Toggle Lock on an entry
    if (action === 'toggle_lock') {
      if (!body.entry_id) {
        throw badRequest({ entry_id: 'Missing entry_id' })
      }
      const { data: existing, error: fetchErr } = await supabase
        .from('timetable_entries')
        .select('id, is_locked')
        .eq('id', body.entry_id)
        .maybeSingle()

      if (fetchErr || !existing) {
        throw new ApiError('NOT_FOUND', 'Timetable entry not found')
      }

      const nextLocked = body.is_locked !== undefined ? body.is_locked : !existing.is_locked
      const { data: updated, error: updErr } = await supabase
        .from('timetable_entries')
        .update({ is_locked: nextLocked })
        .eq('id', body.entry_id)
        .select()
        .single()

      if (updErr) throw new ApiError('INTERNAL', 'Failed to toggle lock')
      return ok({ entry: updated }, { requestId })
    }

    // 3. Bulk Restore (for Undo/Redo)
    if (action === 'bulk_restore') {
      if (!Array.isArray(body.entries)) {
        throw badRequest({ entries: 'Missing entries array' })
      }
      if (class_id) {
        await supabase.from('timetable_entries').delete().eq('class_id', class_id).eq('is_current', true)
      } else {
        await supabase.from('timetable_entries').delete().eq('is_current', true)
      }
      if (body.entries.length > 0) {
        const toInsert = body.entries.map((e) => ({
          class_id: e.class_id,
          class_subject_id: e.class_subject_id,
          day_of_week: e.day_of_week,
          slot_id: e.slot_id,
          classroom_id: e.classroom_id || null,
          room: e.room || null,
          group_id: e.group_id || null,
          is_locked: Boolean(e.is_locked),
          week_code: e.week_code || 'ALL',
          card_group_id: e.card_group_id || null,
          is_current: true,
        }))
        const { error: insErr } = await supabase.from('timetable_entries').insert(toInsert)
        if (insErr) throw new ApiError('INTERNAL', 'Failed to restore timetable entries')
      }
      return ok({ restored: body.entries.length }, { requestId })
    }

    // 4. Constraint-based Auto-Generate (Single Class or Whole School)
    if (action === 'generate') {
      const isWholeSchool = body.scope === 'all' || !class_id
      const ctx = await loadTimetableContext(supabase, isWholeSchool ? null : class_id)

      if (ctx.slots.length === 0) {
        throw badRequest({ slots: 'No period slots configured. Generate time slots first.' })
      }

      const result = generateTimetableSchedule(ctx, {
        targetClassId: isWholeSchool ? null : class_id,
        autoRelax: body.auto_relax,
      })

      // Delete unlocked entries in scope, preserve locked entries
      if (isWholeSchool) {
        await supabase.from('timetable_entries').delete().eq('is_current', true).eq('is_locked', false)
      } else {
        await supabase
          .from('timetable_entries')
          .delete()
          .eq('class_id', class_id!)
          .eq('is_current', true)
          .eq('is_locked', false)
      }

      const newEntries = result.entries.filter((e) => !e.is_locked && !e.id)
      if (newEntries.length > 0) {
        const payload = newEntries.map((e) => ({
          class_id: e.class_id,
          class_subject_id: e.class_subject_id,
          day_of_week: e.day_of_week,
          slot_id: e.slot_id,
          classroom_id: e.classroom_id || null,
          room: e.room || null,
          group_id: e.group_id || null,
          is_locked: false,
          week_code: e.week_code || 'ALL',
          card_group_id: e.card_group_id || null,
          is_current: true,
        }))
        const { error: insertErr } = await supabase.from('timetable_entries').insert(payload)
        if (insertErr) throw new ApiError('INTERNAL', 'Failed to save generated timetable')
      }

      return ok(
        {
          assigned: result.assignedCount,
          unassigned: result.unassignedCount,
          unplacedCards: result.unplacedCards,
          relaxationsApplied: result.relaxationsApplied,
          stats: result.stats,
          diagnostics: result.diagnostics,
        },
        { requestId }
      )
    }

    // 5. MANUAL ENTRY INSERT
    const { class_subject_id, day_of_week, slot_id, room, classroom_id, group_id, is_locked, week_code, force } = body

    if (!class_id || !class_subject_id || !day_of_week || !slot_id) {
      throw badRequest({ fields: 'Missing required fields for timetable slot' })
    }

    const { data: classSubject, error: csErr } = await supabase
      .from('class_subjects')
      .select('teacher_id, group_id, subjects(name)')
      .eq('id', class_subject_id)
      .single()

    if (csErr || !classSubject) {
      throw new ApiError('NOT_FOUND', 'Subject allocation record not found')
    }

    const teacherId = classSubject.teacher_id
    const effectiveGroupId = group_id !== undefined ? group_id : classSubject.group_id || null

    // Group-aware class conflict check
    const { data: classSlotEntries } = await supabase
      .from('timetable_entries')
      .select('id, group_id')
      .eq('class_id', class_id)
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)
      .eq('is_current', true)

    const classConflict = (classSlotEntries || []).find(
      (e: { id: string; group_id?: string | null }) =>
        !effectiveGroupId || !e.group_id || e.group_id === effectiveGroupId
    )

    if (classConflict && !force) {
      throw new ApiError('CONFLICT', 'Class conflict: already scheduled at this slot')
    }

    // Teacher conflict check
    const { data: teacherConflicts } = await supabase
      .from('timetable_entries')
      .select('id, class_subjects(teacher_id)')
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)
      .eq('is_current', true)

    interface TeacherConflictRecord {
      id: string
      class_subjects?: { teacher_id?: string } | { teacher_id?: string }[]
    }

    const teacherConflict = (teacherConflicts || []).find((tc: TeacherConflictRecord) => {
      const tcCs = Array.isArray(tc.class_subjects) ? tc.class_subjects[0] : tc.class_subjects
      return tcCs?.teacher_id === teacherId
    })

    if (teacherConflict && !force) {
      throw new ApiError('CONFLICT', 'Teacher conflict: teacher scheduled elsewhere at this slot')
    }

    // Classroom conflict check
    let roomConflict: { id: string } | null = null
    if (classroom_id) {
      const { data: rc } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('day_of_week', day_of_week)
        .eq('slot_id', slot_id)
        .eq('classroom_id', classroom_id)
        .eq('is_current', true)
        .maybeSingle()
      roomConflict = rc
      if (roomConflict && !force) {
        throw new ApiError('CONFLICT', 'Classroom conflict: room already occupied at this slot')
      }
    }

    if (force) {
      if (classConflict) await supabase.from('timetable_entries').delete().eq('id', classConflict.id)
      if (teacherConflict) await supabase.from('timetable_entries').delete().eq('id', teacherConflict.id)
      if (roomConflict) await supabase.from('timetable_entries').delete().eq('id', roomConflict.id)
    }

    const { data: entry, error: insertErr } = await supabase
      .from('timetable_entries')
      .insert({
        class_id,
        class_subject_id,
        day_of_week,
        slot_id,
        classroom_id: classroom_id || null,
        room: room || null,
        group_id: effectiveGroupId,
        is_locked: Boolean(is_locked),
        week_code: week_code || 'ALL',
        is_current: true,
      })
      .select()
      .single()

    if (insertErr) throw new ApiError('INTERNAL', 'Failed to insert timetable entry')

    return ok({ entry }, { requestId }, 201)
  },
  { roles: MANAGEMENT_ROLES }
)

export const PUT = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const body = await parseJson<{
      allocations?: Array<{
        id: string
        periods_per_week: number
        periods_per_card?: number
        group_id?: string | null
        allowed_classroom_ids?: string[]
        joint_class_ids?: string[]
        co_teacher_ids?: string[]
        color?: string | null
      }>
    }>(req)

    const { allocations } = body
    if (!allocations || !Array.isArray(allocations)) {
      throw badRequest({ allocations: 'Missing allocations array' })
    }

    for (const alloc of allocations) {
      const updatePayload: Record<string, unknown> = {
        periods_per_week: Number(alloc.periods_per_week),
      }
      if (alloc.periods_per_card !== undefined) updatePayload.periods_per_card = Number(alloc.periods_per_card)
      if (alloc.group_id !== undefined) updatePayload.group_id = alloc.group_id || null
      if (alloc.allowed_classroom_ids !== undefined) updatePayload.allowed_classroom_ids = alloc.allowed_classroom_ids
      if (alloc.joint_class_ids !== undefined) updatePayload.joint_class_ids = alloc.joint_class_ids
      if (alloc.co_teacher_ids !== undefined) updatePayload.co_teacher_ids = alloc.co_teacher_ids
      if (alloc.color !== undefined) updatePayload.color = alloc.color

      await supabase.from('class_subjects').update(updatePayload).eq('id', alloc.id)
    }

    return ok({ success: true }, { requestId })
  },
  { roles: MANAGEMENT_ROLES }
)

export const PATCH = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const body = await parseJson<{
      id?: string
      day_of_week?: string
      slot_id?: string
      classroom_id?: string | null
      room?: string | null
      is_locked?: boolean
      force?: boolean
    }>(req)

    const { id, day_of_week, slot_id, classroom_id, room, is_locked, force } = body

    if (!id || !day_of_week || !slot_id) {
      throw badRequest({ fields: 'Missing required parameters: id, day_of_week, slot_id' })
    }

    const { data: entry, error: fetchErr } = await supabase
      .from('timetable_entries')
      .select('*, class_subjects(teacher_id)')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !entry) {
      throw new ApiError('NOT_FOUND', 'Timetable entry not found')
    }

    const cs = Array.isArray(entry.class_subjects) ? entry.class_subjects[0] : entry.class_subjects
    const teacherId = cs?.teacher_id
    const classId = entry.class_id

    const { data: classSlotEntries } = await supabase
      .from('timetable_entries')
      .select('id, group_id')
      .eq('class_id', classId)
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)
      .eq('is_current', true)
      .neq('id', id)

    const classConflict = (classSlotEntries || []).find(
      (e: { id: string; group_id?: string | null }) =>
        !entry.group_id || !e.group_id || e.group_id === entry.group_id
    )

    if (classConflict && !force) {
      throw new ApiError('CONFLICT', 'Class conflict: already scheduled at this slot')
    }

    const { data: teacherConflicts } = await supabase
      .from('timetable_entries')
      .select('id, class_subjects(teacher_id)')
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)
      .eq('is_current', true)
      .neq('id', id)

    interface TcRecord {
      id: string
      class_subjects?: { teacher_id?: string } | { teacher_id?: string }[]
    }

    const teacherConflict = (teacherConflicts || []).find((tc: TcRecord) => {
      const tcCs = Array.isArray(tc.class_subjects) ? tc.class_subjects[0] : tc.class_subjects
      return tcCs?.teacher_id === teacherId
    })

    if (teacherConflict && !force) {
      throw new ApiError('CONFLICT', 'Teacher conflict: teacher scheduled elsewhere at this slot')
    }

    const targetRoomId = classroom_id !== undefined ? classroom_id : entry.classroom_id
    let roomConflict: { id: string } | null = null
    if (targetRoomId) {
      const { data: rc } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('day_of_week', day_of_week)
        .eq('slot_id', slot_id)
        .eq('classroom_id', targetRoomId)
        .eq('is_current', true)
        .neq('id', id)
        .maybeSingle()
      roomConflict = rc
      if (roomConflict && !force) {
        throw new ApiError('CONFLICT', 'Classroom conflict: room occupied at this slot')
      }
    }

    if (force) {
      if (classConflict) await supabase.from('timetable_entries').delete().eq('id', classConflict.id)
      if (teacherConflict) await supabase.from('timetable_entries').delete().eq('id', teacherConflict.id)
      if (roomConflict) await supabase.from('timetable_entries').delete().eq('id', roomConflict.id)
    }

    const updateFields: Record<string, unknown> = { day_of_week, slot_id }
    if (classroom_id !== undefined) updateFields.classroom_id = classroom_id
    if (room !== undefined) updateFields.room = room
    if (is_locked !== undefined) updateFields.is_locked = is_locked

    const { data: updatedEntry, error: updateErr } = await supabase
      .from('timetable_entries')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw new ApiError('INTERNAL', 'Failed to update timetable entry')

    return ok({ entry: updatedEntry }, { requestId })
  },
  { roles: MANAGEMENT_ROLES }
)

export const DELETE = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      throw badRequest({ id: 'Missing entry id' })
    }

    const { error } = await supabase.from('timetable_entries').delete().eq('id', id)
    if (error) throw new ApiError('INTERNAL', 'Failed to delete timetable entry')

    return ok({ success: true }, { requestId })
  },
  { roles: MANAGEMENT_ROLES }
)
