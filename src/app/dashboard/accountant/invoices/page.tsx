import { createClient } from '@/utils/supabase/server'
import { generateInvoicesAction } from '../actions'

export default async function InvoicesPage() {
  const supabase = await createClient()

  // Fetch all invoices joining students and profiles
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      *,
      students (
        id,
        student_id,
        grade_level,
        profiles (
          first_name,
          last_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Server action handler to trigger generation
  async function handleBulkGenerate(formData: FormData) {
    'use server'
    const academic_year = formData.get('academic_year') as string
    const term = formData.get('term') as string
    const grade_level = formData.get('grade_level') as string
    const due_date = formData.get('due_date') as string

    if (academic_year && term && grade_level && due_date) {
      await generateInvoicesAction(academic_year, term, grade_level, due_date)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Invoices & Billing Manager
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '2rem', alignItems: 'start' }}>
        {/* Bulk Invoices Generation Panel */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Bulk Invoice Generator</h2>
          
          <form action={handleBulkGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              <label className="form-label">Target Grade Level</label>
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
              <label className="form-label">Due Date</label>
              <input type="date" name="due_date" className="input-field" required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
              Generate Invoices
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              Generates invoices for all enrolled students in the grade level, including any outstanding balances carried forward from previous terms.
            </p>
          </form>
        </div>

        {/* Invoices List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Student Name</th>
                <th style={{ padding: '1rem' }}>Class / Grade</th>
                <th style={{ padding: '1rem' }}>Term</th>
                <th style={{ padding: '1rem' }}>Amount Billed</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((inv: any) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {inv.students?.student_id}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{inv.students?.grade_level}</td>
                  <td style={{ padding: '1rem' }}>{inv.term}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    {formatTZS(inv.net_amount)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 
                        inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 
                        inv.status === 'Partially Paid' ? 'rgba(247, 178, 57, 0.1)' : 
                        'rgba(239, 68, 68, 0.1)',
                      color: 
                        inv.status === 'Paid' ? 'var(--color-success)' : 
                        inv.status === 'Partially Paid' ? 'var(--color-accent)' : 
                        'var(--color-error)'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {new Date(inv.due_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No invoices generated yet.
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
