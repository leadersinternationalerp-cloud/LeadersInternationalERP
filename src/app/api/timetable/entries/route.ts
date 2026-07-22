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
    const { action, class_id } = body

    // AUTO-GENERATE TIMETABLE ALGORITHM
    if (action === 'generate') {
      if (!class_id) {
        return NextResponse.json({ error: 'Missing class_id for timetable generation' }, { status: 400 })
      }

      // 1. Fetch Slots (target class slots or fallback to school default slots)
      let slotQuery = supabase.from('timetable_slots').select('*').order('period_number', { ascending: true })
      let { data: slots, error: slotErr } = await slotQuery.eq('class_id', class_id)
      if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 })

      if (!slots || slots.length === 0) {
        const { data: globalSlots } = await supabase
          .from('timetable_slots')
          .select('*')
          .is('class_id', null)
          .order('period_number', { ascending: true })
        slots = globalSlots || []
      }

      if (!slots || slots.length === 0) {
        return NextResponse.json({ error: 'No period slots configured. Generate time slots first.' }, { status: 400 })
      }

      // 2. Fetch subject allocations for this class
      const { data: allocations, error: allocErr } = await supabase
        .from('class_subjects')
        .select('id, teacher_id, periods_per_week, profiles(first_name, last_name), subjects(name)')
        .eq('class_id', class_id)

      if (allocErr) return NextResponse.json({ error: allocErr.message }, { status: 500 })
      if (!allocations || allocations.length === 0) {
        return NextResponse.json({ error: 'No subject allocations found for this class. Assign teachers to subjects first.' }, { status: 400 })
      }

      // 3. Fetch all existing entries across the school (to prevent teacher double bookings)
      const { data: allEntries, error: entriesErr } = await supabase
        .from('timetable_entries')
        .select(`
          id,
          class_id,
          day_of_week,
          slot_id,
          class_subjects (
            teacher_id
          )
        `)

      if (entriesErr) return NextResponse.json({ error: entriesErr.message }, { status: 500 })

      // Clear previous timetable entries for this class
      await supabase.from('timetable_entries').delete().eq('class_id', class_id)

      // Active entries list (excluding the ones we just deleted)
      const activeOtherEntries = (allEntries || []).filter(e => e.class_id !== class_id)

      // Build period checklist: repeat allocation ID based on target periods_per_week
      const lessonPool: { id: string; teacher_id: string }[] = []
      allocations.forEach(alloc => {
        const periods = alloc.periods_per_week || 4
        for (let p = 0; p < periods; p++) {
          lessonPool.push({ id: alloc.id, teacher_id: alloc.teacher_id })
        }
      })

      // We schedule lessons across Days and Slots
      const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      const nonBreakSlots = slots.filter(s => !s.is_break)

      const newlyScheduledEntries = []
      
      // Tracking daily subject distribution to avoid scheduling the same subject multiple times in a single day
      const dailyAllocationCounts: Record<string, Record<string, number>> = {} // { day: { allocId: count } }
      DAYS.forEach(d => { dailyAllocationCounts[d] = {} })

      // Try to assign lessons to slots day by day, period by period
      for (const day of DAYS) {
        for (const slot of nonBreakSlots) {
          if (lessonPool.length === 0) break

          // Try to find a lesson that has no teacher conflict at this day + slot, prioritizing the one with lower daily count
          let selectedIdx = -1

          // First pass: Respect daily limits (max 1 or 2 per day if possible) and check teacher availability
          for (let idx = 0; idx < lessonPool.length; idx++) {
            const lesson = lessonPool[idx]
            const teacherId = lesson.teacher_id

            // Check if teacher is already booked in another class at this slot + day
            const hasTeacherConflict = activeOtherEntries.some(e => {
              const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
              return e.day_of_week.toLowerCase() === day.toLowerCase() &&
                     e.slot_id === slot.id &&
                     cs?.teacher_id === teacherId
            })

            if (!hasTeacherConflict) {
              const dailyCount = dailyAllocationCounts[day][lesson.id] || 0
              // Prefer subjects not yet taught today
              if (dailyCount === 0) {
                selectedIdx = idx
                break
              }
            }
          }

          // Second pass: Relax daily count limit if needed (allow double periods), but still enforce absolute teacher conflict
          if (selectedIdx === -1) {
            for (let idx = 0; idx < lessonPool.length; idx++) {
              const lesson = lessonPool[idx]
              const teacherId = lesson.teacher_id

              const hasTeacherConflict = activeOtherEntries.some(e => {
                const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
                return e.day_of_week.toLowerCase() === day.toLowerCase() &&
                       e.slot_id === slot.id &&
                       cs?.teacher_id === teacherId
              })

              if (!hasTeacherConflict) {
                selectedIdx = idx
                break
              }
            }
          }

          if (selectedIdx !== -1) {
            const scheduledLesson = lessonPool.splice(selectedIdx, 1)[0]
            
            // Record scheduling
            newlyScheduledEntries.push({
              class_id,
              class_subject_id: scheduledLesson.id,
              day_of_week: day,
              slot_id: slot.id
            })

            dailyAllocationCounts[day][scheduledLesson.id] = (dailyAllocationCounts[day][scheduledLesson.id] || 0) + 1
          }
        }
      }

      // Bulk insert generated entries
      if (newlyScheduledEntries.length > 0) {
        const { error: bulkInsertErr } = await supabase
          .from('timetable_entries')
          .insert(newlyScheduledEntries)

        if (bulkInsertErr) {
          return NextResponse.json({ error: bulkInsertErr.message }, { status: 500 })
        }
      }

      const unscheduledCount = lessonPool.length
      return NextResponse.json({
        success: true,
        unscheduledCount,
        message: `Timetable auto-generated successfully! Scheduled ${newlyScheduledEntries.length} periods.${unscheduledCount > 0 ? ` ${unscheduledCount} periods could not be scheduled due to teacher conflicts.` : ''}`
      })
    }

    // MANUALLY SCHEDULE SINGLE CELL
    const { class_subject_id, day_of_week, slot_id, room, force } = body

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

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth & Admin check
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
    const { allocations } = body // Expects Array of { id: string, periods_per_week: number }

    if (!allocations || !Array.isArray(allocations)) {
      return NextResponse.json({ error: 'Missing allocations array' }, { status: 400 })
    }

    // Perform bulk updates sequentially
    for (const alloc of allocations) {
      await supabase
        .from('class_subjects')
        .update({ periods_per_week: Number(alloc.periods_per_week) })
        .eq('id', alloc.id)
    }

    return NextResponse.json({ success: true })
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
