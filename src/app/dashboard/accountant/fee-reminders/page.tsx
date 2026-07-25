import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import FeeRemindersForm from './FeeRemindersForm'
import { sendSMS, sendEmail } from '@/utils/notifications'
import { autoGenerateMissingInvoices, getCurrentTermAndYear } from '../actions'
import { isCurrentOrPast } from '@/utils/billing'

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

  // 1. Trigger auto-generation of missing invoices for current & past terms
  await autoGenerateMissingInvoices()

  // 2. Fetch current active term and year
  const { termName: currentTerm, academicYearName: currentYear } = await getCurrentTermAndYear()

  // 3. Fetch all unpaid or partially paid invoices joining students, profiles, and payments
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
    .neq('status', 'Paid')
    .order('created_at', { ascending: false })

  // 4. Filter to keep only current or past invoices, calculate actual amount due on client
  const outstandingInvoices = (invoices || [])
    .filter(inv => isCurrentOrPast(inv.academic_year, inv.term, currentYear, currentTerm))
    .map(inv => {
      const studentInfo: any = inv.student
      const prof: any = Array.isArray(studentInfo?.profiles) ? studentInfo.profiles[0] : studentInfo?.profiles
      const firstName = prof?.first_name || ''
      const lastName = prof?.last_name || ''
      const studentName = `${firstName} ${lastName}`.trim()
      const admissionNo = studentInfo?.student_id || studentInfo?.admission_number || ''

      const paid = (inv.payments as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0)
      const netAmount = Number(inv.net_amount || inv.total_amount)
      const outstanding = netAmount - paid

      return {
        ...inv,
        studentName,
        admissionNo,
        amount_due: outstanding
      }
    })
    .filter(inv => inv.amount_due > 0)

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

    // Fetch invoice details with payments and correct student profile join
    const { data: selectInvs } = await supabase
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
      .in('id', selectedInvoiceIds)

    if (selectInvs) {
      for (const inv of selectInvs) {
        const studentInfo: any = inv.student
        const prof: any = Array.isArray(studentInfo?.profiles) ? studentInfo.profiles[0] : studentInfo?.profiles
        const studentName = prof ? `${prof.first_name} ${prof.last_name}`.trim() : 'Student'
        
        // Calculate outstanding balance due
        const paid = (inv.payments as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0)
        const netAmount = Number(inv.net_amount || inv.total_amount)
        const outstanding = netAmount - paid

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
            profiles:parent_id (first_name, last_name, phone, email)
          `)
          .eq('student_id', inv.student_id)

        if (parents) {
          for (const link of parents) {
            const parentProfile: any = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles
            if (!parentProfile) continue

            // A. Create In-App Notification
            await supabase.from('notifications').insert({
              user_id: link.parent_id,
              message: msg,
              link_url: `/dashboard/parent/billing`
            })

            // B. Dispatch SMS
            if (parentProfile.phone) {
              await sendSMS(parentProfile.phone, msg)
            }

            // C. Dispatch Email Reminder
            if (parentProfile.email) {
              const parentName = `${parentProfile.first_name} ${parentProfile.last_name}`
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                  <h2 style="color: #3bb3c3;">Fee Outstanding Reminder</h2>
                  <p>Dear ${parentName},</p>
                  <p>${msg}</p>
                  <p>Please log in to your parent dashboard to view billing records and make payments.</p>
                  <br/>
                  <p>Best regards,</p>
                  <p><strong>Leaders International School Accounts Department</strong></p>
                </div>
              `
              await sendEmail(parentProfile.email, 'Outstanding Fee Payment Reminder', emailHtml)
            }

            // D. Dispatch Twilio WhatsApp statement PDF
            if (parentProfile.phone) {
              try {
                const { WhatsAppService } = await import('@/lib/whatsapp/WhatsAppService')
                const invNo = inv.invoice_number || `INV-${inv.id.substring(0, 8)}`
                const pdfBytes = await WhatsAppService.generateInvoicePDF(
                  invNo,
                  studentName,
                  studentInfo?.grade_level || '-',
                  inv.term,
                  netAmount,
                  paid,
                  new Date().toLocaleDateString()
                )
                const pdfUrl = await WhatsAppService.uploadInvoice(invNo, pdfBytes)
                
                const parentName = `${parentProfile.first_name} ${parentProfile.last_name}`
                const waMsg = `Dear ${parentName}, please find the outstanding fee statement for ${studentName} (${inv.term}) attached here: ${pdfUrl}`
                await WhatsAppService.sendWhatsAppPDF(parentProfile.phone, `Statement-${invNo}.pdf`, pdfUrl, waMsg)
              } catch (waErr) {
                console.error('[WHATSAPP REMINDER ERROR] Failed to send PDF statement via WhatsApp:', waErr)
              }
            }
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
