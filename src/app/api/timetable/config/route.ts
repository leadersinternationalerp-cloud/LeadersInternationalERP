import { createClient } from '@/utils/supabase/server'
import { route, ok, parseJson } from '@/lib/api/handler'
import { ROLES, MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { badRequest, ApiError } from '@/lib/api/errors'
import { loadTimetableContext, fetchErpTeachers } from '@/lib/timetableContext'
import { rankSubstituteTeachers } from '@/lib/timetableEngine'

export const GET = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const subDate = searchParams.get('sub_date')

    const [
      buildingsRes,
      classroomsRes,
      groupsRes,
      teacherConsRes,
      classConsRes,
      subjectConsRes,
      relsRes,
      settingsRes,
      versionsRes,
      supervisionsRes,
      subjectsRes,
      subsRes,
      classesRes,
      erpTeachers,
    ] = await Promise.all([
      supabase.from('timetable_buildings').select('*').order('name', { ascending: true }),
      supabase.from('timetable_classrooms').select('*, timetable_buildings(name)').order('name', { ascending: true }),
      supabase.from('timetable_groups').select('*').order('division_name', { ascending: true }),
      supabase.from('timetable_teacher_constraints').select('*'),
      supabase.from('timetable_class_constraints').select('*'),
      supabase.from('timetable_subject_constraints').select('*'),
      supabase.from('timetable_card_relationships').select('*').order('created_at', { ascending: false }),
      supabase.from('timetable_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('timetable_versions').select('id, name, description, is_active, created_at').order('created_at', { ascending: false }),
      supabase.from('timetable_supervisions').select('*, profiles(first_name, last_name), timetable_slots(name, start_time, end_time)').order('day_of_week', { ascending: true }),
      supabase.from('subjects').select('id, name').order('name', { ascending: true }),
      subDate
        ? supabase
            .from('timetable_substitutions')
            .select('*')
            .eq('sub_date', subDate)
            .order('created_at', { ascending: false })
        : supabase
            .from('timetable_substitutions')
            .select('*')
            .order('sub_date', { ascending: false })
            .limit(50),
      supabase.from('classes').select('*').order('name', { ascending: true }),
      fetchErpTeachers(supabase),
    ])

    return ok(
      {
        buildings: buildingsRes.data || [],
        classrooms: classroomsRes.data || [],
        groups: groupsRes.data || [],
        teacherConstraints: teacherConsRes.data || [],
        classConstraints: classConsRes.data || [],
        subjectConstraints: subjectConsRes.data || [],
        cardRelationships: relsRes.data || [],
        settings: settingsRes.data || {
          id: 1,
          days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          periods_per_day: 8,
          multi_week_enabled: false,
          weeks_count: 1,
          lunch_enabled: false,
          lunch_min_period: 4,
          lunch_max_period: 6,
          auto_relax_constraints: true,
        },
        versions: versionsRes.data || [],
        supervisions: supervisionsRes.data || [],
        subjects: subjectsRes.data || [],
        substitutions: subsRes.data || [],
        classes: classesRes.data || [],
        teachers: erpTeachers,
      },
      { requestId }
    )
  },
  { roles: ROLES }
)

