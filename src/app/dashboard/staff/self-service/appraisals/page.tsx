import { createClient } from '@/utils/supabase/server'
import { StaffAppraisalsClient } from './StaffAppraisalsClient'

export default async function StaffSelfServiceAppraisalsPage() {
  const supabase = await createClient()

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>Please log in to view this page.</p>
      </div>
    )
  }

  // Fetch all appraisal cycles
  const { data: cycles } = await supabase
    .from('appraisal_cycles')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch logged-in user's appraisals
  const { data: appraisals } = await supabase
    .from('appraisals')
    .select('*')
    .eq('employee_id', user.id)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Performance Self-Assessment</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Evaluate your performance against active appraisal cycles and view final evaluations.
        </p>
      </div>

      <StaffAppraisalsClient
        cycles={cycles || []}
        appraisals={appraisals || []}
      />
    </div>
  )
}
