import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function DeanDisciplinePage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Dean' && profile?.role !== 'System Admin') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all students for form selection
  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      profiles:id (first_name, last_name)
    `)

  // Fetch all logged discipline incidents
  const { data: incidents } = await supabase
    .from('discipline_records')
    .select(`
      *,
      student:student_id (
        id,
        student_id,
        profiles:id (first_name, last_name)
      ),
      recorder:recorded_by (first_name, last_name)
    `)
    .order('incident_date', { ascending: false })

  const incidentLogs = incidents || []

  // Server Action to log discipline incident
  async function handleLogIncidentAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const studentId = formData.get('studentId') as string
    const date = formData.get('date') as string
    const category = formData.get('category') as string
    const description = formData.get('description') as string
    const actionTaken = formData.get('actionTaken') as string

    if (!studentId || !date || !category || !description || !actionTaken) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Insert discipline record
    const { error } = await supabase
      .from('discipline_records')
      .insert({
        student_id: studentId,
        incident_date: date,
        category,
        description,
        action_taken: actionTaken,
        recorded_by: user.id
      })

    if (error) {
      console.error('Error logging discipline case:', error.message)
      return
    }

    // 2. Fetch student details for parent alert
    const { data: stud } = await supabase
      .from('students')
      .select('profiles:id (first_name, last_name)')
      .eq('id', studentId)
      .single()

    const childName = stud ? `${(stud.profiles as any).first_name} ${(stud.profiles as any).last_name}` : 'Your child'

    // 3. Find linked parents and alert them
    const { data: parentLinks } = await supabase
      .from('student_parents')
      .select('parent_id')
      .eq('student_id', studentId)

    if (parentLinks) {
      for (const link of parentLinks) {
        await supabase.from('notifications').insert({
          user_id: link.parent_id,
          message: `Disciplinary Alert: A discipline incident (${category}) was recorded for ${childName}. Action taken: ${actionTaken}.`,
          link_url: `/dashboard/parent/discipline`
        })
      }
    }

    revalidatePath('/dashboard/dean/discipline')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Student Discipline Logs
        </h1>
        <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Log Incident Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Log New Incident</h2>
          <form action={handleLogIncidentAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Student</label>
              <select name="studentId" className="input-field" required>
                <option value="">-- Choose Student --</option>
                {(students || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {(s.profiles as any)?.first_name} {(s.profiles as any)?.last_name} ({s.student_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Incident Date</label>
              <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-field" required />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" className="input-field" required>
                <option value="Behavioral Incident">Behavioral Incident</option>
                <option value="Dress Code">Dress Code</option>
                <option value="Academic Dishonesty">Academic Dishonesty</option>
                <option value="Tardiness">Tardiness</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description Details</label>
              <textarea name="description" placeholder="Specify incident parameters..." className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} required />
            </div>

            <div className="form-group">
              <label className="form-label">Action Taken</label>
              <select name="actionTaken" className="input-field" required>
                <option value="Written Warning">Written Warning</option>
                <option value="Parent Contact Call">Parent Contact Call</option>
                <option value="Detention Roster">Detention Roster</option>
                <option value="Suspension (3 Days)">Suspension (3 Days)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              ⚖ Publish Disciplinary Case
            </button>
          </form>
        </div>

        {/* Incidents Table list */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Institutional Discipline Log ({incidentLogs.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>Student</th>
                  <th style={{ padding: '1rem' }}>Date & Category</th>
                  <th style={{ padding: '1rem' }}>Description details</th>
                  <th style={{ padding: '1rem' }}>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {incidentLogs.map((log) => {
                  const studentProf: any = log.student?.profiles
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>
                          {studentProf?.first_name} {studentProf?.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          ID: {log.student?.student_id}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-error)' }}>
                          {log.category}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {formatDate(log.incident_date)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '250px' }}>
                        "{log.description}"
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-primary)'
                        }}>
                          {log.action_taken}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {incidentLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No discipline cases registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
