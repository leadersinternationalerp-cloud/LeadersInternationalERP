import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEarlyYearsReportPdf, EYObservation, EYReportOptions } from '@/lib/earlyYearsReportPdf'
import { fetchImageBuffer } from '@/lib/reportCardPdf'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawStudentId = searchParams.get('student_id')
    const term_id = searchParams.get('term_id')

    if (!rawStudentId || !term_id) {
      return NextResponse.json({ error: 'Missing required parameters: student_id and term_id are required' }, { status: 400 })
    }

    const studentIds = rawStudentId.split(',').map(s => s.trim()).filter(Boolean)
    if (studentIds.length === 0) {
      return NextResponse.json({ error: 'No valid student IDs provided' }, { status: 400 })
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

    const isManagement = userRoles.includes('System Admin') ||
                         userRoles.includes('Principal') ||
                         userRoles.includes('Dean') ||
                         userRoles.includes('HOS') ||
                         userRoles.includes('Director') ||
                         userRoles.includes('Teacher')

    // 3. Fetch Term Info once
    const { data: term } = await supabase
      .from('terms')
      .select('*')
      .eq('id', term_id)
      .maybeSingle()

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    // Fetch School Settings
    const { data: schoolNameSett } = await supabase.from('system_settings').select('value').eq('key', 'school_name').maybeSingle()
    const { data: schoolMottoSett } = await supabase.from('system_settings').select('value').eq('key', 'school_motto').maybeSingle()
    const { data: schoolAddressSett } = await supabase.from('system_settings').select('value').eq('key', 'school_address').maybeSingle()

    // Fetch Staff for signatures
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
      if (principal) principalName = `${principal.first_name} ${principal.last_name}`

      const head = staffList.find(s => 
        (s.roles && s.roles.includes('HOS')) || 
        (s.role && s.role.toLowerCase().includes('head'))
      )
      if (head) headName = `${head.first_name} ${head.last_name}`
    }

    const reportOptsList: EYReportOptions[] = []

    for (const student_id of studentIds) {
      // Fetch Student
      const { data: student } = await supabase
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

      if (!student) continue

      const classId = student.class_id

      // Access Control
      const isOwner = user.id === student_id
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

      if (!isManagement && !isOwner && !isParent) continue

      // Fetch Class Info
      const { data: classInfo } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId || '')
        .maybeSingle()

      // Fetch Observations
      const { data: rawObservations } = await supabase
        .from('learning_area_progress')
        .select('*')
        .eq('student_id', student_id)
        .eq('term_id', term_id)

      const observations = rawObservations || []
      
      // Process observations
      const finalObsMap = new Map<string, EYObservation>()
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

      // Evidence photos up to 6
      const evidenceBuffers: { area: string; buffer: Buffer }[] = []
      const obsWithEvidence = processedObservations.filter(o => o.evidence_url)
      for (const obs of obsWithEvidence.slice(0, 6)) {
        if (obs.evidence_url) {
          const buffer = await fetchImageBuffer(obs.evidence_url)
          if (buffer) {
            evidenceBuffers.push({ area: obs.learning_area, buffer })
          }
        }
      }

      // Class Teacher Name
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

      // Attendance
      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student_id)
        .eq('status', 'Present')

      const { count: totalAttendance } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student_id)

      const studentProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles

      reportOptsList.push({
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
          term_name: term.term_name || term.name || 'Term',
          academic_year: term.academic_year || ''
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
          classTeacher: '',
          principal: '',
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
      })
    }

    if (reportOptsList.length === 0) {
      return NextResponse.json({ error: 'No report data available for the selected student(s)' }, { status: 400 })
    }

    // Generate PDF
    const pdfBuffer = await generateEarlyYearsReportPdf(reportOptsList)

    const isDownload = searchParams.get('download') === 'true'
    const disposition = isDownload ? 'attachment' : 'inline'

    const cleanFirstName = studentIds.length === 1 
      ? (reportOptsList[0].student.first_name || 'Student').replace(/[^a-zA-Z0-9]/g, '')
      : 'Bulk_Class'
    const cleanTerm = (term.term_name || 'Term').replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `EYFS_Report_${cleanFirstName}_${cleanTerm}.pdf`

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error: any) {
    console.error('EYFS PDF generation error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
