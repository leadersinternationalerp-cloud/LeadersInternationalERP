import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import PrintButton from '@/components/PrintButton'

export default async function PayslipsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const supabase = await createClient()

  // Resolve search parameters
  const params = await searchParams
  const selectedId = params.id

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser()

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function getMonthName(m: number) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return months[m - 1]
  }

  if (selectedId) {
    // 1. Fetch details of a single payslip
    const { data: payslip } = await supabase
      .from('payslips')
      .select(`
        *,
        profiles (
          first_name,
          last_name,
          role
        )
      `)
      .eq('id', selectedId)
      .eq('employee_id', user?.id)
      .single()

    if (!payslip) {
      return (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-error)' }}>Payslip Not Found</h2>
          <p>You do not have access to this payslip or it does not exist.</p>
          <Link href="/dashboard/staff/self-service/payslips" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Back to List
          </Link>
        </div>
      )
    }

    const earnings = payslip.details?.earnings || {}
    const deductions = payslip.details?.deductions || {}

    return (
      <div>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            header, aside, footer, nav, button, .btn, .no-print {
              display: none !important;
            }
            body, main, #printable-payslip {
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            h2, h3, span, div, td, th, strong {
              color: black !important;
            }
          }
        ` }} />
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link href="/dashboard/staff/self-service/payslips" className="btn" style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            ← Back to List
          </Link>
          <PrintButton label="Print Payslip 🖨️" className="btn btn-primary" />
        </div>

        {/* Detailed Payslip Box */}
        <div className="glass-panel" id="printable-payslip" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', maxWidth: '800px', margin: '0 auto', border: '1px solid var(--color-border)', backgroundColor: '#fff', color: '#000' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-primary)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-primary)' }}>LEADERS INTERNATIONAL SCHOOL</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Salary Payslip Statement</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{getMonthName(payslip.month)} {payslip.year}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status: <strong style={{ color: payslip.status === 'Paid' ? 'green' : 'orange' }}>{payslip.status}</strong></div>
            </div>
          </div>

          {/* Employee Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Employee Name:</span>
              <div style={{ fontWeight: 600 }}>{payslip.profiles?.first_name} {payslip.profiles?.last_name}</div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Designation / Role:</span>
              <div style={{ fontWeight: 600 }}>{payslip.profiles?.role}</div>
            </div>
          </div>

          {/* Earnings vs Deductions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
            {/* Earnings */}
            <div>
              <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>Earnings & Allowances</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Basic Salary:</span>
                  <span style={{ fontWeight: 600 }}>{formatTZS(payslip.basic_pay)}</span>
                </div>
                {Object.entries(earnings).map(([k, v]: any) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{k}:</span>
                    <span style={{ fontWeight: 600 }}>{formatTZS(v)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: '0.5rem', fontWeight: 700 }}>
                  <span>Gross Earnings:</span>
                  <span>{formatTZS(Number(payslip.basic_pay) + Number(payslip.total_allowances))}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem', color: 'red' }}>Deductions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                {Object.entries(deductions).map(([k, v]: any) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{k}:</span>
                    <span style={{ fontWeight: 600 }}>{formatTZS(v)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: '0.5rem', fontWeight: 700, color: 'red' }}>
                  <span>Total Deductions:</span>
                  <span>{formatTZS(payslip.total_deductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--color-primary)', paddingTop: '1.5rem', marginTop: '2rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>NET PAYABLE (TAKE HOME):</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatTZS(payslip.net_salary)}</span>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            This payslip is system-generated and does not require a physical signature. Confidential.
          </div>
        </div>
      </div>
    )
  }

  // 2. Fetch all payslips for list view
  const { data: payslips } = await supabase
    .from('payslips')
    .select('*')
    .eq('employee_id', user?.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        My Monthly Payslips
      </h1>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Month & Year</th>
              <th style={{ padding: '1rem' }}>Basic Pay</th>
              <th style={{ padding: '1rem' }}>Allowances</th>
              <th style={{ padding: '1rem' }}>Deductions</th>
              <th style={{ padding: '1rem' }}>Net Take Home</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payslips?.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{getMonthName(p.month)} {p.year}</td>
                <td style={{ padding: '1rem' }}>{formatTZS(p.basic_pay)}</td>
                <td style={{ padding: '1rem', color: 'var(--color-success)', fontWeight: 500 }}>+{formatTZS(p.total_allowances)}</td>
                <td style={{ padding: '1rem', color: 'var(--color-error)', fontWeight: 500 }}>-{formatTZS(p.total_deductions)}</td>
                <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatTZS(p.net_salary)}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: p.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(247, 178, 57, 0.1)',
                    color: p.status === 'Paid' ? 'var(--color-success)' : 'var(--color-accent)'
                  }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <Link href={`/dashboard/staff/self-service/payslips?id=${p.id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    View & Print
                  </Link>
                </td>
              </tr>
            ))}

            {(!payslips || payslips.length === 0) && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No monthly payslips issued yet. Payslips appear here once Accountant finalizes payroll.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
