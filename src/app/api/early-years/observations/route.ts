import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    const term_id = searchParams.get('term_id')
    const class_id = searchParams.get('class_id')

    const supabase = await createClient()

    // Auth verification
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('learning_area_progress')
      .select(`
        id,
        student_id,
        term_id,
        class_id,
        learning_area,
        achievement_level,
        teacher_observation,
        next_steps,
        age_band,
        characteristics,
        evidence_url,
        is_final,
        created_at
      `)

    if (student_id) {
      query = query.eq('student_id', student_id)
    }
    if (term_id) {
      query = query.eq('term_id', term_id)
    }
    if (class_id) {
      query = query.eq('class_id', class_id)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Fetch observations error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Role verification
    const { data: roleData } = await supabase.rpc('get_user_role', { user_id: user.id })
    const userRole = (roleData || '').toString()

    const ALLOWED_ROLES = ['Teacher', 'Principal', 'Dean', 'HOS', 'System Admin', 'Director']
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    // 3. Parse Request Body
    const body = await request.json()
    const {
      id,
      student_id,
      term_id,
      class_id,
      learning_area,
      achievement_level,
      teacher_observation,
      next_steps,
      age_band,
      characteristics,
      evidence_url,
      is_final
    } = body

    if (!student_id || !term_id || !learning_area || !achievement_level || !teacher_observation) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 4. Direct update if id is provided
    if (id) {
      const { error: updateErr } = await supabase
        .from('learning_area_progress')
        .update({
          class_id: class_id || null,
          learning_area,
          achievement_level,
          teacher_observation,
          next_steps: next_steps || '',
          age_band: age_band || '',
          characteristics: characteristics || [],
          evidence_url: evidence_url || null,
          is_final: Boolean(is_final),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateErr) throw updateErr
      return NextResponse.json({ success: true })
    }

    // 4. Upsert/Insert logic to prevent duplicate final observations per student/term/area
    if (is_final) {
      const { data: existing } = await supabase
        .from('learning_area_progress')
        .select('id')
        .eq('student_id', student_id)
        .eq('term_id', term_id)
        .eq('learning_area', learning_area)
        .eq('is_final', true)
        .maybeSingle()

      if (existing) {
        const { error: updateErr } = await supabase
          .from('learning_area_progress')
          .update({
            class_id: class_id || null,
            achievement_level,
            teacher_observation,
            next_steps: next_steps || '',
            age_band: age_band || '',
            characteristics: characteristics || [],
            evidence_url: evidence_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('learning_area_progress')
          .insert({
            student_id,
            term_id,
            class_id: class_id || null,
            learning_area,
            achievement_level,
            teacher_observation,
            next_steps: next_steps || '',
            age_band: age_band || '',
            characteristics: characteristics || [],
            evidence_url: evidence_url || null,
            is_final: true
          })

        if (insertErr) throw insertErr
      }
    } else {
      const { error: insertErr } = await supabase
        .from('learning_area_progress')
        .insert({
          student_id,
          term_id,
          class_id: class_id || null,
          learning_area,
          achievement_level,
          teacher_observation,
          next_steps: next_steps || '',
          age_band: age_band || '',
          characteristics: characteristics || [],
          evidence_url: evidence_url || null,
          is_final: false
        })

      if (insertErr) throw insertErr
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save observation error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing observation id' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Role verification
    const { data: roleData } = await supabase.rpc('get_user_role', { user_id: user.id })
    const userRole = (roleData || '').toString()

    const ALLOWED_ROLES = ['Teacher', 'Principal', 'Dean', 'HOS', 'System Admin', 'Director']
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    // 3. Perform delete
    const { error } = await supabase
      .from('learning_area_progress')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete observation error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
