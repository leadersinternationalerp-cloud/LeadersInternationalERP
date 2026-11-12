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
  'Sales',
  'Receptionist',
] as const

const PURGED_APPLICATION_NOS = ['LIS-2026-960M', 'LIS-2026-YOSZ', 'IS-2026-960M']
const PURGED_EMAILS = ['wawerusamymwangi@gmail.com']

export default async function PrincipalAdmissionsPage() {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    redirect('/dashboard?denied=1')
  }

  const supabase = createServiceClient()

  // 1. One-time and defensive auto-purge for the specified test applications
  try {
    await supabase
      .from('admission_applications')
      .delete()
      .or(`application_no.in.(${PURGED_APPLICATION_NOS.join(',')}),parent_email.in.(${PURGED_EMAILS.join(',')})`)
  } catch (purgeErr) {
    console.warn('[admissions/page] auto-purge notice:', purgeErr)
  }

  const isSalesOnly = session.roles.includes('Sales') && !session.roles.some((r) =>
    ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Receptionist'].includes(r)
  )
  const isReceptionist = session.roles.includes('Receptionist')

  const agentFullName = `${session.profile?.first_name || ''} ${session.profile?.last_name || ''}`.trim()

  // 2. Fetch admission applications (Sales users only see learners attributed to them)
  let appsQuery = supabase
    .from('admission_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (isSalesOnly) {
    appsQuery = appsQuery.eq('registered_by', session.user.id)
  }

  const { data, error } = await appsQuery

  if (error) {
    console.error('[admissions/page] failed to fetch applications:', error)
  }

  // 3. Fetch school classes for enrollment placement
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name, class_name, section, grade_level')
    .order('name', { ascending: true })

  // 4. Defensively filter out purged records and enforce Sales attribution scope
  const applications: AdmissionApplication[] = ((data || []) as AdmissionApplication[]).filter(
    (app) => {
      if (
        PURGED_APPLICATION_NOS.includes(app.application_no) ||
        PURGED_EMAILS.includes(app.parent_email?.toLowerCase())
      ) {
        return false
      }
      if (isSalesOnly) {
        return app.registered_by === session.user.id
      }
      return true
    }
  )

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <AdmissionsClient
        initialApplications={applications}
        classes={classesData || []}
        currentUser={{
          id: session.user.id,
          name: `${session.profile?.first_name || ''} ${session.profile?.last_name || ''}`.trim() || (isReceptionist ? 'Receptionist' : 'Sales Staff'),
          email: session.user.email || '',
          roles: session.roles,
          isSales: isSalesOnly,
          isReceptionist,
        }}
      />
    </div>
  )
}
