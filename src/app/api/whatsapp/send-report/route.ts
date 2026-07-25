import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { WhatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { GET as getPrimaryReport } from '@/app/api/report-cards/download/route'
import { GET as getEarlyYearsReport } from '@/app/api/early-years/report/route'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user & check permission
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single()

    const roles = profile?.roles || []
    const allowedRoles = ['Teacher', 'System Admin', 'Director', 'Principal', 'Dean']
    const isAllowed = roles.some((r: string) => allowedRoles.includes(r))

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { studentId, termId, type, showRank = true } = body

    if (!studentId || !termId || !type) {
      return NextResponse.json({ error: 'Missing studentId, termId, or type' }, { status: 400 })
    }

    // Split student IDs to support bulk sending
    const studentIds = String(studentId).split(',').map(s => s.trim()).filter(Boolean)
    if (studentIds.length === 0) {
      return NextResponse.json({ error: 'No student IDs specified' }, { status: 400 })
    }

    const results = {
      total: studentIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // 3. Process each student
    for (const sId of studentIds) {
      try {
        // A. Fetch student and parent details
        const { data: student } = await supabase
          .from('students')
          .select(`
            id,
            profiles (first_name, last_name)
          `)
          .eq('id', sId)
          .single()

        if (!student || !student.profiles) {
          results.skipped++
          results.errors.push(`Student with ID ${sId} not found in database`)
          continue
        }

        const studentProfile: any = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
        const studentName = studentProfile 
          ? `${studentProfile.first_name} ${studentProfile.last_name}`.trim() 
          : 'Student'

        // Fetch parent details
        const { data: parents } = await supabase
          .from('student_parents')
          .select(`
            parent_id,
            profiles:parent_id (first_name, last_name, phone)
          `)
          .eq('student_id', sId)

        const parentProfile: any = parents?.[0]?.profiles
        if (!parentProfile || !parentProfile.phone) {
          results.skipped++
          results.errors.push(`Parent phone number not configured for ${studentName}`)
          continue
        }

        const parentPhone = parentProfile.phone.replace(/[+\s-]/g, '')
        const formattedPhone = parentPhone.startsWith('0') ? '255' + parentPhone.substring(1) : parentPhone
        const parentName = `${parentProfile.first_name} ${parentProfile.last_name}`

        // Fetch term name
        const { data: term } = await supabase
          .from('terms')
          .select('term_name')
          .eq('id', termId)
          .single()
        const termName = term?.term_name || 'Term'

        // B. Generate PDF internally by calling the GET handler
        let response: Response
        if (type === 'PRIMARY') {
          const downloadUrl = `http://localhost/api/report-cards/download?student_id=${sId}&term_id=${termId}&show_rank=${showRank}`
          response = await getPrimaryReport(new NextRequest(downloadUrl))
        } else if (type === 'EARLY_YEARS') {
          const downloadUrl = `http://localhost/api/early-years/report?student_id=${sId}&term_id=${termId}`
          response = await getEarlyYearsReport(new NextRequest(downloadUrl))
        } else {
          results.skipped++
          results.errors.push(`Unsupported report type: ${type}`)
          continue
        }

        if (!response.ok) {
          const errText = await response.text()
          results.failed++
          results.errors.push(`PDF generation failed for ${studentName}: ${errText}`)
          continue
        }

        const pdfBuffer = Buffer.from(await response.arrayBuffer())

        // C. Upload generated PDF buffer to Storage
        const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_')
        const cleanTerm = termName.replace(/[^a-zA-Z0-9]/g, '_')
        const fileName = `ReportCard_${cleanName}_${cleanTerm}_${sId}.pdf`

        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

        if (uploadError) {
          results.failed++
          results.errors.push(`Upload failed for ${studentName}: ${uploadError.message}`)
          continue
        }

        const { data } = supabase.storage.from('receipts').getPublicUrl(fileName)
        const pdfUrl = data.publicUrl

        // D. Send via Twilio WhatsApp
        const waMsg = `Dear ${parentName}, please find the official ${type === 'EARLY_YEARS' ? 'EYFS Progress Report' : 'Term Progress Report Card'} for ${studentName} (${termName}) attached here: ${pdfUrl}`
        const sendResult = await WhatsAppService.sendWhatsAppPDF(
          formattedPhone,
          `ReportCard_${cleanName}.pdf`,
          pdfUrl,
          waMsg
        )

        if (sendResult) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`Twilio delivery failed for parent of ${studentName}`)
        }

      } catch (err: any) {
        results.failed++
        results.errors.push(`Error processing ${sId}: ${err.message || err}`)
      }
    }

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[API Send Report ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
