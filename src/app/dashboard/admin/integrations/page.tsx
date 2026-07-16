import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function IntegrationsPage() {
  const supabase = await createClient()

  // Verify Admin/Director access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  const userRoles = profile?.roles || []

  if (!userRoles.includes('System Admin') && !userRoles.includes('Director')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  const { data: configs } = await supabase
    .from('integration_config')
    .select('*')
    .order('provider_type', { ascending: true })

  async function saveConfigAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const provider_type = formData.get('provider_type') as string
    const provider_name = formData.get('provider_name') as string
    const api_key = formData.get('api_key') as string
    const api_secret = formData.get('api_secret') as string
    const api_url = formData.get('api_url') as string
    const is_active = formData.get('is_active') === 'on'

    if (!provider_type || !provider_name) return

    // If setting to active, deactivate others of same type
    if (is_active) {
      await supabase.from('integration_config')
        .update({ is_active: false })
        .eq('provider_type', provider_type)
    }

    await supabase.from('integration_config').insert({
      provider_type,
      provider_name,
      api_key,
      api_secret,
      api_url,
      is_active,
      updated_by: user?.id
    })

    revalidatePath('/dashboard/admin/integrations')
  }

  async function toggleActiveAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id') as string
    const provider_type = formData.get('provider_type') as string
    
    if (id && provider_type) {
      // Deactivate all others of same type
      await supabase.from('integration_config')
        .update({ is_active: false })
        .eq('provider_type', provider_type)
        
      // Activate this one
      await supabase.from('integration_config')
        .update({ is_active: true })
        .eq('id', id)
        
      revalidatePath('/dashboard/admin/integrations')
    }
  }

  const groupedConfigs = (configs || []).reduce((acc: any, config) => {
    if (!acc[config.provider_type]) acc[config.provider_type] = []
    acc[config.provider_type].push(config)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Integration Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Configs List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {['WHATSAPP', 'SMS', 'BANK', 'GEMINI', 'SMTP'].map((type) => (
            <div key={type} className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{type} Providers</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Provider Name</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>API URL / Endpoint</th>
                    <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(groupedConfigs[type] || []).map((conf: any) => (
                    <tr key={conf.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{conf.provider_name}</td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{conf.api_url || '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '1rem', 
                          fontSize: '0.8rem',
                          backgroundColor: conf.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                          color: conf.is_active ? 'var(--color-success)' : 'var(--color-text-muted)'
                        }}>
                          {conf.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {!conf.is_active && (
                          <form action={toggleActiveAction}>
                            <input type="hidden" name="id" value={conf.id} />
                            <input type="hidden" name="provider_type" value={conf.provider_type} />
                            <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Make Active</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!groupedConfigs[type] || groupedConfigs[type].length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No providers configured for {type}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Add Config Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', position: 'sticky', top: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Add New Provider</h2>
          <form action={saveConfigAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Service Type</label>
              <select name="provider_type" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="BANK">Bank API (Receipting)</option>
                <option value="GEMINI">Gemini AI</option>
                <option value="SMTP">Email SMTP</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Provider Name</label>
              <input type="text" name="provider_name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. AfricasTalking, Selcom" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>API Key / Token</label>
              <input type="password" name="api_key" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>API Secret (Optional)</label>
              <input type="password" name="api_secret" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Base URL (Optional)</label>
              <input type="text" name="api_url" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="https://api.provider.com/v1" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="checkbox" name="is_active" id="is_active" defaultChecked />
              <label htmlFor="is_active" style={{ fontSize: '0.9rem' }}>Set as Active Provider</label>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Save Configuration</button>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Credentials are saved directly to the database. Avoid pushing sensitive keys to source control.
            </p>
          </form>
        </div>

      </div>
    </div>
  )
}
