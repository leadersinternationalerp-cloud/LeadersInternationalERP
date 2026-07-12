import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function BiometricDevicesPage() {
  const supabase = await createClient()

  // Verify Admin access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  const userRoles = profile?.roles || []

  if (!userRoles.includes('System Admin')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  const { data: devices } = await supabase
    .from('biometric_devices')
    .select('*')
    .order('created_at', { ascending: false })

  async function registerDeviceAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const device_name = formData.get('device_name') as string
    const device_serial = formData.get('device_serial') as string
    const location = formData.get('location') as string

    if (!device_name || !device_serial) return

    await supabase.from('biometric_devices').insert({
      device_name,
      device_serial,
      location,
      status: 'ACTIVE'
    })

    revalidatePath('/dashboard/admin/biometric/devices')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Biometric Scanners</h1>
        <a href="/dashboard/admin/biometric/exceptions" className="btn-secondary" style={{ textDecoration: 'none' }}>
          View Scan Exceptions
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Devices List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Device Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Serial / ID</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Location</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Last Ping</th>
              </tr>
            </thead>
            <tbody>
              {(devices || []).map((dev) => (
                <tr key={dev.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{dev.device_name}</td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{dev.device_serial}</td>
                  <td style={{ padding: '1rem' }}>{dev.location}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: dev.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: dev.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {dev.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {dev.last_ping_at ? new Date(dev.last_ping_at).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
              {(!devices || devices.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No biometric devices registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Register Device Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Register New Scanner</h2>
          <form action={registerDeviceAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Device Name</label>
              <input type="text" name="device_name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Main Gate Scanner 1" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Device Serial / Mac</label>
              <input type="text" name="device_serial" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. ZK-192837" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Location</label>
              <input type="text" name="location" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Primary Block Entrance" />
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Register Device</button>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Ensure the physical scanner is configured to point its API payload to the ERP endpoints.
            </p>
          </form>
        </div>

      </div>
    </div>
  )
}
