import { createClient } from '@/utils/supabase/server'
import PaymentsClient from './PaymentsClient'

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

  const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  const canRead = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Accountant'].includes(r))
  if (!canRead) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)', fontWeight: 600 }}>
        Access Denied. You do not have permission to view payments.
      </div>
    )
  }

  // Fetch pending/partially paid invoices for selection
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
        admission_number,
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .neq('status', 'Paid')

  // Fetch recorded payments history
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      invoices (term, academic_year),
      students (
        student_id,
        admission_number,
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .order('payment_date', { ascending: false })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Payments & Collections
      </h1>

      <PaymentsClient
        initialPayments={payments || []}
        pendingInvoices={pendingInvoices || []}
      />
    </div>
  )
}
