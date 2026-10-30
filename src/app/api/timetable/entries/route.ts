import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { route, ok, parseJson, apiHeaders } from '@/lib/api/handler'
import { ROLES, MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const class_id = searchParams.get('class_id')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage')) || 50))
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
        is_current,
        class_subjects (
          id,
          teacher_id,
          subject_id,
          profiles (first_name, last_name),
          subjects (name)
        ),
        classes (name, section)
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
      class_id?: string
      class_subject_id?: string
      day_of_week?: string
      slot_id?: string
      room?: string
      force?: boolean
    }>(req)

    const { action, class_id } = body

    if (action === 'generate') {
      if (!class_id) {
        throw badRequest({ class_id: 'Missing class_id for timetable generation' })
      }

      const slotQuery = supabase.from('timetable_slots').select('*').order('period_number', { ascending: true })
      const { data: initialSlots, error: slotErr } = await slotQuery.eq('class_id', class_id)
      let slots = initialSlots
      if (slotErr) throw new ApiError('INTERNAL', 'Failed to fetch slots')

      if (!slots || slots.length === 0) {
        const { data: globalSlots } = await supabase
          .from('timetable_slots')
          .select('*')
          .is('class_id', null)
          .order('period_number', { ascending: true })
        slots = globalSlots || []
      }

      if (!slots || slots.length === 0) {
        throw badRequest({ slots: 'No period slots configured. Generate time slots first.' })
      }

      const { data: allocations, error: allocErr } = await supabase
        .from('class_subjects')
        .select('id, teacher_id, periods_per_week, profiles(first_name, last_name), subjects(name)')
        .eq('class_id', class_id)

      if (allocErr || !allocations || allocations.length === 0) {
        throw badRequest({ allocations: 'No subject allocations found. Assign teachers to subjects first.' })
      }

      const { data: allEntries, error: entriesErr } = await supabase
        .from('timetable_entries')
        .select(`
          id,
          class_id,
          day_of_week,
          slot_id,
          class_subject_id,
          class_subjects (teacher_id)
        `)
        .eq('is_current', true)

      if (entriesErr) throw new ApiError('INTERNAL', 'Failed to query current timetable entries')

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      const academicSlots = slots.filter((s: { is_break?: boolean }) => !s.is_break)

      interface AllocationRecord {
        id: string
        teacher_id?: string
        periods_per_week?: number
      }

      const subjectPool: AllocationRecord[] = []
      allocations.forEach((alloc: AllocationRecord) => {
        const periods = alloc.periods_per_week || 3
        for (let i = 0; i < periods; i++) {
          subjectPool.push(alloc)
        }
      })

      for (let i = subjectPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[subjectPool[i], subjectPool[j]] = [subjectPool[j], subjectPool[i]]
      }

      const assignedCells: Array<{
        class_id: string
        class_subject_id: string
        day_of_week: string
        slot_id: string
        is_current: boolean
      }> = []

      interface ExistingTimetableEntry {
        class_id: string
        day_of_week: string
        slot_id: string
        class_subjects?: { teacher_id?: string } | { teacher_id?: string }[]
      }

      const otherClassEntries = (allEntries || []).filter((e: ExistingTimetableEntry) => e.class_id !== class_id)

      for (const day of days) {
        for (const slot of academicSlots) {
          if (subjectPool.length === 0) break

          const poolIndex = subjectPool.findIndex((subj) => {
            const hasConflict = otherClassEntries.some((e: ExistingTimetableEntry) => {
              if (e.day_of_week !== day || e.slot_id !== slot.id) return false
              const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
              return cs?.teacher_id === subj.teacher_id
            })

            const hasDoublePeriodToday = assignedCells.some((c) => c.day_of_week === day && c.class_subject_id === subj.id)
            return !hasConflict && !hasDoublePeriodToday
          })

          if (poolIndex !== -1) {
            const chosen = subjectPool.splice(poolIndex, 1)[0]
            assignedCells.push({
              class_id,
              class_subject_id: chosen.id,
              day_of_week: day,
              slot_id: slot.id,
              is_current: true,
            })
          }
        }
      }

      await supabase.from('timetable_entries').delete().eq('class_id', class_id)

      if (assignedCells.length > 0) {
        const { error: insertErr } = await supabase.from('timetable_entries').insert(assignedCells)
        if (insertErr) throw new ApiError('INTERNAL', 'Failed to save generated timetable')
      }

      return ok(
        {
          assigned: assignedCells.length,
          unassigned: subjectPool.length,
        },
        { requestId }
      )
    }

    // MANUAL ENTRY INSERT
    const { class_subject_id, day_of_week, slot_id, room, force } = body

    if (!class_id || !class_subject_id || !day_of_week || !slot_id) {
      throw badRequest({ fields: 'Missing required fields for timetable slot' })
    }

    const { data: classSubject, error: csErr } = await supabase
      .from('class_subjects')
      .select('teacher_id, subjects(name)')
      .eq('id', class_subject_id)
      .single()

    if (csErr || !classSubject) {
      throw new ApiError('NOT_FOUND', 'Subject allocation record not found')
    }

    const teacherId = classSubject.teacher_id

    const { data: classConflict } = await supabase
      .from('timetable_entries')
      .select('id, class_subjects(subjects(name))')
      .eq('class_id', class_id)
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)
      .eq('is_current', true)
      .maybeSingle()

    if (classConflict && !force) {
      throw new ApiError('CONFLICT', 'Class conflict: already scheduled at this slot')
    }

    const { data: teacherConflicts } = await supabase
      .from('timetable_entries')
      .select('id, classes(name, section), class_subjects(teacher_id, subjects(name))')
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

    if (force) {
      if (classConflict) await supabase.from('timetable_entries').delete().eq('id', classConflict.id)
      if (teacherConflict) await supabase.from('timetable_entries').delete().eq('id', teacherConflict.id)
    }

    const { data: entry, error: insertErr } = await supabase
      .from('timetable_entries')
      .insert({
        class_id,
        class_subject_id,
        day_of_week,
        slot_id,
        room: room || null,
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
      allocations?: Array<{ id: string; periods_per_week: number }>
    }>(req)

    const { allocations } = body
    if (!allocations || !Array.isArray(allocations)) {
      throw badRequest({ allocations: 'Missing allocations array' })
    }

    for (const alloc of allocations) {
      await supabase
        .from('class_subjects')
        .update({ periods_per_week: Number(alloc.periods_per_week) })
        .eq('id', alloc.id)
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
      force?: boolean
    }>(req)

    const { id, day_of_week, slot_id, force } = body

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

    const { data: classConflict } = await supabase
      .from('timetable_entries')
      .select('id')
      .eq('class_id', classId)
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)
      .eq('is_current', true)
      .neq('id', id)
      .maybeSingle()

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

    if (force) {
      if (classConflict) await supabase.from('timetable_entries').delete().eq('id', classConflict.id)
      if (teacherConflict) await supabase.from('timetable_entries').delete().eq('id', teacherConflict.id)
    }

    const { data: updatedEntry, error: updateErr } = await supabase
      .from('timetable_entries')
      .update({ day_of_week, slot_id })
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
