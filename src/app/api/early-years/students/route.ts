import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
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

    // 2. Fetch User profile and roles
    const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    const isStaff = userRoles.includes('System Admin') ||
                    userRoles.includes('Principal') ||
                    userRoles.includes('Dean') ||
                    userRoles.includes('HOS') ||
                    userRoles.includes('Teacher') ||
                    userRoles.includes('Director')

    if (!isStaff) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 })
    }

    // 3. If Teacher, verify homeroom or class_subjects assignment
    if (userRoles.includes('Teacher') && 
        !userRoles.includes('System Admin') && 
        !userRoles.includes('Principal') && 
        !userRoles.includes('Dean') && 
        !userRoles.includes('HOS') &&
        !userRoles.includes('Director')) {
      
      const { data: homeroomClass } = await supabase
        .from('classes')
        .select('id')
        .eq('id', class_id)
        .eq('class_teacher_id', user.id)
        .maybeSingle()

      if (!homeroomClass) {
        const { data: assignment } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('class_id', class_id)
          .eq('teacher_id', user.id)
          .limit(1)
          .maybeSingle()

        if (!assignment) {
          return NextResponse.json({ error: 'Forbidden: You are not assigned to this class as homeroom or subject teacher.' }, { status: 403 })
        }
      }
    }

    // 4. Fetch Class Info
    const { data: classInfo } = await supabase
      .from('classes')
      .select('*')
      .eq('id', class_id)
      .single()

    if (!classInfo) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // 5. Fetch Students in Class
    let students = []
    const { data: directStudents } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        grade_level,
        section,
        class_id,
        dob,
        gender,
        medical_info,
        allergies,
        language_at_home,
        previous_school,
        emergency_contact,
        profiles (first_name, last_name, email)
      `)
      .eq('class_id', class_id)

    students = directStudents || []

    if (students.length === 0) {
      // Fallback
      const { data: fallbackStudents } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          grade_level,
          section,
          class_id,
          dob,
          gender,
          medical_info,
          allergies,
          language_at_home,
          previous_school,
          emergency_contact,
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
        dob: s.dob,
        gender: s.gender,
        medical_info: s.medical_info,
        allergies: s.allergies,
        language_at_home: s.language_at_home,
        previous_school: s.previous_school,
        emergency_contact: s.emergency_contact,
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
  } catch (error: any) {
    console.error('Fetch early years students error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
