import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function FixedAssetsPage() {
  const supabase = await createClient()

  const { data: assets } = await supabase
    .from('fixed_assets')
    .select(`
      *,
      asset_account:asset_account_id(code, name)
    `)
    .order('purchase_date', { ascending: false })

  const { data: assetAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('account_type', 'ASSET')

  async function addAssetAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const name = formData.get('name') as string
    const asset_code = formData.get('asset_code') as string
    const category = formData.get('category') as string
    const purchase_date = formData.get('purchase_date') as string
    const purchase_price = parseFloat(formData.get('purchase_price') as string)
    const useful_life_years = parseInt(formData.get('useful_life_years') as string)
    const asset_account_id = formData.get('asset_account_id') as string

    if (!name || !asset_code || !purchase_date || !purchase_price || !useful_life_years || !asset_account_id) return

    await supabase.from('fixed_assets').insert({
      name,
      asset_code,
      category,
      purchase_date,
      purchase_price,
      useful_life_years,
      asset_account_id,
      is_active: true
    })

    revalidatePath('/dashboard/accountant/accounting/assets')
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(val)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Fixed Assets Register</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Assets List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Code</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Asset Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Category</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Purchase Date</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Purchase Price</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Life (Yrs)</th>
              </tr>
            </thead>
            <tbody>
              {(assets || []).map((asset) => (
                <tr key={asset.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{asset.asset_code}</td>
                  <td style={{ padding: '1rem' }}>{asset.name}</td>
                  <td style={{ padding: '1rem' }}>{asset.category}</td>
                  <td style={{ padding: '1rem' }}>{asset.purchase_date}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatTZS(asset.purchase_price)}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{asset.useful_life_years}</td>
                </tr>
              ))}
              {(!assets || assets.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No fixed assets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Asset Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Register New Asset</h2>
          <form action={addAssetAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Asset Code / Tag</label>
              <input type="text" name="asset_code" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. FA-IT-001" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Asset Name</label>
              <input type="text" name="name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Dell XPS 15" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Category</label>
              <input type="text" name="category" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. IT Equipment" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Purchase Date</label>
              <input type="date" name="purchase_date" required defaultValue={new Date().toISOString().slice(0, 10)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Asset Account (GL)</label>
              <select name="asset_account_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">Select Account...</option>
                {(assetAccounts || []).map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Price</label>
                <input type="number" step="0.01" name="purchase_price" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Life (Yrs)</label>
                <input type="number" step="1" name="useful_life_years" required defaultValue="5" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Register Asset</button>
          </form>
        </div>

      </div>
    </div>
  )
}
