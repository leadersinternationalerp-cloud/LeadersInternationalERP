import { createClient } from '@/utils/supabase/server'
import { CreateCycleForm } from './CreateCycleForm'
import { ReviewAppraisalsList } from './ReviewAppraisalsList'

export default async function DirectorAppraisalsPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Director') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Fetch cycles
  const { data: cycles } = await supabase
    .from('appraisal_cycles')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch employee list (excluding system admins/directors for appraisal context, focusing on staff)
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, email')
    .in('role', ['Teacher', 'Principal', 'Accountant', 'Dean', 'Head of Section', 'Clinic', 'Transport'])
    .order('first_name', { ascending: true })

  // Fetch appraisals
  const { data: appraisals } = await supabase
    .from('appraisals')
    .select('*')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Staff Performance Appraisals</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Set up performance cycles, define assessment criteria, and review staff self-evaluations.
          </p>
        </div>
        <CreateCycleForm />
      </div>

      <ReviewAppraisalsList
        cycles={cycles || []}
        employees={employees || []}
        appraisals={appraisals || []}
      />
    </div>
  )
}
