import { createClient } from '@/utils/supabase/server'
import ParentBillingClient from './ParentBillingClient'

export default async function ParentBillingPage() {
  const supabase = await createClient()

  // Verify access (only Parents and Admins can access parent billing)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const hasAccess = profile?.role === 'Parent' || profile?.role === 'System Admin'

  if (!hasAccess) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // 1. Fetch children linked to this parent
  const { data: links } = await supabase
    .from('student_parents')
    .select(`
      student_id,
      students (
        id,
        student_id,
        grade_level,
        profiles (
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('parent_id', user?.id)

  const childrenData = []

  if (links) {
    for (const link of links) {
      const student: any = link.students
      if (!student) continue

      // Fetch invoices for this student
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })

      // Fetch payments for this student
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', student.id)
        .order('payment_date', { ascending: false })

      childrenData.push({
        ...student,
        invoices: invoices || [],
        payments: payments || []
      })
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Billing & Fees Dashboard
      </h1>
      <ParentBillingClient childrenData={childrenData} />
    </div>
  )
}
