import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: entries, error } = await supabase
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entries: entries || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth & Admin Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    const isAdmin = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Dean', 'HOS'].includes(r))
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { class_id, class_subject_id, day_of_week, slot_id, room, force } = body

    if (!class_id || !class_subject_id || !day_of_week || !slot_id) {
      return NextResponse.json({ error: 'Missing required parameters: class_id, class_subject_id, day_of_week, slot_id are required' }, { status: 400 })
    }

    // Fetch details of the class subject allocation
    const { data: alloc, error: allocErr } = await supabase
      .from('class_subjects')
      .select('id, teacher_id, subject_id, profiles(first_name, last_name), subjects(name)')
      .eq('id', class_subject_id)
      .maybeSingle()

    if (allocErr || !alloc) {
      return NextResponse.json({ error: 'Class subject allocation not found' }, { status: 404 })
    }

    const subObj = Array.isArray(alloc.subjects) ? alloc.subjects[0] : alloc.subjects
    const profObj = Array.isArray(alloc.profiles) ? alloc.profiles[0] : alloc.profiles

    const teacherId = alloc.teacher_id
    const subjectName = subObj?.name || 'Subject'
    const teacherName = profObj ? `${profObj.first_name} ${profObj.last_name}` : 'Teacher'

    // Fetch slot info
    const { data: slot } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('id', slot_id)
      .maybeSingle()

    if (!slot) {
      return NextResponse.json({ error: 'Target time slot not found' }, { status: 404 })
    }

    // 1. Conflict Check: Class conflict (is the class already scheduled at this slot & day?)
    const { data: classConflict } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        class_subjects (
          subjects (name)
        )
      `)
      .eq('class_id', class_id)
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)
      .maybeSingle()

    if (classConflict && !force) {
      const csObj = Array.isArray(classConflict.class_subjects) ? classConflict.class_subjects[0] : classConflict.class_subjects
      const csSubObj = csObj ? (Array.isArray(csObj.subjects) ? csObj.subjects[0] : csObj.subjects) : null
      const scheduledSubjName = csSubObj?.name || 'Another lesson'
      return NextResponse.json({
        conflict: true,
        type: 'class',
        message: `Class conflict: This class is already scheduled for ${scheduledSubjName} at this time on ${day_of_week}.`
      }, { status: 409 })
    }

    // 2. Conflict Check: Teacher conflict (is the teacher already teaching elsewhere at this slot & day?)
    const { data: teacherConflicts } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        classes (name, section),
        class_subjects (
          teacher_id,
          subjects (name)
        )
      `)
      .eq('day_of_week', day_of_week)
      .eq('slot_id', slot_id)

    const teacherConflict = (teacherConflicts || []).find(tc => {
      const tcCs = Array.isArray(tc.class_subjects) ? tc.class_subjects[0] : tc.class_subjects
      return tcCs?.teacher_id === teacherId
    })

    if (teacherConflict && !force) {
      const tcCs = Array.isArray(teacherConflict.class_subjects) ? teacherConflict.class_subjects[0] : teacherConflict.class_subjects
      const tcSub = tcCs ? (Array.isArray(tcCs.subjects) ? tcCs.subjects[0] : tcCs.subjects) : null
      const tcCls = Array.isArray(teacherConflict.classes) ? teacherConflict.classes[0] : teacherConflict.classes
      const conflictClassName = tcCls ? `${tcCls.name} ${tcCls.section || ''}`.trim() : 'Another class'
      const conflictSubject = tcSub?.name || 'lesson'
      return NextResponse.json({
        conflict: true,
        type: 'teacher',
        message: `Teacher conflict: ${teacherName} is already teaching ${conflictSubject} in ${conflictClassName} at this time on ${day_of_week}.`
      }, { status: 409 })
    }

    // If we have conflicts and "force" is true, clear the conflicting entries first
    if (force) {
      if (classConflict) {
        await supabase.from('timetable_entries').delete().eq('id', classConflict.id)
      }
      if (teacherConflict) {
        await supabase.from('timetable_entries').delete().eq('id', teacherConflict.id)
      }
    }

    // Insert or update entries
    const { data: entry, error: insertError } = await supabase
      .from('timetable_entries')
      .insert({
        class_id,
        class_subject_id,
        day_of_week,
        slot_id,
        room: room || null
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, entry })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth & Admin Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    const isAdmin = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Dean', 'HOS'].includes(r))
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
