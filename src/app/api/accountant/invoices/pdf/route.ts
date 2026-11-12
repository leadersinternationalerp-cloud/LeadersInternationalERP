import { generateInvoicePdfBuffer } from '@/lib/pdf/InvoicePdfGenerator'
import { route } from '@/lib/api/handler'
import { STAFF_ROLES } from '@/lib/auth/roles'
import { ApiError, badRequest } from '@/lib/api/errors'
import { createServiceClient } from '@/utils/supabase/service'

const INVOICE_ALLOWED_ROLES = [...STAFF_ROLES, 'Parent', 'Student'] as const

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get('invoice_id')
    const studentId = searchParams.get('student_id')
    const download = searchParams.get('download') === '1'

    if (!invoiceId && !studentId) {
      throw badRequest({ invoice_id: 'Missing invoice_id or student_id parameter' })
    }

    const { buffer, filename, studentUserId } = await generateInvoicePdfBuffer({
      invoiceId,
      studentId,
    })

    const userRoles = user.roles || []
    const isStaff = userRoles.some((r: string) =>
      ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Receptionist'].includes(r)
    )

    if (!isStaff) {
      if (userRoles.includes('Student') && studentUserId === user.id) {
        // allowed
      } else if (userRoles.includes('Parent')) {
        const supabase = createServiceClient()
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('id')
          .eq('parent_id', user.id)
          .eq('student_id', studentUserId)
          .maybeSingle()
        if (!link) {
          throw new ApiError('FORBIDDEN', 'You do not have permission to download this student invoice')
        }
      } else {
        throw new ApiError('FORBIDDEN', 'You do not have permission to download this invoice')
      }
    }

    const disposition = download ? 'attachment' : 'inline'

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, no-store',
        'X-Request-Id': requestId,
      },
    })
  },
  { roles: INVOICE_ALLOWED_ROLES }
)
