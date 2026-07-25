import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { autoGenerateMissingInvoices, getCurrentTermAndYear } from '../actions'
import { isCurrentOrPast } from '@/utils/billing'

export default async function FeeBalancesPage() {
  const supabase = await createClient()

  // 1. Trigger auto-generation of missing invoices for current & past terms
  await autoGenerateMissingInvoices()

  // 2. Fetch current active term and year
  const { termName: currentTerm, academicYearName: currentYear } = await getCurrentTermAndYear()

  // 3. Fetch all invoices with students, profiles, and payments
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      student:student_id (
        id,
        student_id,
        admission_number,
        profiles (
          first_name,
          last_name
        )
      ),
      payments (
        amount
      )
    `)
    .order('due_date', { ascending: true })

  // Calculate aging
  const today = new Date()
  const aging = {
    current: 0,
    overdue_30: 0,
    overdue_60: 0,
    overdue_90_plus: 0
  }

  // 4. Filter to keep only current or past invoices, calculate amount_due on the client side, and categorize by overdue age
  const enhancedInvoices = (invoices || [])
    .filter(inv => isCurrentOrPast(inv.academic_year, inv.term, currentYear, currentTerm))
    .map(inv => {
      const studentInfo: any = inv.student
      const profile: any = Array.isArray(studentInfo?.profiles) ? studentInfo.profiles[0] : studentInfo?.profiles
      const firstName = profile?.first_name || ''
      const lastName = profile?.last_name || ''
      const studentName = `${firstName} ${lastName}`.trim()
      const admissionNo = studentInfo?.student_id || studentInfo?.admission_number || ''

      // Calculate actual unpaid amount due
      const netAmount = Number(inv.net_amount || inv.total_amount)
      const paid = (inv.payments as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0)
      const amountDue = netAmount - paid

      const dueDate = new Date(inv.due_date)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24))
      
      let bucket = 'Current'
      if (amountDue > 0) {
        if (daysOverdue > 90) { bucket = '90+ Days'; aging.overdue_90_plus += amountDue }
        else if (daysOverdue > 60) { bucket = '61-90 Days'; aging.overdue_60 += amountDue }
        else if (daysOverdue > 0) { bucket = '1-60 Days'; aging.overdue_30 += amountDue }
        else { aging.current += amountDue }
      }

      return { 
        ...inv, 
        studentName,
        admissionNo,
        amount_due: amountDue,
        daysOverdue, 
        bucket 
      }
    })
    .filter(inv => inv.amount_due > 0) // Only display invoices that have a pending unpaid balance

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Fee Balances (A/R Aging)</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ textDecoration: 'none' }}>Export Excel</button>
          <button className="btn-secondary" style={{ textDecoration: 'none' }}>Print PDF</button>
        </div>
      </div>

      {/* Aging Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Current (Not Due)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>TZS {aging.current.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>1-60 Days Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-warning)' }}>TZS {aging.overdue_30.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>61-90 Days Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-warning)' }}>TZS {aging.overdue_60.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>90+ Days Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-error)' }}>TZS {aging.overdue_90_plus.toLocaleString()}</div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Student</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Invoice Ref</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Due Date</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Aging Bucket</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Balance Due</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {enhancedInvoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>
                  <div>{inv.studentName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>ID: {inv.admissionNo}</div>
                </td>
                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{inv.id.substring(0, 8).toUpperCase()}</td>
                <td style={{ padding: '1rem' }}>{new Date(inv.due_date).toLocaleDateString()}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.8rem',
                    backgroundColor: inv.daysOverdue > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: inv.daysOverdue > 0 ? 'var(--color-warning)' : 'var(--color-primary)'
                  }}>
                    {inv.bucket}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>TZS {inv.amount_due.toLocaleString()}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Send Reminder</button>
                </td>
              </tr>
            ))}
            {enhancedInvoices.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>
                  All current and past invoices are paid in full. No outstanding balances.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
