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

    // 3. Fetch Class Info first to verify if it is an Early Years class
    const { data: classInfo } = await supabase
      .from('classes')
      .select('*')
      .eq('id', class_id)
      .single()

    if (!classInfo) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const isEarlyYears = Boolean(classInfo.is_early_years) ||
      ['baby', 'nursery', 'reception', 'kg', 'playgroup', 'pre-primary'].some(ey => (classInfo.name || '').toLowerCase().includes(ey))

    // If non-Early-Years class and standard Teacher, verify homeroom or class_subjects assignment
    if (!isEarlyYears &&
        userRoles.includes('Teacher') && 
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
          return NextResponse.json({ error: 'Forbidden: You are not assigned to this class.' }, { status: 403 })
        }
      }
    }

    // 4. Fetch Students in Class (Direct class_id match first)
    let students: any[] = []
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
      // Fallback 1: Match by exact grade_level == classInfo.name
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

      students = fallbackStudents || []
    }

    if (students.length === 0) {
      // Fallback 2: Fuzzy match by clean class name
      const cleanClassName = (classInfo.name || '').replace(/\s+[A-Z]$/i, '').trim()
      if (cleanClassName) {
        const { data: fuzzyStudents } = await supabase
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
          .ilike('grade_level', `%${cleanClassName}%`)

        students = fuzzyStudents || []
      }
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
