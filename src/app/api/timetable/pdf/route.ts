import { createClient } from '@/utils/supabase/server'
import { generateTimetablePdf } from '@/lib/timetablePdf'
import { route } from '@/lib/api/handler'
import { ROLES } from '@/lib/auth/roles'
import { ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const classId = searchParams.get('class_id')
    const teacherId = searchParams.get('teacher_id')

    let slotClassQuery = supabase.from('timetable_slots').select('*').order('period_number', { ascending: true })
    if (classId) {
      slotClassQuery = slotClassQuery.eq('class_id', classId)
    } else {
      slotClassQuery = slotClassQuery.is('class_id', null)
    }

    const { data: initialSlots, error: slotErr } = await slotClassQuery
    let slots = initialSlots
    if (slotErr) throw new ApiError('INTERNAL', 'Failed to fetch timetable slots')

    if (classId && (!slots || slots.length === 0)) {
      const { data: globalSlots } = await supabase
        .from('timetable_slots')
        .select('*')
        .is('class_id', null)
        .order('period_number', { ascending: true })
      slots = globalSlots || []
    }

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

    if (entryErr) throw new ApiError('INTERNAL', 'Failed to fetch timetable entries')

    interface FormattedEntry {
      id: string
      slot_id: string
      day_of_week: string
      subject_name: string
      teacher_name: string
      class_name: string
      room?: string
      teacher_id?: string
      class_id?: string
    }

    interface DbEntryRecord {
      id: string
      slot_id: string
      day_of_week: string
      room?: string
      class_id?: string
      class_subjects?: {
        teacher_id?: string
        profiles?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[]
        subjects?: { name?: string; code?: string } | { name?: string; code?: string }[]
        classes?: { name?: string; section?: string } | { name?: string; section?: string }[]
      } | {
        teacher_id?: string
        profiles?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[]
        subjects?: { name?: string; code?: string } | { name?: string; code?: string }[]
        classes?: { name?: string; section?: string } | { name?: string; section?: string }[]
      }[]
    }

    let formattedEntries: FormattedEntry[] = (dbEntries || []).map((e: DbEntryRecord) => {
      const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
      const prof = cs?.profiles ? (Array.isArray(cs.profiles) ? cs.profiles[0] : cs.profiles) : null
      const teacherName = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Unassigned'
      const sub = cs?.subjects ? (Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects) : null
      const subjectName = sub?.name || 'Class Subject'
      const cls = cs?.classes ? (Array.isArray(cs.classes) ? cs.classes[0] : cs.classes) : null
      const className = cls?.name ? `${cls.name} ${cls.section || ''}`.trim() : 'Class'

      return {
        id: e.id,
        slot_id: e.slot_id,
        day_of_week: e.day_of_week,
        subject_name: subjectName,
        teacher_name: teacherName,
        class_name: className,
        room: e.room || undefined,
        teacher_id: cs?.teacher_id,
        class_id: e.class_id,
      }
    })

    let title = 'School Timetable'
    let type: 'class' | 'teacher' | 'summary' = 'summary'
    let entityName = 'All Classes'

    if (teacherId) {
      type = 'teacher'
      formattedEntries = formattedEntries.filter((e) => e.teacher_id === teacherId)
      const sample = formattedEntries[0]
      entityName = sample?.teacher_name || 'Teacher'
      title = `Teacher Timetable: ${entityName}`
    } else if (classId) {
      type = 'class'
      formattedEntries = formattedEntries.filter((e) => e.class_id === classId)
      const sample = formattedEntries[0]
      entityName = sample?.class_name || 'Class'
      title = `Class Timetable: ${entityName}`
    }

    const pdfBuffer = await generateTimetablePdf({
      title,
      type,
      entityName,
      slots: slots || [],
      entries: formattedEntries,
    })

    const uint8 = new Uint8Array(pdfBuffer)

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Timetable_${Date.now()}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Request-Id': requestId,
      },
    })
  },
  { roles: ROLES }
)
