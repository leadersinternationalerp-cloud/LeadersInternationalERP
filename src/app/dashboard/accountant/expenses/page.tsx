import { createClient } from '@/utils/supabase/server'
import { saveExpenseAction } from '../actions'

export default async function ExpensesPage() {
  const supabase = await createClient()

  // Fetch recorded expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('date', { ascending: false })

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        School Expenses Tracking
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Record Expense Form */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Record School Expense</h2>

          <form action={saveExpenseAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Expense Category</label>
              <select name="category" className="input-field" required>
                <option value="Utilities">Utilities</option>
                <option value="Supplies">Supplies</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Transport">Transport</option>
                <option value="Events">Events</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (TZS)</label>
              <input type="number" name="amount" min="1" placeholder="e.g. 80000" className="input-field" required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" placeholder="Describe the expenditure..." className="input-field" style={{ minHeight: '60px', resize: 'vertical' }} required />
            </div>

            <div className="form-group">
              <label className="form-label">Date of Expense</label>
              <input type="date" name="date" className="input-field" required defaultValue={new Date().toISOString().slice(0,10)} />
            </div>

            {/* In a real app we'd allow uploading a receipt image/PDF. For now we put a placeholder input link */}
            <div className="form-group">
              <label className="form-label">Receipt File Link (Optional)</label>
              <input type="text" name="receipt_url" placeholder="Paste link or path to file" className="input-field" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
              Record Expense
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Category</th>
                <th style={{ padding: '1rem' }}>Description</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Approved By</th>
                <th style={{ padding: '1rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses?.map((exp: any) => (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem', borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                      fontSize: '0.8rem', fontWeight: 600
                    }}>
                      {exp.category}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>{exp.description}</div>
                    {exp.receipt_url && (
                      <a href={exp.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', textDecoration: 'none' }}>
                        View Receipt ↗
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{formatTZS(exp.amount)}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {exp.profiles?.first_name} {exp.profiles?.last_name}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {new Date(exp.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {(!expenses || expenses.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No expenses recorded yet.
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
