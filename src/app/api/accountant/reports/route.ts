import { getBillingReport } from '@/lib/billing'
import { route, ok } from '@/lib/api/handler'
import { FINANCE_ROLES } from '@/lib/auth/roles'

export const GET = route(
  async ({ req, requestId }) => {
    const url = new URL(req.url)
    const startDate = url.searchParams.get('startDate') ?? undefined
    const endDate = url.searchParams.get('endDate') ?? undefined
    const studentId = url.searchParams.get('studentId') ?? undefined
    const status = url.searchParams.get('status') as 'paid' | 'unpaid' | 'overdue' | undefined

    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('perPage')) || 25))

    const filters = { startDate, endDate, studentId, status }
    const report = await getBillingReport(filters)

    // Paginate invoices in the response for efficient client loads
    const allInvoices = report.invoices || []
    const totalInvoices = allInvoices.length
    const from = (page - 1) * perPage
    const paginatedInvoices = allInvoices.slice(from, from + perPage)

    const data = {
      ...report,
      invoices: paginatedInvoices,
    }

    return ok(data, {
      requestId,
      page,
      perPage,
      total: totalInvoices,
    })
  },
  { roles: FINANCE_ROLES }
)
