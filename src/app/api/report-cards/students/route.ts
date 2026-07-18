import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const class_id = searchParams.get('class_id')

  if (!class_id) {
    return NextResponse.json({ error: 'Missing class_id' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Verify Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  const isStaff = userRoles.includes('System Admin') ||
                  userRoles.includes('Principal') ||
                  userRoles.includes('Dean') ||
                  userRoles.includes('HOS') ||
                  userRoles.includes('Teacher')

  if (!isStaff) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 })
  }

  // 2. If Teacher alone, verify assignment
  if (userRoles.includes('Teacher') && !userRoles.includes('System Admin') && !userRoles.includes('Principal') && !userRoles.includes('Dean') && !userRoles.includes('HOS')) {
    const { data: assignment } = await supabase
      .from('class_subjects')
      .select('id')
      .eq('class_id', class_id)
      .eq('teacher_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: 'Forbidden: You are not assigned to this class' }, { status: 403 })
    }
  }

  // 3. Fetch Class Info
  const { data: classInfo } = await supabase
    .from('classes')
    .select('*')
    .eq('id', class_id)
    .single()

  if (!classInfo) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  // 4. Fetch Students in Class (using class_id first, fallback to name+section if class_id mismatch)
  let students = []
  const { data: directStudents } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      grade_level,
      section,
      class_id,
      profiles (first_name, last_name, email)
    `)
    .eq('class_id', class_id)

  students = directStudents || []

  if (students.length === 0) {
    // Try fallback
    const { data: fallbackStudents } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        grade_level,
        section,
        class_id,
        profiles (first_name, last_name, email)
      `)
      .eq('grade_level', classInfo.name)
      .eq('section', classInfo.section || null)

    students = fallbackStudents || []
  }

  const mappedStudents = students.map((s: any) => {
    const profs = s.profiles
    const singleProfile = Array.isArray(profs) ? profs[0] : profs
    return {
      id: s.id,
      student_id: s.student_id,
      grade_level: s.grade_level,
      section: s.section,
      photo_url: `/api/students/photo?student_id=${s.id}`,
      class_id: s.class_id,
      profiles: singleProfile ? {
        first_name: singleProfile.first_name,
        last_name: singleProfile.last_name,
        email: singleProfile.email
      } : undefined
    }
  })

  return NextResponse.json({
    classInfo: classInfo ? {
      ...classInfo,
      class_name: classInfo.class_name || classInfo.name
    } : null,
    students: mappedStudents
  })
}
