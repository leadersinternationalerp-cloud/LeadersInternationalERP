import { generateDetailedReceiptPdfBuffer } from '@/lib/pdf/ReceiptPdfGenerator'
import { route } from '@/lib/api/handler'
import { FINANCE_ROLES } from '@/lib/auth/roles'
import { badRequest } from '@/lib/api/errors'

export const GET = route(
  async ({ req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('payment_id')

    if (!paymentId) {
      throw badRequest({ paymentId: 'Missing payment_id parameter' })
    }

    const pdfBuffer = await generateDetailedReceiptPdfBuffer(paymentId)

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="receipt.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-store',
        'X-Request-Id': requestId,
      },
    })
  },
  { roles: FINANCE_ROLES }
)
