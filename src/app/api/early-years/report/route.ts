import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEarlyYearsReportPdf, EYObservation, EYReportOptions } from '@/lib/earlyYearsReportPdf'
import { fetchImageBuffer } from '@/lib/reportCardPdf'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    const term_id = searchParams.get('term_id')

    if (!student_id || !term_id) {
      return NextResponse.json({ error: 'Missing required parameters: student_id and term_id are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch User Profiles and Roles
    const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    // 3. Fetch Student
    const { data: student, error: studentErr } = await supabase
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
      .eq('id', student_id)
      .maybeSingle()

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    const classId = student.class_id

    // 4. Access Control Checks
    const isOwner = user.id === student_id
    
    // Check if Parent linked to student
    let isParent = false
    if (userRoles.includes('Parent')) {
      const { data: parentLink } = await supabase
        .from('student_parents')
        .select('id')
        .eq('student_id', student_id)
        .eq('parent_id', user.id)
        .maybeSingle()
      if (parentLink) isParent = true
    }

    const isManagement = userRoles.includes('System Admin') ||
                         userRoles.includes('Principal') ||
                         userRoles.includes('Dean') ||
                         userRoles.includes('HOS') ||
                         userRoles.includes('Director')

    let isAssignedTeacher = false
    if (userRoles.includes('Teacher') && classId) {
      const { data: homeroomClass } = await supabase
        .from('classes')
        .select('id')
        .eq('id', classId)
        .eq('class_teacher_id', user.id)
        .maybeSingle()

      if (homeroomClass) {
        isAssignedTeacher = true
      } else {
        const { data: classAssignment } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('class_id', classId)
          .eq('teacher_id', user.id)
          .limit(1)
          .maybeSingle()
        if (classAssignment) isAssignedTeacher = true
      }
    }

    const hasAccess = isOwner || isParent || isManagement || isAssignedTeacher
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view this report card' }, { status: 403 })
    }

    // 5. Fetch Class Info
    const { data: classInfo } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId || '')
      .maybeSingle()

    // 6. Fetch Term Info
    const { data: term } = await supabase
      .from('terms')
      .select('*')
      .eq('id', term_id)
      .maybeSingle()

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    // 7. Fetch Observations
    const { data: rawObservations } = await supabase
      .from('learning_area_progress')
      .select('*')
      .eq('student_id', student_id)
      .eq('term_id', term_id)

    const observations = rawObservations || []
    
    // Process observations: Prefer is_final, otherwise deduplicate by learning_area keeping latest
    const finalObsMap = new Map<string, EYObservation>()
    
    // First pass: look for is_final = true
    observations.forEach(o => {
      if (o.is_final) {
        finalObsMap.set(o.learning_area.toLowerCase(), {
          learning_area: o.learning_area,
          achievement_level: o.achievement_level,
          teacher_observation: o.teacher_observation,
          next_steps: o.next_steps,
          age_band: o.age_band,
          characteristics: o.characteristics || [],
          evidence_url: o.evidence_url,
          is_final: o.is_final,
          created_at: o.created_at
        })
      }
    })

    // Second pass: fill in gaps with latest non-final ones
    observations.forEach(o => {
      const key = o.learning_area.toLowerCase()
      if (!finalObsMap.has(key)) {
        finalObsMap.set(key, {
          learning_area: o.learning_area,
          achievement_level: o.achievement_level,
          teacher_observation: o.teacher_observation,
          next_steps: o.next_steps,
          age_band: o.age_band,
          characteristics: o.characteristics || [],
          evidence_url: o.evidence_url,
          is_final: o.is_final,
          created_at: o.created_at
        })
      }
    })

    const processedObservations = Array.from(finalObsMap.values())

    // 8. Fetch evidence images up to 6
    const evidenceBuffers: { area: string; buffer: Buffer }[] = []
    const observationsWithEvidence = processedObservations.filter(o => o.evidence_url)
    
    for (const obs of observationsWithEvidence.slice(0, 6)) {
      if (obs.evidence_url) {
        const buffer = await fetchImageBuffer(obs.evidence_url)
        if (buffer) {
          evidenceBuffers.push({
            area: obs.learning_area,
            buffer
          })
        }
      }
    }

    // 9. Fetch Class Teacher Name
    let classTeacherName = 'Class Teacher'
    if (classInfo?.class_teacher_id) {
      const { data: ctProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', classInfo.class_teacher_id)
        .maybeSingle()
      if (ctProfile) {
        classTeacherName = `${ctProfile.first_name} ${ctProfile.last_name}`
      }
    }

    // 10. Fetch Principal & Head of Early Years
    let principalName = 'Principal'
    let headName = 'Head of Early Years'

    const { data: staffList } = await supabase
      .from('profiles')
      .select('first_name, last_name, roles, role')
      .or('role.ilike.%principal%,role.ilike.%head%,roles.cs.{"Principal"},roles.cs.{"HOS"}')

    if (staffList) {
      const principal = staffList.find(s => 
        (s.roles && s.roles.includes('Principal')) || 
        (s.role && s.role.toLowerCase().includes('principal'))
      )
      if (principal) {
        principalName = `${principal.first_name} ${principal.last_name}`
      }

      const head = staffList.find(s => 
        (s.roles && s.roles.includes('HOS')) || 
        (s.role && s.role.toLowerCase().includes('head'))
      )
      if (head) {
        headName = `${head.first_name} ${head.last_name}`
      }
    }

    // 11. Fetch School Settings
    const { data: schoolNameSett } = await supabase.from('system_settings').select('value').eq('key', 'school_name').maybeSingle()
    const { data: schoolMottoSett } = await supabase.from('system_settings').select('value').eq('key', 'school_motto').maybeSingle()
    const { data: schoolAddressSett } = await supabase.from('system_settings').select('value').eq('key', 'school_address').maybeSingle()

    // 12. Fetch attendance
    const { count: presentCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student_id)
      .eq('status', 'Present')

    const { count: totalAttendance } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student_id)

    // Build Report Options
    const studentProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
    const reportOpts: EYReportOptions = {
      student: {
        id: student.id,
        student_id: student.student_id,
        first_name: studentProfile?.first_name || '',
        last_name: studentProfile?.last_name || '',
        grade_level: student.grade_level,
        section: student.section || undefined,
        dob: student.dob || undefined,
        gender: student.gender || undefined,
        language_at_home: student.language_at_home || undefined,
        medical_info: student.medical_info || undefined,
        allergies: student.allergies || undefined,
        previous_school: student.previous_school || undefined,
        emergency_contact: student.emergency_contact || undefined
      },
      term: {
        id: term.id,
        term_name: term.term_name,
        academic_year: term.academic_year
      },
      classInfo: {
        name: classInfo?.name || student.grade_level,
        section: classInfo?.section || student.section || undefined,
        age_group: classInfo?.age_group || undefined
      },
      observations: processedObservations,
      attendance: {
        present: presentCount || 0,
        total: totalAttendance || 0
      },
      comments: {
        classTeacher: '', // filled dynamically in template characteristics
        principal: '', // default fallback used in drawing library
        head: ''
      },
      names: {
        classTeacher: classTeacherName,
        head: headName,
        principal: principalName
      },
      schoolName: (schoolNameSett?.value as string) || undefined,
      schoolMotto: (schoolMottoSett?.value as string) || undefined,
      schoolAddress: (schoolAddressSett?.value as string) || undefined,
      evidenceBuffers
    }

    // Generate PDF
    const pdfBuffer = await generateEarlyYearsReportPdf(reportOpts)

    const cleanFirstName = (studentProfile?.first_name || 'Student').replace(/[^a-zA-Z0-9]/g, '')
    const cleanLastName = (studentProfile?.last_name || 'Report').replace(/[^a-zA-Z0-9]/g, '')
    const cleanTerm = term.term_name.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `EYFS_Report_${cleanFirstName}_${cleanLastName}_${cleanTerm}.pdf`

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    console.error('EYFS PDF generation error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
