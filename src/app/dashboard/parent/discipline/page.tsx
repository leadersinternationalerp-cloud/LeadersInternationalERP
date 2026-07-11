import { createClient } from '@/utils/supabase/server'
import ParentDisciplineClient from './ParentDisciplineClient'

export default async function ParentDisciplinePage() {
  const supabase = await createClient()

  // 1. Verify access (only Parents and System Admins can view child discipline logs)
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
        <p>You do not have permission to view child discipline records.</p>
      </div>
    )
  }

  // 2. Fetch children linked to this parent
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

  const childrenData: any[] = []

  if (links) {
    for (const link of links) {
      const student: any = link.students
      if (!student) continue

      // Fetch discipline records for this student
      const { data: records } = await supabase
        .from('discipline_records')
        .select('*')
        .eq('student_id', student.id)
        .order('incident_date', { ascending: false })

      childrenData.push({
        ...student,
        records: records || []
      })
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', color: 'var(--color-primary)' }}>
          Discipline Log & Incidents
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Monitor behavioral tracking, incident logs, and follow-up updates for your children.
        </p>
      </div>

      <ParentDisciplineClient childrenData={childrenData} />
    </div>
  )
}
