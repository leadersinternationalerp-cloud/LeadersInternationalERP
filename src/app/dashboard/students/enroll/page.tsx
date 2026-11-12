import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import EnrollmentClient from './EnrollmentClient'

export default async function EnrollStudentPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()

  const userRoles = normalizeRoles(profile)

  const canAccessEnroll =
    userRoles.includes('System Admin') ||
    userRoles.includes('Director') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Dean') ||
    userRoles.includes('Head of Section') ||
    userRoles.includes('Receptionist')

  if (!user || !canAccessEnroll) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const isReceptionist = userRoles.includes('Receptionist')

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            {isReceptionist ? 'Register & Admit Student (Walk-In)' : 'Enroll New Student'}
          </h1>
          {isReceptionist && (
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                backgroundColor: '#fef3c7',
                color: '#78350f',
                border: '1px solid #fde68a',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Attributed to: WALK IN
            </span>
          )}
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {isReceptionist
            ? 'Complete the student bio-data form below to register and admit a walk-in student. Students registered by Receptionist are automatically attributed to "WALK IN".'
            : 'Complete the form below to register a new student and optionally link a parent/guardian account.'}
        </p>
      </div>

      <EnrollmentClient isReceptionist={isReceptionist} />
    </div>
  )
}
