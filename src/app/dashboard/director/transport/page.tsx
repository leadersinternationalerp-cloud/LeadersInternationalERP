import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function TransportDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  const userRoles = profile?.roles || []

  if (!userRoles.includes('Director') && !userRoles.includes('System Admin') && !userRoles.includes('Principal') && !userRoles.includes('Accountant')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  const { data: routes } = await supabase
    .from('transport_routes')
    .select('*')
    .order('name', { ascending: true })

  async function addRouteAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const name = formData.get('name') as string
    const vehicle_number = formData.get('vehicle_number') as string
    const driver_name = formData.get('driver_name') as string
    const driver_phone = formData.get('driver_phone') as string
    const route_fee = parseFloat(formData.get('route_fee') as string) || 0
    const capacity = parseInt(formData.get('capacity') as string) || 30

    if (!name || !vehicle_number) return

    await supabase.from('transport_routes').insert({
      name, vehicle_number, driver_name, driver_phone, route_fee, capacity
    })
    revalidatePath('/dashboard/director/transport')
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(val)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Transport & Routes Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Routes List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Route Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Vehicle</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Driver</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Capacity</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Term Fee</th>
              </tr>
            </thead>
            <tbody>
              {(routes || []).map((route) => (
                <tr key={route.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{route.name}</td>
                  <td style={{ padding: '1rem' }}>{route.vehicle_number}</td>
                  <td style={{ padding: '1rem' }}>
                    <div>{route.driver_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{route.driver_phone}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{route.capacity} seats</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatTZS(route.route_fee)}</td>
                </tr>
              ))}
              {(!routes || routes.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No transport routes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Route Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Add New Route</h2>
          <form action={addRouteAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Route Name</label>
              <input type="text" name="name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Mbezi - Tegeta" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Vehicle Number</label>
              <input type="text" name="vehicle_number" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. T 123 ABC" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Capacity</label>
                <input type="number" name="capacity" defaultValue="30" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Term Fee</label>
                <input type="number" step="0.01" name="route_fee" defaultValue="0" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Driver Name</label>
              <input type="text" name="driver_name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="Driver name..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Driver Phone</label>
              <input type="text" name="driver_phone" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="+255..." />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add Route</button>
          </form>
        </div>

      </div>
    </div>
  )
}
