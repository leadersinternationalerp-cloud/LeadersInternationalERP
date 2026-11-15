import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { getWingContext } from '@/lib/wingServer'
import { matchesWingFilter } from '@/lib/wing'
import PaymentsClient from './PaymentsClient'
import { autoGenerateMissingInvoices } from '../actions'

export default async function PaymentsPage() {
  const supabase = await createClient()

  // Verify auth & roles permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)', fontWeight: 600 }}>
        Unauthorized. Please log in.
      </div>
    )
  }

  const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const userRoles = normalizeRoles(prof)

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

  // Trigger auto-generation check for missing invoices (current & past terms)
  await autoGenerateMissingInvoices()

  // Fetch pending/partially paid invoices for selection
  const { data: pendingInvoicesRaw } = await supabase
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

  // Fetch recorded payments history
  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select(`
      *,
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

  const pendingInvoices = lockedWing
    ? (pendingInvoicesRaw || []).filter((inv: any) => matchesWingFilter(inv.students || {}, lockedWing))
    : pendingInvoicesRaw || []

  const payments = lockedWing
    ? (paymentsRaw || []).filter((p: any) => matchesWingFilter(p.students || {}, lockedWing))
    : paymentsRaw || []

  // Fetch pending bank deposits
  const { data: bankDeposits } = await supabase
    .from('bank_deposits')
    .select('*')
    .eq('status', 'PENDING')
    .order('deposit_date', { ascending: false })

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
