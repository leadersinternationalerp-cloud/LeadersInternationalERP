import { NextRequest, NextResponse } from 'next/server'
import { generateTimetablePdf } from '@/lib/timetablePdf'
import { withAuth } from '@/lib/api/guard'

export const GET = withAuth(
  async (request: NextRequest, { supabase }) => {
    try {
      const { searchParams } = new URL(request.url)
      const classId = searchParams.get('class_id')
      const teacherId = searchParams.get('teacher_id')
      const summary = searchParams.get('summary') === 'true'

      // 1. Fetch Slots (target class slots or fallback to school default slots)
      let slotClassQuery = supabase.from('timetable_slots').select('*').order('period_number', { ascending: true })
      if (classId) {
        slotClassQuery = slotClassQuery.eq('class_id', classId)
      } else {
        slotClassQuery = slotClassQuery.is('class_id', null)
      }

      const { data: initialSlots, error: slotErr } = await slotClassQuery; let slots = initialSlots
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
          is_current,
          class_subjects (
            id,
            teacher_id,
            subject_id,
            profiles (first_name, last_name),
            subjects (name, code),
            classes (name, section)
          )
        `)
        .eq('is_current', true)

      if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })

      // 3. Format entries for PDF Generator
      let formattedEntries = (dbEntries || []).map((e: any) => {
        const cs = e.class_subjects
        const teacherName = cs?.profiles ? `${cs.profiles.first_name || ''} ${cs.profiles.last_name || ''}`.trim() : 'Unassigned'
        const subjectName = cs?.subjects?.name || 'Class Subject'
        const className = cs?.classes?.name ? `${cs.classes.name} ${cs.classes.section || ''}`.trim() : 'Class'

        return {
          id: e.id,
          slot_id: e.slot_id,
          day_of_week: e.day_of_week,
          subject_name: subjectName,
          teacher_name: teacherName,
          class_name: className,
          room: e.room || undefined,
          teacher_id: cs?.teacher_id,
          class_id: e.class_id
        }
      })

      let title = 'School Timetable'
      let type: 'class' | 'teacher' | 'summary' = 'summary'
      let entityName = 'All Classes'

      if (teacherId) {
        type = 'teacher'
        formattedEntries = formattedEntries.filter((e: any) => e.teacher_id === teacherId)
        const sample = formattedEntries[0]
        entityName = sample?.teacher_name || 'Teacher'
        title = `Teacher Timetable: ${entityName}`
      } else if (classId) {
        type = 'class'
        formattedEntries = formattedEntries.filter((e: any) => e.class_id === classId)
        const sample = formattedEntries[0]
        entityName = sample?.class_name || 'Class'
        title = `Class Timetable: ${entityName}`
      }

      // Generate PDF
      const pdfBuffer = await generateTimetablePdf({
        title,
        type,
        entityName,
        slots: slots || [],
        entries: formattedEntries,
      })

      // Convert Buffer to Uint8Array for NextResponse compatibility
      const uint8 = new Uint8Array(pdfBuffer)

      return new NextResponse(uint8, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="Timetable_${Date.now()}.pdf"`,
          'Cache-Control': 'no-store, max-age=0'
        }
      })
    } catch (err: any) {
      console.error('Timetable PDF generation error:', err)
      return NextResponse.json({ error: err.message || 'Failed to generate timetable PDF' }, { status: 500 })
    }
  }
)
