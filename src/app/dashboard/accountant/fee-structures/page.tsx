import { createClient } from '@/utils/supabase/server'
import { saveFeeStructureAction, deleteFeeStructureAction } from '../actions'
import { revalidatePath } from 'next/cache'

export default async function FeeStructuresPage() {
  const supabase = await createClient()

  // Fetch all fee structures
  const { data: fees, error } = await supabase
    .from('fee_structures')
    .select('*')
    .order('created_at', { ascending: false })

  // Format currency helper
  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Handle delete on server side via Server Action directly
  async function handleDelete(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (id) {
      await deleteFeeStructureAction(id)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Fee Structure Management
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Create Fee Structure Form */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Create Fee Item</h2>
          
          <form action={saveFeeStructureAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <select name="academic_year" className="input-field" required defaultValue="2025-2026">
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Term</label>
              <select name="term" className="input-field" required>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Grade / Class Level</label>
              <select name="grade_level" className="input-field" required>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fee Type</label>
              <select name="fee_type" className="input-field" required>
                <option value="Tuition">Tuition</option>
                <option value="Transport">Transport</option>
                <option value="Uniform">Uniform</option>
                <option value="Books">Books</option>
                <option value="Activities">Activities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (TZS)</label>
              <input type="number" name="amount" min="0" placeholder="e.g. 150000" className="input-field" required />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea name="description" className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
              Save Fee Item
            </button>
          </form>
        </div>

        {/* Fee Structures Table */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Academic Year</th>
                <th style={{ padding: '1rem' }}>Term</th>
                <th style={{ padding: '1rem' }}>Grade</th>
                <th style={{ padding: '1rem' }}>Fee Type</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {fees?.map((fee) => (
                <tr key={fee.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>{fee.academic_year}</td>
                  <td style={{ padding: '1rem' }}>{fee.term}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem', borderRadius: '4px',
                      backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)',
                      fontSize: '0.8rem', fontWeight: 600
                    }}>
                      {fee.grade_level}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{fee.fee_type}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{formatTZS(fee.amount)}</td>
                  <td style={{ padding: '1rem' }}>
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={fee.id} />
                      <button type="submit" style={{
                        background: 'transparent', border: 'none', color: 'var(--color-error)',
                        fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
                      }}>
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {(!fees || fees.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No fee structures defined yet. Add some items using the form.
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
