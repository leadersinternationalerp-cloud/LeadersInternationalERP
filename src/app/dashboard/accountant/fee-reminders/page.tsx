import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import FeeRemindersForm from './FeeRemindersForm'

export default async function AccountantFeeRemindersPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Accountant') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all unpaid or partially paid invoices with student profile details
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      student:student_id (
        id,
        student_id,
        profiles:id (first_name, last_name)
      )
    `)
    .neq('status', 'Paid')
    .order('created_at', { ascending: false })

  const outstandingInvoices = invoices || []

  // Server Action to trigger fee reminders to parents
  async function handleSendFeeRemindersAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    
    // Parse selected invoice IDs
    const selectedInvoiceIds: string[] = []
    formData.forEach((value, key) => {
      if (key.startsWith('invoice_')) {
        selectedInvoiceIds.push(value as string)
      }
    })

    if (selectedInvoiceIds.length === 0) return

    // Fetch the invoice details for selected IDs
    const { data: selectInvs } = await supabase
      .from('invoices')
      .select(`
        *,
        student:student_id (
          id,
          profiles:id (first_name, last_name)
        )
      `)
      .in('id', selectedInvoiceIds)

    if (selectInvs) {
      for (const inv of selectInvs) {
        const studentName = `${(inv.student as any)?.profiles?.first_name} ${(inv.student as any)?.profiles?.last_name}`
        const outstanding = Number(inv.net_amount) - Number(inv.paid_amount)
        const formattedAmt = new Intl.NumberFormat('en-TZ', {
          style: 'currency',
          currency: 'TZS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(outstanding)

        const msg = `Fee Reminder: An outstanding balance of ${formattedAmt} is due for ${studentName} (${inv.term}). Please clear the balance promptly.`

        // Fetch parent links
        const { data: parents } = await supabase
          .from('student_parents')
          .select(`
            parent_id,
            profiles:parent_id (phone)
          `)
          .eq('student_id', inv.student_id)

        if (parents) {
          for (const link of parents) {
            // A. Create In-App Notification
            await supabase.from('notifications').insert({
              user_id: link.parent_id,
              message: msg,
              link_url: `/dashboard/parent/billing`
            })

            // B. Simulate SMS
            const parentPhone = (link.profiles as any)?.phone || '+255770000000'
            console.log(`[SMS SENDER] Sending to ${parentPhone}: "${msg}"`)
          }
        }
      }
    }

    revalidatePath('/dashboard/accountant/fee-reminders')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Fee Outstanding Reminders
        </h1>
        <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {outstandingInvoices.length > 0 ? (
          <FeeRemindersForm
            invoices={outstandingInvoices}
            sendRemindersAction={handleSendFeeRemindersAction}
          />
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
            No outstanding balances found. All student invoices are fully paid!
          </div>
        )}
      </div>
    </div>
  )
}
