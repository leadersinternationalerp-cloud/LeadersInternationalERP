import { createClient } from '@/utils/supabase/server'
import AssessmentWeightsClient from './AssessmentWeightsClient'

export default async function AssessmentWeightsPage() {
  const supabase = await createClient()

  // 1. Verify user role (System Admin, Director, Principal)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>Please log in to access this page.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()

  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal')
  if (!isAdmin) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // 2. Fetch configured assessment weights from DB
  const { data: dbWeights } = await supabase
    .from('assessment_weights')
    .select('*')
    .order('display_order', { ascending: true })

  const initialWeights = dbWeights || []

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>Assessment Weights Configuration</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Define weights for exams, quizzes, and class activities to calculate weighted overall scores.
        </p>
      </div>

      <AssessmentWeightsClient initialWeights={initialWeights} />
    </div>
  )
}
