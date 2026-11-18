import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { route, apiHeaders } from '@/lib/api/handler'
import { ROLES } from '@/lib/auth/roles'
import { loadTimetableContext, fetchErpTeachers } from '@/lib/timetableContext'
import { exportTimetableToAscXml } from '@/lib/timetableEngine'

export const GET = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const format = (searchParams.get('format') || 'xml').toLowerCase()

    const ctx = await loadTimetableContext(supabase, null)
    const [classesRes, subjectsRes, erpTeachers] = await Promise.all([
      supabase.from('classes').select('id, name, section').order('name', { ascending: true }),
      supabase.from('subjects').select('id, name').order('name', { ascending: true }),
      fetchErpTeachers(supabase),
    ])

    const classes = (classesRes.data || []) as Array<{ id: string; name: string; section?: string | null }>
    const subjects = (subjectsRes.data || []) as Array<{ id: string; name: string }>
    const teachers = erpTeachers.map((t) => ({
      id: t.id,
      name: `${t.first_name} ${t.last_name}`.trim(),
      color: ctx.teacherConstraints[t.id]?.color || '#3b82f6',
    }))

    if (format === 'csv') {
      const classMap = new Map(classes.map((c) => [c.id, `${c.name}${c.section ? ' ' + c.section : ''}`.trim()]))
      const lessonMap = new Map(ctx.lessons.map((l) => [l.id, l]))
      const slotMap = new Map(ctx.slots.map((s) => [s.id, s]))
      const roomMap = new Map(ctx.classrooms.map((r) => [r.id, r.name]))
      const groupMap = new Map(ctx.groups.map((g) => [g.id, g.group_name]))

      const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`
      const rows = [
        ['Day', 'Period', 'Time', 'Class', 'Group', 'Subject', 'Teacher', 'Classroom', 'Locked'].map(csvEscape).join(','),
      ]

      for (const e of ctx.existingEntries) {
        const l = lessonMap.get(e.class_subject_id)
        const s = slotMap.get(e.slot_id)
        const roomName = (e.classroom_id ? roomMap.get(e.classroom_id) : e.room) || ''
        const groupName = e.group_id ? groupMap.get(e.group_id) || '' : ''
        rows.push(
          [
            e.day_of_week,
            s ? s.name : '',
            s ? `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}` : '',
            classMap.get(e.class_id) || '',
            groupName,
            l?.subject_name || '',
            l?.teacher_name || '',
            roomName,
            e.is_locked ? 'Yes' : 'No',
          ]
            .map((v) => csvEscape(String(v)))
            .join(',')
        )
      }

      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          ...apiHeaders(requestId),
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="timetable_export.csv"',
        },
      })
    }

    const xml = exportTimetableToAscXml({
      slots: ctx.slots,
      days: ctx.settings.days_of_week,
      classes,
      subjects,
      teachers,
      buildings: ctx.buildings,
      classrooms: ctx.classrooms,
      groups: ctx.groups,
      lessons: ctx.lessons,
      entries: ctx.existingEntries,
    })

    return new NextResponse(xml, {
      status: 200,
      headers: {
        ...apiHeaders(requestId),
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="timetable_asctt2012.xml"',
      },
    })
  },
  { roles: ROLES }
)
