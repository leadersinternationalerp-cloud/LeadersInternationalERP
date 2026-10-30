import { createClient } from '@/utils/supabase/server'
import { WhatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { route, ok, parseJson } from '@/lib/api/handler'
import { MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { assertStudentInScope } from '@/lib/api/scope'
import { badRequest } from '@/lib/api/errors'

export const POST = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const body = await parseJson<{
      studentId?: string | string[]
      termId?: string
      type?: 'PRIMARY' | 'EARLY_YEARS'
      showRank?: boolean
    }>(req)

    const { studentId, termId, type = 'PRIMARY', showRank = true } = body

    if (!studentId || !termId) {
      throw badRequest({ fields: 'Missing studentId or termId' })
    }

    const studentIds = (Array.isArray(studentId) ? studentId : String(studentId).split(','))
      .map((s) => s.trim())
      .filter(Boolean)

    if (studentIds.length === 0) {
      throw badRequest({ studentId: 'No student IDs specified' })
    }

    if (studentIds.length > 30) {
      throw badRequest({ studentId: 'Cannot bulk send WhatsApp reports to more than 30 students at once' })
    }

    for (const sId of studentIds) {
      await assertStudentInScope(user, sId)
    }

    const results = {
      total: studentIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const sId of studentIds) {
      try {
        const { data: student } = await supabase
          .from('students')
          .select(`
            id,
            profiles (first_name, last_name),
            student_parents (
              profiles (first_name, last_name, phone)
            )
          `)
          .eq('id', sId)
          .single()

        const sProf = Array.isArray(student?.profiles) ? student.profiles[0] : student?.profiles
        const studentName = sProf ? `${sProf.first_name} ${sProf.last_name}`.trim() : 'Student'

        const parents = student?.student_parents || []
        const primaryParentLink = parents[0]
        const pProf = primaryParentLink?.profiles
          ? Array.isArray(primaryParentLink.profiles)
            ? primaryParentLink.profiles[0]
            : primaryParentLink.profiles
          : null

        const rawPhone = pProf?.phone || ''
        const parentName = pProf ? `${pProf.first_name} ${pProf.last_name}`.trim() : 'Parent'

        if (!rawPhone) {
          results.skipped++
          results.errors.push(`No parent phone number registered for ${studentName}`)
          continue
        }

        const cleanNo = rawPhone.replace(/[+\s-]/g, '')
        const formattedPhone = cleanNo.startsWith('0') ? '255' + cleanNo.substring(1) : cleanNo

        const { data: term } = await supabase.from('terms').select('*').eq('id', termId).maybeSingle()
        const termName = term?.name || term?.term_name || 'Term'

        const origin = new URL(req.url).origin
        const endpoint =
          type === 'EARLY_YEARS'
            ? `${origin}/api/early-years/report?student_id=${sId}&term_id=${termId}&download=true`
            : `${origin}/api/report-cards/download?student_id=${sId}&term_id=${termId}&show_rank=${showRank}&download=true`

        const response = await fetch(endpoint, {
          headers: {
            cookie: req.headers.get('cookie') || '',
          },
        })

        if (!response.ok) {
          results.failed++
          results.errors.push(`PDF generation failed for ${studentName}`)
          continue
        }

        const pdfBuffer = Buffer.from(await response.arrayBuffer())

        const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_')
        const cleanTerm = termName.replace(/[^a-zA-Z0-9]/g, '_')
        const fileName = `ReportCard_${cleanName}_${cleanTerm}_${sId}.pdf`

        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

        if (uploadError) {
          results.failed++
          results.errors.push(`Upload failed for ${studentName}`)
          continue
        }

        const { data } = supabase.storage.from('receipts').getPublicUrl(fileName)
        const pdfUrl = data.publicUrl

        const waMsg = `Dear ${parentName}, please find the official ${
          type === 'EARLY_YEARS' ? 'EYFS Progress Report' : 'Term Progress Report Card'
        } for ${studentName} (${termName}) attached here: ${pdfUrl}`

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
      } catch {
        results.failed++
        results.errors.push(`Error processing student ${sId}`)
      }
    }

    return ok(results, { requestId })
  },
  {
    roles: [...MANAGEMENT_ROLES, 'Teacher'],
    rateLimit: { key: 'whatsapp-report', max: 30, windowMs: 3600_000 },
  }
)
