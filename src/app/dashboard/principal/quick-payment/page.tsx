import { createClient } from '@/utils/supabase/server'
import QuickPaymentForm from './QuickPaymentForm'

export default async function QuickPaymentPage() {
  const supabase = await createClient()

  // Verify access (only Principal and System Admin can do cashier operations)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const hasAccess = profile?.role === 'Principal' || profile?.role === 'System Admin'

  if (!hasAccess) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have cashier permissions to access this page.</p>
      </div>
    )
  }

  // Fetch all pending/partially paid invoices
  const { data: pendingInvoices } = await supabase
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
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .neq('status', 'Paid')

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Quick Payment Entry (Cashier Portal)
      </h1>
      <QuickPaymentForm pendingInvoices={pendingInvoices || []} />
    </div>
  )
}
