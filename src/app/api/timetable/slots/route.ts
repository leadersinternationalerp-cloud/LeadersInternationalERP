import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { parseTimetableConfig } from '@/lib/timetableAiParser'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const class_id = searchParams.get('class_id')

    const supabase = await createClient()

    // Retrieve slots
    let query = supabase.from('timetable_slots').select('*').order('period_number', { ascending: true }).order('start_time', { ascending: true })
    
    if (class_id) {
      query = query.eq('class_id', class_id)
    } else {
      query = query.is('class_id', null)
    }

    const { data: slots, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If specific class requested but empty, fallback to global slots
    if (class_id && (!slots || slots.length === 0)) {
      const { data: globalSlots } = await supabase
        .from('timetable_slots')
        .select('*')
        .is('class_id', null)
        .order('period_number', { ascending: true })
        .order('start_time', { ascending: true })
      
      return NextResponse.json({ slots: globalSlots || [] })
    }

    return NextResponse.json({ slots: slots || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { class_id, text, slots: manualSlots, total_periods } = body

    let finalSlots = []

    if (text) {
      // Natural language input
      finalSlots = parseTimetableConfig(text, total_periods || 8)
    } else if (manualSlots && Array.isArray(manualSlots)) {
      finalSlots = manualSlots
    } else {
      return NextResponse.json({ error: 'Missing config text or slots array' }, { status: 400 })
    }

    // Clear existing slots for target configuration
    if (class_id) {
      await supabase.from('timetable_slots').delete().eq('class_id', class_id)
    } else {
      await supabase.from('timetable_slots').delete().is('class_id', null)
    }

    // Insert new slots
    const slotsToInsert = finalSlots.map(s => ({
      class_id: class_id || null,
      period_number: s.period_number,
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      is_break: s.is_break
    }))

    const { data: insertedSlots, error: insertError } = await supabase
      .from('timetable_slots')
      .insert(slotsToInsert)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, slots: insertedSlots })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
