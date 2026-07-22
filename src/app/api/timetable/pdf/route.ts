import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateTimetablePdf, TimetablePDFOptions } from '@/lib/timetablePdf'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')
    const teacherId = searchParams.get('teacher_id')
    const summary = searchParams.get('summary') === 'true'

    const supabase = await createClient()

    // 1. Fetch Slots (target class slots or fallback to school default slots)
    let slotClassQuery = supabase.from('timetable_slots').select('*').order('period_number', { ascending: true })
    if (classId) {
      slotClassQuery = slotClassQuery.eq('class_id', classId)
    } else {
      slotClassQuery = slotClassQuery.is('class_id', null)
    }

    let { data: slots, error: slotErr } = await slotClassQuery
    if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 })

    // Fallback if class slots empty
    if (classId && (!slots || slots.length === 0)) {
      const { data: globalSlots } = await supabase
        .from('timetable_slots')
        .select('*')
        .is('class_id', null)
        .order('period_number', { ascending: true })
      slots = globalSlots || []
    }

    // 2. Fetch Entries
    const { data: dbEntries, error: entryErr } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        class_id,
        class_subject_id,
        day_of_week,
        slot_id,
        room,
        class_subjects (
          id,
          teacher_id,
          subject_id,
          profiles (first_name, last_name),
          subjects (name)
        ),
        classes (name, section)
      `)

    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })

    let filteredEntries = dbEntries || []
    let title = 'School Timetable'
    let entityName = 'Summary'
    let type: 'class' | 'teacher' | 'summary' = 'summary'

    if (classId) {
      filteredEntries = filteredEntries.filter(e => e.class_id === classId)
      type = 'class'
      title = 'Class Timetable'
      
      const { data: cls } = await supabase.from('classes').select('name, section').eq('id', classId).single()
      entityName = cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Class'
    } else if (teacherId) {
      filteredEntries = filteredEntries.filter(e => {
        const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
        return cs?.teacher_id === teacherId
      })
      type = 'teacher'
      title = 'Teacher Timetable'

      const { data: prof } = await supabase.from('profiles').select('first_name, last_name').eq('id', teacherId).single()
      entityName = prof ? `${prof.first_name} ${prof.last_name}` : 'Teacher'
    } else if (summary) {
      type = 'summary'
      title = 'School Timetable Summary'
      entityName = 'All Classes'
    }

    // 3. Compile PDF input
    const pdfSlots = (slots || []).map(s => ({
      id: s.id,
      period_number: s.period_number,
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      is_break: s.is_break
    }))

    const pdfEntries = filteredEntries.map(e => {
      const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
      const sub = cs ? (Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects) : null
      const prof = cs ? (Array.isArray(cs.profiles) ? cs.profiles[0] : cs.profiles) : null
      const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes

      return {
        day_of_week: e.day_of_week,
        slot_id: e.slot_id,
        room: e.room || undefined,
        subjectName: sub?.name || undefined,
        teacherName: prof ? `${prof.first_name} ${prof.last_name}` : undefined,
        className: cls ? `${cls.name} ${cls.section || ''}`.trim() : undefined
      }
    })

    const pdfBuffer = await generateTimetablePdf({
      title,
      type,
      entityName,
      slots: pdfSlots,
      entries: pdfEntries
    })

    const cleanEntity = entityName.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${title.replace(/\s+/g, '_')}_${cleanEntity}.pdf`

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
