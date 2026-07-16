import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function InventoryDashboardPage() {
  const supabase = await createClient()

  // Ensure access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  const userRoles = profile?.roles || []

  if (!userRoles.includes('Director') && !userRoles.includes('System Admin') && !userRoles.includes('Principal') && !userRoles.includes('Accountant')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  const { data: items } = await supabase
    .from('stock_items')
    .select('*')
    .order('name', { ascending: true })

  async function addItemAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const name = formData.get('name') as string
    const category = formData.get('category') as string
    const unit = formData.get('unit') as string
    const quantity = parseFloat(formData.get('quantity') as string) || 0
    const reorder_level = parseFloat(formData.get('reorder_level') as string) || 10

    if (!name || !category) return

    await supabase.from('stock_items').insert({
      name, category, unit, quantity, reorder_level
    })
    revalidatePath('/dashboard/director/inventory')
  }

  async function addMovementAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const stock_item_id = formData.get('stock_item_id') as string
    const movement_type = formData.get('movement_type') as string
    const quantity = parseFloat(formData.get('quantity') as string)
    const remarks = formData.get('remarks') as string

    if (!stock_item_id || !movement_type || !quantity) return

    // Insert movement
    await supabase.from('stock_movements').insert({
      stock_item_id, movement_type, quantity, remarks, issued_to: user?.id
    })

    // Update main stock table
    const { data: current } = await supabase.from('stock_items').select('quantity').eq('id', stock_item_id).single()
    if (current) {
      const newQty = movement_type === 'IN' ? Number(current.quantity) + quantity : Number(current.quantity) - quantity
      await supabase.from('stock_items').update({ quantity: newQty }).eq('id', stock_item_id)
    }

    revalidatePath('/dashboard/director/inventory')
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Inventory & Kitchen Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Inventory List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Item Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Category</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Quantity</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((item) => {
                const isLow = Number(item.quantity) <= Number(item.reorder_level)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '1rem' }}>{item.category}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{item.quantity} {item.unit}</td>
                    <td style={{ padding: '1rem' }}>
                      {isLow ? (
                        <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.9rem' }}>Low Stock</span>
                      ) : (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem' }}>Optimal</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No inventory items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sidebar Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Record Movement</h2>
            <form action={addMovementAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Item</label>
                <select name="stock_item_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <option value="">Select Item...</option>
                  {(items || []).map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} left)</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '50%' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Type</label>
                  <select name="movement_type" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <option value="OUT">Stock OUT (Issue)</option>
                    <option value="IN">Stock IN (Restock)</option>
                  </select>
                </div>
                <div style={{ width: '50%' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Quantity</label>
                  <input type="number" step="0.01" name="quantity" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Remarks</label>
                <input type="text" name="remarks" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Daily Kitchen Issue" />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', backgroundColor: 'var(--color-primary)' }}>Submit Movement</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>New Item Register</h2>
            <form action={addItemAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Item Name</label>
                <input type="text" name="name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Printing Paper A4" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Category</label>
                <select name="category" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <option value="STATIONERY">Stationery</option>
                  <option value="KITCHEN">Kitchen & Food</option>
                  <option value="UNIFORM">Uniforms</option>
                  <option value="CLEANING">Cleaning</option>
                  <option value="ELECTRONICS">Electronics</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '50%' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Unit</label>
                  <input type="text" name="unit" required defaultValue="pcs" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
                <div style={{ width: '50%' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Start Qty</label>
                  <input type="number" step="0.01" name="quantity" defaultValue="0" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
              </div>
              <button type="submit" className="btn-secondary" style={{ marginTop: '0.5rem' }}>Add Item</button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
