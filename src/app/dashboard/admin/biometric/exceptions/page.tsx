import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function BiometricExceptionsPage() {
  const supabase = await createClient()

  // Verify Admin/Principal access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  const userRoles = profile?.roles || []

  if (!userRoles.includes('System Admin') && !userRoles.includes('Principal')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  // Load Open Exceptions
  const { data: exceptions } = await supabase
    .from('attendance_exceptions')
    .select(`
      *,
      log:biometric_log_id(
        biometric_id, scan_time, 
        device:device_id(device_name)
      )
    `)
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false })

  // Search profiles to link unmatched scans
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .order('first_name', { ascending: true })

  async function resolveExceptionAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const exception_id = formData.get('exception_id') as string
    const profile_id = formData.get('profile_id') as string // User selecting who the ID actually belongs to
    const resolution_notes = formData.get('resolution_notes') as string
    const action_type = formData.get('action_type') as string

    if (!exception_id) return

    if (action_type === 'IGNORE') {
      await supabase.from('attendance_exceptions').update({
        status: 'IGNORED',
        resolution_notes,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString()
      }).eq('id', exception_id)
    } else if (action_type === 'LINK' && profile_id) {
      // First, we need to find the related biometric log
      const { data: exc } = await supabase.from('attendance_exceptions').select('biometric_log_id').eq('id', exception_id).single()
      
      if (exc?.biometric_log_id) {
        // Update the log with the correct profile
        await supabase.from('biometric_logs').update({
          matched_profile_id: profile_id,
          status: 'SUCCESS' // Was UNMATCHED
        }).eq('id', exc.biometric_log_id)

        // Then mark the exception resolved
        await supabase.from('attendance_exceptions').update({
          status: 'RESOLVED',
          resolution_notes,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        }).eq('id', exception_id)
      }
    }

    revalidatePath('/dashboard/admin/biometric/exceptions')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-error)' }}>Biometric Exceptions Queue</h1>
        <a href="/dashboard/admin/biometric/devices" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Devices
        </a>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Scan Time</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Device</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Raw Bio ID</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Exception Type</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {(exceptions || []).map((exc) => (
              <tr key={exc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem' }}>{exc.log?.scan_time ? new Date(exc.log.scan_time).toLocaleString() : 'Unknown'}</td>
                <td style={{ padding: '1rem' }}>{exc.log?.device?.device_name || 'Unknown'}</td>
                <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>{exc.log?.biometric_id}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.8rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-error)'
                  }}>
                    {exc.exception_type}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <form action={resolveExceptionAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="hidden" name="exception_id" value={exc.id} />
                    
                    {exc.exception_type === 'UNMATCHED_ID' && (
                      <select name="profile_id" style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                        <option value="">Select person to link...</option>
                        {(profiles || []).map(p => (
                          <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.role})</option>
                        ))}
                      </select>
                    )}
                    
                    <input type="text" name="resolution_notes" placeholder="Notes (optional)" style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} />
                    
                    {exc.exception_type === 'UNMATCHED_ID' && (
                      <button type="submit" name="action_type" value="LINK" className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Link ID</button>
                    )}
                    <button type="submit" name="action_type" value="IGNORE" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'transparent', color: 'var(--color-text-muted)' }}>Ignore</button>
                  </form>
                </td>
              </tr>
            ))}
            {(!exceptions || exceptions.length === 0) && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600, fontSize: '1.1rem' }}>
                  🎉 All clear! No open biometric exceptions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
