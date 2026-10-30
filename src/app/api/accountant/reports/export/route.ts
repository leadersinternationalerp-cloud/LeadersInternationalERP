import { getBillingReport } from '@/lib/billing'
import { generateCSV } from '@/lib/csvExport'
import { generatePDF } from '@/lib/pdfExport'
import { route, ok } from '@/lib/api/handler'
import { FINANCE_ROLES } from '@/lib/auth/roles'

export const GET = route(
  async ({ req, requestId }) => {
    const url = new URL(req.url)
    const format = url.searchParams.get('format')
    const startDate = url.searchParams.get('startDate') ?? undefined
    const endDate = url.searchParams.get('endDate') ?? undefined
    const studentId = url.searchParams.get('studentId') ?? undefined
    const status = url.searchParams.get('status') as 'paid' | 'unpaid' | 'overdue' | undefined

    const filters = { startDate, endDate, studentId, status }
    const report = await getBillingReport(filters)

    if (format === 'csv') {
      const csv = generateCSV(report)
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="billing_report.csv"',
          'Cache-Control': 'private, no-store',
          'X-Request-Id': requestId,
        },
      })
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(report)
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="billing_report.pdf"',
          'Cache-Control': 'private, no-store',
          'X-Request-Id': requestId,
        },
      })
    }

    return ok(report, { requestId })
  },
  { roles: FINANCE_ROLES }
)
