import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function ParentDisciplinePage({
  searchParams
}: {
  searchParams: Promise<{ child_id?: string }>
}) {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Parent' && profile?.role !== 'System Admin') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const params = await searchParams
  let childId = params.child_id

  if (!childId) {
    const { data: relations } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', user.id)
      .limit(1)
    
    if (relations && relations.length > 0) {
      childId = relations[0].student_id
    }
  }

  if (!childId) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Child Assigned</h2>
        <p>No child student profile links found for your parent account.</p>
      </div>
    )
  }

  // Fetch student profile details
  const { data: student } = await supabase
    .from('students')
    .select('id, student_id, profiles:id (first_name, last_name)')
    .eq('id', childId)
    .single()

  // Fetch discipline logs for this student
  const { data: disciplineLogs } = await supabase
    .from('discipline_records')
    .select('*')
    .eq('student_id', childId)
    .order('incident_date', { ascending: false })

  const studentName = student ? `${(student.profiles as any).first_name} ${(student.profiles as any).last_name}` : 'Student'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Discipline Timeline & Log
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Tracking records for: <strong>{studentName}</strong> ({student?.student_id})
          </p>
        </div>
        <Link href="/dashboard/parent/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '2rem' }}>Incident History Log</h2>

        {disciplineLogs && disciplineLogs.length > 0 ? (
          <div style={{ position: 'relative', borderLeft: '2px solid var(--color-border)', paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {disciplineLogs.map((log) => (
              <div key={log.id} style={{ position: 'relative' }}>
                
                {/* Timeline Dot Indicator */}
                <div style={{
                  position: 'absolute', left: '-48px', top: '4px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  backgroundColor: 
                    log.category === 'Behavioral Incident' ? 'var(--color-error)' : 
                    log.category === 'Dress Code' ? 'var(--color-warning)' : 'var(--color-secondary)',
                  border: '3px solid var(--color-surface)', boxShadow: '0 0 0 2px var(--color-border)'
                }} />

                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{log.category}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      {formatDate(log.incident_date)}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', margin: '0.5rem 0', lineHeight: '1.5' }}>
                    <strong>Incident Description:</strong> "{log.description}"
                  </p>

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <strong>Action Taken:</strong> <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{log.action_taken}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            No discipline incidents recorded for this student.
          </div>
        )}
      </div>
    </div>
  )
}
