import { createClient } from '@/utils/supabase/server'
import AdvancesClient from './AdvancesClient'

export default async function AdvancesPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Accountant') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch pending disbursements
  const { data: pendingAdvances } = await supabase
    .from('salary_advances')
    .select('id, amount_approved, repayment_period_months, profiles(first_name, last_name)')
    .eq('status', 'Approved')

  // Fetch active (disbursed) advances along with repayment history
  const { data: activeAdvances } = await supabase
    .from('salary_advances')
    .select(`
      id, 
      amount_approved, 
      repayment_period_months, 
      profiles(first_name, last_name),
      advance_repayments(amount)
    `)
    .eq('status', 'Disbursed')

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>Salary Advances</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Manage approved advances, process disbursements, and monitor active repayments.
        </p>
      </div>

      <AdvancesClient 
        pendingAdvances={pendingAdvances || []} 
        activeAdvances={activeAdvances || []} 
      />
    </div>
  )
}
