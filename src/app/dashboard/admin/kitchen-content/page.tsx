import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function KitchenContentPage() {
  const supabase = await createClient()

  // Load current items
  const { data: items } = await supabase
    .from('kitchen_display_items')
    .select('*')
    .order('order_index', { ascending: true })

  async function addContentAction(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const display_type = formData.get('display_type') as string
    const content = formData.get('content') as string

    if (!display_type || !content) return

    await supabase.from('kitchen_display_items').insert({
      display_type,
      content,
      is_active: true
    })

    revalidatePath('/dashboard/admin/kitchen-content')
  }

  async function toggleActiveAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id') as string
    const current_status = formData.get('current_status') === 'true'

    if (id) {
      await supabase.from('kitchen_display_items').update({
        is_active: !current_status
      }).eq('id', id)
      revalidatePath('/dashboard/admin/kitchen-content')
    }
  }

  async function deleteAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id') as string

    if (id) {
      await supabase.from('kitchen_display_items').delete().eq('id', id)
      revalidatePath('/dashboard/admin/kitchen-content')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Kitchen LED Content Manager</h1>
        <a href="/kitchen/display" target="_blank" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Open Live Display
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Add Content Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Add Display Item</h2>
          <form action={addContentAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Type</label>
              <select name="display_type" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="MENU">Menu (Primary text)</option>
                <option value="QUEUE">Queue (Urgent/Pulsing)</option>
                <option value="ANNOUNCEMENT">Announcement</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Content</label>
              <textarea name="content" required rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="Text to display..."></textarea>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add to Display</button>
          </form>
        </div>

        {/* Live Content List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Current Elements</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600, width: '15%' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600, width: '50%' }}>Content</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600, width: '15%' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600, width: '20%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: item.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{item.display_type}</td>
                  <td style={{ padding: '1rem', fontSize: '1.1rem' }}>{item.content}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: item.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: item.is_active ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {item.is_active ? 'VISIBLE' : 'HIDDEN'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <form action={toggleActiveAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="current_status" value={item.is_active.toString()} />
                        <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                          {item.is_active ? 'Hide' : 'Show'}
                        </button>
                      </form>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'transparent', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
                          Del
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Display is currently empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
