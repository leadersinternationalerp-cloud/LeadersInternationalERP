import { getSessionUser } from '@/lib/auth/session'
import { hasAnyRole } from '@/lib/auth/roles'
import { createServiceClient } from '@/utils/supabase/service'
import AdmissionsClient, { type AdmissionApplication } from './AdmissionsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const ALLOWED_STAFF_ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
  'Accountant',
] as const

export default async function PrincipalAdmissionsPage() {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    redirect('/dashboard?denied=1')
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('admission_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admissions/page] failed to fetch applications:', error)
  }

  const applications: AdmissionApplication[] = (data || []) as AdmissionApplication[]

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <AdmissionsClient initialApplications={applications} />
    </div>
  )
}
