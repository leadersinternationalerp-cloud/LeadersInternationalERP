import { createClient } from '@/utils/supabase/server'
import { generateEarlyYearsReportPdf, EYObservation, EYReportOptions } from '@/lib/earlyYearsReportPdf'
import { fetchImageBuffer } from '@/lib/reportCardPdf'
import { route } from '@/lib/api/handler'
import { MANAGEMENT_ROLES, normalizeRoles } from '@/lib/auth/roles'
import { assertStudentInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const rawStudentId = searchParams.get('student_id')
    const term_id = searchParams.get('term_id')

    if (!rawStudentId || !term_id) {
      throw badRequest({
        fields: 'Missing required parameters: student_id and term_id are required',
      })
    }

    const studentIds = rawStudentId
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (studentIds.length === 0) {
      throw badRequest({ student_id: 'No valid student IDs provided' })
    }

    if (studentIds.length > 40) {
      throw badRequest({ student_id: 'Cannot request more than 40 student reports at once' })
    }

    // Verify scope for each student requested
    for (const sId of studentIds) {
      await assertStudentInScope(user, sId)
    }

    const supabase = await createClient()

    // 1. Fetch Term Info
    const { data: term } = await supabase.from('terms').select('*').eq('id', term_id).maybeSingle()

    if (!term) {
      throw new ApiError('NOT_FOUND', 'Term not found')
    }

    // Fetch School Settings
    const { data: schoolNameSett } = await supabase.from('system_settings').select('value').eq('key', 'school_name').maybeSingle()
    const { data: schoolMottoSett } = await supabase.from('system_settings').select('value').eq('key', 'school_motto').maybeSingle()
    const { data: schoolAddressSett } = await supabase.from('system_settings').select('value').eq('key', 'school_address').maybeSingle()

    let principalName = 'Principal'
    let headName = 'Head of Early Years'

    const { data: staffList } = await supabase.from('profiles').select('first_name, last_name, role, roles')
    if (staffList) {
      const princ = staffList.find((s: { role?: string; roles?: string[] }) =>
        normalizeRoles(s).includes('Principal')
      )
      if (princ) principalName = `${princ.first_name || ''} ${princ.last_name || ''}`.trim()

      const head = staffList.find((s: { role?: string; roles?: string[] }) =>
        normalizeRoles(s).includes('Head of Section')
      )
      if (head) headName = `${head.first_name || ''} ${head.last_name || ''}`.trim()
    }

    const reportOptsList: EYReportOptions[] = []

    for (const studentId of studentIds) {
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          grade_level,
          class_id,
          classes:class_id (
            name,
            class_teacher_id,
            profiles:class_teacher_id (first_name, last_name)
          ),
          profiles:id (
            first_name,
            last_name,
            gender,
            dob
          )
        `)
        .eq('id', studentId)
        .maybeSingle()

      if (studentErr || !student) continue

      const sProf = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
      const cls = Array.isArray(student.classes) ? student.classes[0] : student.classes
      const _teacherProf = cls?.profiles ? (Array.isArray(cls.profiles) ? cls.profiles[0] : cls.profiles) : null

      const { data: photoData } = await supabase
        .from('student_photos')
        .select('photo_url')
        .eq('student_id', studentId)
        .maybeSingle()

      let _studentPhotoBuffer: Buffer | null = null
      if (photoData?.photo_url) {
        _studentPhotoBuffer = await fetchImageBuffer(photoData.photo_url)
      }

      const { data: rawObs } = await supabase
        .from('learning_area_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('term_id', term_id)
        .eq('is_final', true)

      const observations: EYObservation[] = (rawObs || []).map((o: {
        id: string
        learning_area: string
        achievement_level: 'Emerging' | 'Developing' | 'Developed' | 'Exceeding'
        teacher_observation?: string
        next_steps?: string
        age_band?: string
        characteristics?: string[]
        evidence_url?: string | null
      }) => ({
        id: o.id,
        learning_area: o.learning_area,
        achievement_level: o.achievement_level,
        teacher_observation: o.teacher_observation || '',
        next_steps: o.next_steps || '',
        age_band: o.age_band || '',
        characteristics: Array.isArray(o.characteristics) ? o.characteristics : [],
        evidence_url: o.evidence_url ?? undefined,
      }))

      const { data: attData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)

      let totalDays = 0
      let daysPresent = 0
      if (attData) {
        totalDays = attData.length
        daysPresent = attData.filter((a: { status?: string }) => a.status === 'Present').length
      }

      reportOptsList.push({
        student: {
          id: student.id,
          student_id: student.student_id || '',
          first_name: sProf?.first_name || '',
          last_name: sProf?.last_name || '',
          gender: sProf?.gender,
          dob: sProf?.dob,
          grade_level: student.grade_level,
          
        },
        term: {
          id: term.id,
          term_name: term.name || term.term_name || 'Term',
          academic_year: term.academic_year || new Date().getFullYear().toString(),
        },
        classInfo: { name: cls?.name || 'Early Years' },
        observations,
        attendance: totalDays > 0 ? { total: totalDays, present: daysPresent } : undefined,
        schoolName: schoolNameSett?.value,
        schoolMotto: schoolMottoSett?.value,
        schoolAddress: schoolAddressSett?.value,
        names: {
          principal: principalName,
          head: headName,
        },
      })
    }

    if (reportOptsList.length === 0) {
      throw new ApiError('NOT_FOUND', 'No report data available for the selected student(s)')
    }

    const pdfBuffer = await generateEarlyYearsReportPdf(reportOptsList)
    const isDownload = searchParams.get('download') === 'true'
    const disposition = isDownload ? 'attachment' : 'inline'

    const cleanFirstName =
      studentIds.length === 1
        ? (reportOptsList[0].student.first_name || 'Student').replace(/[^a-zA-Z0-9]/g, '')
        : 'Bulk_Class'
    const cleanTerm = (term.name || term.term_name || 'Term').replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `EYFS_Report_${cleanFirstName}_${cleanTerm}.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
        'X-Request-Id': requestId,
      },
    })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher', 'Student', 'Parent'] }
)
