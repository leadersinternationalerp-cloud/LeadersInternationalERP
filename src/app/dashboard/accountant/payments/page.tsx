import { getSessionUser } from '@/lib/auth/session'
import { getWingContext } from '@/lib/wingServer'
import { matchesWingFilter } from '@/lib/wing'
import PaymentsClient from './PaymentsClient'

export default async function PaymentsPage() {
  const { user, profile: prof, roles: userRoles, supabase } = await getSessionUser()
  if (!user) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)', fontWeight: 600 }}>
        Unauthorized. Please log in.
      </div>
    )
  }

  const canRead = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Accountant', 'Receptionist'].includes(r))
  if (!canRead) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)', fontWeight: 600 }}>
        Access Denied. You do not have permission to view payments.
      </div>
    )
  }

  const wingContext = await getWingContext(user.id, prof)
  const lockedWing = wingContext.assignedWing !== 'Both' ? wingContext.assignedWing : null

  // Fetch pending/partially paid invoices, recorded payments, and pending bank deposits in parallel
  const [{ data: pendingInvoicesRaw }, { data: paymentsRaw }, { data: bankDeposits }] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id,
        term,
        academic_year,
        net_amount,
        status,
        student_id,
        students (
          student_id,
          admission_number,
          grade_level,
          profiles (
            first_name,
            last_name
          )
        ),
        payments (
          amount
        )
      `)
      .neq('status', 'Paid')
      .limit(500),
    supabase
      .from('payments')
      .select(`
        id,
        invoice_id,
        student_id,
        amount,
        payment_method,
        reference_number,
        payment_date,
        created_at,
        invoices (term, academic_year),
        students (
          student_id,
          admission_number,
          grade_level,
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .order('payment_date', { ascending: false })
      .limit(500),
    supabase
      .from('bank_deposits')
      .select('*')
      .eq('status', 'PENDING')
      .order('deposit_date', { ascending: false })
      .limit(200),
  ])

  const pendingInvoices = lockedWing
    ? (pendingInvoicesRaw || []).filter((inv: any) => matchesWingFilter(inv.students || {}, lockedWing))
    : pendingInvoicesRaw || []

  const payments = lockedWing
    ? (paymentsRaw || []).filter((p: any) => matchesWingFilter(p.students || {}, lockedWing))
    : paymentsRaw || []

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Payments & Collections
      </h1>

      <PaymentsClient
        initialPayments={payments || []}
        pendingInvoices={pendingInvoices || []}
        initialBankDeposits={bankDeposits || []}
        initialWingFilter={wingContext.activeWingFilter}
        lockedWing={lockedWing}
      />
    </div>
  )
}
