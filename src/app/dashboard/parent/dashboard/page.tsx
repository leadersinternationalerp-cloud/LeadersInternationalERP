import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function ParentDashboardPage({
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

  // Fetch children linked to this parent
  const { data: childRelations } = await supabase
    .from('student_parents')
    .select(`
      student_id,
      students:student_id (
        id,
        student_id,
        grade_level,
        section,
        profiles:id (first_name, last_name)
      )
    `)
    .eq('parent_id', user?.id)

  const children = (childRelations || []).map((r: any) => r.students).filter(Boolean)

  // Determine selected child
  const params = await searchParams
  const selectedChildId = params.child_id || (children.length > 0 ? children[0].id : null)

  let selectedChild = null
  let childInvoices: any[] = []
  let childAttendance: any[] = []
  let childDiscipline: any[] = []

  if (selectedChildId) {
    selectedChild = children.find(c => c.id === selectedChildId) || null
    if (selectedChild) {
      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', selectedChildId)
        .order('created_at', { ascending: false })
      childInvoices = invoices || []

      // Fetch attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', selectedChildId)
        .order('date', { ascending: false })
      childAttendance = attendance || []

      // Fetch discipline records
      const { data: discipline } = await supabase
        .from('discipline_records')
        .select('*')
        .eq('student_id', selectedChildId)
        .order('incident_date', { ascending: false })
      childDiscipline = discipline || []
    }
  }

  // Calculate attendance rate
  const totalAtt = childAttendance.length
  const presentAtt = childAttendance.filter(r => r.status === 'Present' || r.status === 'Late').length
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100

  // Format currency
  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Parent Portal Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Monitor and track your children's school progress, attendance, and billing.
          </p>
        </div>

        {/* Child Selector Dropdown */}
        {children.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Child:</span>
            <form method="GET" action="/dashboard/parent/dashboard">
              <select 
                name="child_id" 
                defaultValue={selectedChildId || ''} 
                onChange={(e) => e.target.form?.submit()} 
                className="input-field" 
                style={{ minWidth: '180px', padding: '0.4rem 1rem' }}
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.profiles?.first_name} {c.profiles?.last_name} ({c.grade_level})
                  </option>
                ))}
              </select>
            </form>
          </div>
        )}
      </div>

      {selectedChild ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left Column: Billing & Discipline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Child Billing Summary */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', fontWeight: 600 }}>Billing & Fees Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {childInvoices.slice(0, 3).map(inv => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{inv.term} ({inv.academic_year})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Due: {formatDate(inv.due_date)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatTZS(Number(inv.net_amount))}</div>
                      <span style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        backgroundColor: inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: inv.status === 'Paid' ? 'var(--color-success)' : 'var(--color-error)'
                      }}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
                
                {childInvoices.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No invoice records found.</p>
                )}
              </div>
            </div>

            {/* Child Discipline Logs */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', fontWeight: 600 }}>Discipline Incidents History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {childDiscipline.map(disc => (
                  <div key={disc.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>{disc.category}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatDate(disc.incident_date)}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
                      <strong>Description:</strong> "{disc.description}"
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      <strong>Action Taken:</strong> {disc.action_taken}
                    </div>
                  </div>
                ))}

                {childDiscipline.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No discipline incidents recorded.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Attendance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Child Attendance Rate */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}>Attendance Rate</h3>
              <div style={{
                fontSize: '3rem', fontWeight: 800, color: attendanceRate >= 90 ? 'var(--color-success)' : 'var(--color-warning)',
                margin: '1.5rem 0'
              }}>
                {attendanceRate}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Total Records: {totalAtt} Days • Present/Late: {presentAtt} Days
              </div>
            </div>

            {/* Attendance Logs */}
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
                Recent Attendance Logs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                {childAttendance.slice(0, 5).map(rec => (
                  <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.85rem' }}>{formatDate(rec.date)}</span>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600,
                      color: rec.status === 'Present' ? 'var(--color-success)' : 'var(--color-error)'
                    }}>{rec.status}</span>
                  </div>
                ))}

                {childAttendance.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No attendance logs.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
          No child links assigned to this parent profile yet.
        </div>
      )}
    </div>
  )
}
