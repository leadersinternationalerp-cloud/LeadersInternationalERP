import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const id = searchParams.get('id')

  if (!code && !id) {
    return NextResponse.json({ error: 'Missing code or id search parameter' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase.from('students').select('id, student_id, grade_level, section')
  
  if (id) {
    query = query.eq('id', id)
  } else if (code) {
    query = query.eq('student_id', code)
  }

  const { data: student, error } = await query.maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  return NextResponse.json({ student })
}