export const POST = route(
  async ({ req, requestId, user }) => {
    const supabase = await createClient()
    const body = await parseJson<{
      entity: string
      action?: 'upsert' | 'delete' | 'save_version' | 'restore_version' | 'suggest_substitutes'
      id?: string
      payload?: Record<string, unknown>
    }>(req)

    const { entity, action = 'upsert', id, payload = {} } = body

    if (!entity) {
      throw badRequest({ entity: 'Missing entity type' })
    }

    if (entity === 'building') {
      if (action === 'delete' && id) {
        await supabase.from('timetable_buildings').delete().eq('id', id)
        return ok({ deleted: true }, { requestId })
      }
      const record = {
        name: String(payload.name || '').trim(),
        short_name: payload.short_name ? String(payload.short_name) : null,
        travel_periods: Number(payload.travel_periods || 0),
      }
      if (!record.name) throw badRequest({ name: 'Building name is required' })
      const res = id
        ? await supabase.from('timetable_buildings').update(record).eq('id', id).select().single()
        : await supabase.from('timetable_buildings').insert(record).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ building: res.data }, { requestId })
    }

    if (entity === 'classroom') {
      if (action === 'delete' && id) {
        await supabase.from('timetable_classrooms').delete().eq('id', id)
        return ok({ deleted: true }, { requestId })
      }
      const record = {
        name: String(payload.name || '').trim(),
        short_name: payload.short_name ? String(payload.short_name) : null,
        capacity: Number(payload.capacity || 40),
        building_id: payload.building_id || null,
        is_shared: Boolean(payload.is_shared),
        home_class_id: payload.home_class_id || null,
        time_off: payload.time_off || {},
      }
      if (!record.name) throw badRequest({ name: 'Classroom name is required' })
      const res = id
        ? await supabase.from('timetable_classrooms').update(record).eq('id', id).select().single()
        : await supabase.from('timetable_classrooms').insert(record).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ classroom: res.data }, { requestId })
    }

    if (entity === 'group') {
      if (action === 'delete' && id) {
        await supabase.from('timetable_groups').delete().eq('id', id)
        return ok({ deleted: true }, { requestId })
      }
      const record = {
        class_id: String(payload.class_id || ''),
        division_name: String(payload.division_name || 'Division 1').trim(),
        group_name: String(payload.group_name || '').trim(),
        student_count: payload.student_count ? Number(payload.student_count) : null,
      }
      if (!record.class_id || !record.group_name) {
        throw badRequest({ fields: 'class_id and group_name are required' })
      }
      const res = id
        ? await supabase.from('timetable_groups').update(record).eq('id', id).select().single()
        : await supabase.from('timetable_groups').insert(record).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ group: res.data }, { requestId })
    }

    if (entity === 'teacher_constraint') {
      const teacher_id = String(payload.teacher_id || id || '')
      if (!teacher_id) throw badRequest({ teacher_id: 'teacher_id is required' })
      const record = {
        teacher_id,
        max_windows_per_day: payload.max_windows_per_day !== null && payload.max_windows_per_day !== '' && payload.max_windows_per_day !== undefined ? Number(payload.max_windows_per_day) : null,
        max_windows_per_week: payload.max_windows_per_week !== null && payload.max_windows_per_week !== '' && payload.max_windows_per_week !== undefined ? Number(payload.max_windows_per_week) : null,
        max_consecutive_periods: payload.max_consecutive_periods !== null && payload.max_consecutive_periods !== '' && payload.max_consecutive_periods !== undefined ? Number(payload.max_consecutive_periods) : null,
        min_periods_per_day: payload.min_periods_per_day !== null && payload.min_periods_per_day !== '' && payload.min_periods_per_day !== undefined ? Number(payload.min_periods_per_day) : null,
        max_periods_per_day: payload.max_periods_per_day !== null && payload.max_periods_per_day !== '' && payload.max_periods_per_day !== undefined ? Number(payload.max_periods_per_day) : null,
        max_days_per_week: payload.max_days_per_week !== null && payload.max_days_per_week !== '' && payload.max_days_per_week !== undefined ? Number(payload.max_days_per_week) : null,
        max_building_transits_per_day: payload.max_building_transits_per_day !== null && payload.max_building_transits_per_day !== '' && payload.max_building_transits_per_day !== undefined ? Number(payload.max_building_transits_per_day) : null,
        can_substitute: payload.can_substitute !== undefined ? Boolean(payload.can_substitute) : true,
        color: payload.color ? String(payload.color) : null,
        time_off: payload.time_off || {},
        updated_at: new Date().toISOString(),
      }
      const res = await supabase.from('timetable_teacher_constraints').upsert(record, { onConflict: 'teacher_id' }).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ teacherConstraint: res.data }, { requestId })
    }

    if (entity === 'class_constraint') {
      const class_id = String(payload.class_id || id || '')
      if (!class_id) throw badRequest({ class_id: 'class_id is required' })
      const record = {
        class_id,
        home_classroom_id: payload.home_classroom_id || null,
        max_periods_per_day: payload.max_periods_per_day !== null && payload.max_periods_per_day !== '' && payload.max_periods_per_day !== undefined ? Number(payload.max_periods_per_day) : null,
        min_periods_per_day: payload.min_periods_per_day !== null && payload.min_periods_per_day !== '' && payload.min_periods_per_day !== undefined ? Number(payload.min_periods_per_day) : null,
        allow_gaps: Boolean(payload.allow_gaps),
        lunch_min_period: payload.lunch_min_period ? Number(payload.lunch_min_period) : null,
        lunch_max_period: payload.lunch_max_period ? Number(payload.lunch_max_period) : null,
        forbid_after_lunch_if_last: Boolean(payload.forbid_after_lunch_if_last),
        time_off: payload.time_off || {},
        updated_at: new Date().toISOString(),
      }
      const res = await supabase.from('timetable_class_constraints').upsert(record, { onConflict: 'class_id' }).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ classConstraint: res.data }, { requestId })
    }

    if (entity === 'subject_constraint') {
      const subject_id = String(payload.subject_id || id || '')
      if (!subject_id) throw badRequest({ subject_id: 'subject_id is required' })
      const record = {
        subject_id,
        preferred_classroom_ids: (payload.preferred_classroom_ids as string[]) || [],
        color: payload.color ? String(payload.color) : null,
        max_per_day: Number(payload.max_per_day || 1),
        time_off: payload.time_off || {},
        updated_at: new Date().toISOString(),
      }
      const res = await supabase.from('timetable_subject_constraints').upsert(record, { onConflict: 'subject_id' }).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ subjectConstraint: res.data }, { requestId })
    }

    if (entity === 'card_relationship') {
      if (action === 'delete' && id) {
        await supabase.from('timetable_card_relationships').delete().eq('id', id)
        return ok({ deleted: true }, { requestId })
      }
      const record = {
        relation_type: String(payload.relation_type || 'not_same_day'),
        importance: String(payload.importance || 'strict'),
        subject_id_a: payload.subject_id_a || null,
        subject_id_b: payload.subject_id_b || null,
        class_id: payload.class_id || null,
        lesson_ids: (payload.lesson_ids as string[]) || [],
        params: payload.params || {},
        is_enabled: payload.is_enabled !== undefined ? Boolean(payload.is_enabled) : true,
      }
      const res = id
        ? await supabase.from('timetable_card_relationships').update(record).eq('id', id).select().single()
        : await supabase.from('timetable_card_relationships').insert(record).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ cardRelationship: res.data }, { requestId })
    }

    if (entity === 'settings') {
      const record = {
        id: 1,
        days_of_week: (payload.days_of_week as string[]) || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        periods_per_day: Number(payload.periods_per_day || 8),
        multi_week_enabled: Boolean(payload.multi_week_enabled),
        weeks_count: Number(payload.weeks_count || 1),
        lunch_enabled: Boolean(payload.lunch_enabled),
        lunch_min_period: Number(payload.lunch_min_period || 4),
        lunch_max_period: Number(payload.lunch_max_period || 6),
        auto_relax_constraints: payload.auto_relax_constraints !== undefined ? Boolean(payload.auto_relax_constraints) : true,
        updated_at: new Date().toISOString(),
      }
      const res = await supabase.from('timetable_settings').upsert(record, { onConflict: 'id' }).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ settings: res.data }, { requestId })
    }

    if (entity === 'supervision') {
      if (action === 'delete' && id) {
        await supabase.from('timetable_supervisions').delete().eq('id', id)
        return ok({ deleted: true }, { requestId })
      }
      const record = {
        day_of_week: String(payload.day_of_week || ''),
        slot_id: String(payload.slot_id || ''),
        teacher_id: String(payload.teacher_id || ''),
        area_name: String(payload.area_name || '').trim(),
        classroom_id: payload.classroom_id || null,
      }
      if (!record.day_of_week || !record.slot_id || !record.teacher_id || !record.area_name) {
        throw badRequest({ fields: 'day_of_week, slot_id, teacher_id, and area_name are required' })
      }
      const res = await supabase.from('timetable_supervisions').insert(record).select('*, profiles(first_name, last_name), timetable_slots(name, start_time, end_time)').single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ supervision: res.data }, { requestId })
    }

    if (entity === 'substitution') {
      if (action === 'suggest_substitutes') {
        const entryId = String(payload.entry_id || '')
        if (!entryId) throw badRequest({ entry_id: 'entry_id is required' })
        const ctx = await loadTimetableContext(supabase, null)
        const entry = ctx.existingEntries.find((e) => e.id === entryId)
        if (!entry) throw new ApiError('NOT_FOUND', 'Entry not found')

        const teachers = await fetchErpTeachers(supabase)
        const formattedTeachers = teachers.map((t) => ({
          id: t.id,
          name: `${t.first_name} ${t.last_name}`.trim(),
        }))

        const candidates = rankSubstituteTeachers(ctx, entry, formattedTeachers)
        return ok({ candidates }, { requestId })
      }

      if (action === 'delete' && id) {
        await supabase.from('timetable_substitutions').delete().eq('id', id)
        return ok({ deleted: true }, { requestId })
      }

      const record = {
        sub_date: String(payload.sub_date || ''),
        entry_id: String(payload.entry_id || ''),
        original_teacher_id: payload.original_teacher_id || null,
        substitute_teacher_id: payload.substitute_teacher_id || null,
        classroom_id: payload.classroom_id || null,
        room: payload.room ? String(payload.room) : null,
        status: String(payload.status || 'assigned'),
        notes: payload.notes ? String(payload.notes) : null,
      }
      if (!record.sub_date || !record.entry_id) {
        throw badRequest({ fields: 'sub_date and entry_id are required' })
      }
      const res = id
        ? await supabase.from('timetable_substitutions').update(record).eq('id', id).select().single()
        : await supabase.from('timetable_substitutions').insert(record).select().single()
      if (res.error) throw new ApiError('INTERNAL', res.error.message)
      return ok({ substitution: res.data }, { requestId })
    }

    if (entity === 'version') {
      if (action === 'delete' && id) {
        await supabase.from('timetable_versions').delete().eq('id', id)
        return ok({ deleted: true }, { requestId })
      }
      if (action === 'save_version') {
        const name = String(payload.name || '').trim()
        if (!name) throw badRequest({ name: 'Version name is required' })
        const { data: currentEntries } = await supabase
          .from('timetable_entries')
          .select('class_id, class_subject_id, day_of_week, slot_id, classroom_id, room, group_id, is_locked, week_code, card_group_id')
          .eq('is_current', true)

        const res = await supabase
          .from('timetable_versions')
          .insert({
            name,
            description: payload.description ? String(payload.description) : null,
            snapshot: currentEntries || [],
            created_by: user?.id || null,
          })
          .select('id, name, description, is_active, created_at')
          .single()
        if (res.error) throw new ApiError('INTERNAL', res.error.message)
        return ok({ version: res.data }, { requestId })
      }
      if (action === 'restore_version' && id) {
        const { data: ver, error: verErr } = await supabase
          .from('timetable_versions')
          .select('*')
          .eq('id', id)
          .single()
        if (verErr || !ver) throw new ApiError('NOT_FOUND', 'Version not found')

        const snapshot = (ver.snapshot || []) as Array<Record<string, unknown>>
        await supabase.from('timetable_entries').delete().eq('is_current', true)
        if (snapshot.length > 0) {
          const toInsert = snapshot.map((e) => ({
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
          if (insErr) throw new ApiError('INTERNAL', insErr.message)
        }
        return ok({ restored: snapshot.length }, { requestId })
      }
    }

    throw badRequest({ entity: `Unsupported entity/action: ${entity}/${action}` })
  },
  { roles: MANAGEMENT_ROLES }
)
