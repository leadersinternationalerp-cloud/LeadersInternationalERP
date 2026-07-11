import { createClient } from '@/utils/supabase/server'
import DisciplineManagementClient from './DisciplineManagementClient'

export default async function DeanDisciplinePage() {
  const supabase = await createClient()

  // 1. Verify access (only Deans and System Admins can log/view discipline portal)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const hasAccess = profile?.role === 'Dean' || profile?.role === 'System Admin'

  if (!hasAccess) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to access the Discipline Management portal.</p>
      </div>
    )
  }

  // 2. Fetch all students (for dropdown select in the form)
  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      grade_level,
      section,
      profiles (
        first_name,
        last_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  // 3. Fetch all discipline records (ordered by incident date desc)
  const { data: disciplineRecords } = await supabase
    .from('discipline_records')
    .select(`
      id,
      student_id,
      incident_date,
      category,
      description,
      action_taken,
      follow_up_required,
      follow_up_date,
      parent_notified,
      created_at,
      students (
        student_id,
        profiles (
          first_name,
          last_name
        )
      ),
      profiles (
        first_name,
        last_name
      )
    `)
    .order('incident_date', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', color: 'var(--color-primary)' }}>
          Discipline Management Portal
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Log new student discipline cases, track follow-up parameters, and automatically notify linked parents via SMS and in-app alerts.
        </p>
      </div>

      <DisciplineManagementClient
        students={(students as any[]) || []}
        initialRecords={(disciplineRecords as any[]) || []}
      />
    </div>
  )
}
