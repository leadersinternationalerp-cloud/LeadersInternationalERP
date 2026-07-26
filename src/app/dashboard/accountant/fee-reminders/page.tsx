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
        grade_level,
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

  // 4. Group by student, calculating aggregated amounts for current/past terms
  const groupedInvoicesMap = new Map<string, any>()

  ;(invoices || [])
    .filter(inv => isCurrentOrPast(inv.academic_year, inv.term, currentYear, currentTerm))
    .forEach(inv => {
      const studentInfo: any = inv.student
      const prof: any = Array.isArray(studentInfo?.profiles) ? studentInfo.profiles[0] : studentInfo?.profiles
      const firstName = prof?.first_name || ''
      const lastName = prof?.last_name || ''
      const studentName = `${firstName} ${lastName}`.trim()
      const admissionNo = studentInfo?.student_id || studentInfo?.admission_number || ''
      const gradeLevel = studentInfo?.grade_level || 'Unknown'

      const paid = (inv.payments as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0)
      const netAmount = Number(inv.net_amount || inv.total_amount)
      const outstanding = netAmount - paid

      if (outstanding > 0) {
        if (!groupedInvoicesMap.has(studentInfo.id)) {
          groupedInvoicesMap.set(studentInfo.id, {
            id: studentInfo.id, // Using student.id as row ID
            student_id: studentInfo.id,
            studentName,
            admissionNo,
            gradeLevel,
            total_net_amount: 0,
            total_paid: 0,
            amount_due: 0,
            terms: [],
            invoiceIds: []
          })
        }
        
        const group = groupedInvoicesMap.get(studentInfo.id)
        group.total_net_amount += netAmount
        group.total_paid += paid
        group.amount_due += outstanding
        if (!group.terms.includes(inv.term)) group.terms.push(inv.term)
        group.invoiceIds.push(inv.id)
      }
    })

  const outstandingStudents = Array.from(groupedInvoicesMap.values())

  // Server Action to trigger fee reminders to parents
  async function handleSendFeeRemindersAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { WhatsAppService } = await import('@/lib/whatsapp/WhatsAppService')
    const { isCurrentOrPast } = await import('@/utils/billing')
    const { termName: currTerm, academicYearName: currYear } = await getCurrentTermAndYear()
    
    // Parse selected student IDs
    const selectedStudentIds: string[] = []
    formData.forEach((value, key) => {
      if (key.startsWith('student_')) {
        selectedStudentIds.push(value as string)
      }
    })

    if (selectedStudentIds.length === 0) return

    // Fetch invoice details for these students
    const { data: selectInvs } = await supabase
      .from('invoices')
      .select(`
        *,
        student:student_id (
          id,
          student_id,
          admission_number,
          grade_level,
          profiles (
            first_name,
            last_name
          )
        ),
        payments (
          amount
        )
      `)
      .in('student_id', selectedStudentIds)
      .neq('status', 'Paid')

    if (selectInvs) {
      // Group the invoices by student to construct the message
      const studentGroups = new Map<string, any>()

      for (const inv of selectInvs) {
        if (!isCurrentOrPast(inv.academic_year, inv.term, currYear, currTerm)) continue
        
        const studentInfo: any = inv.student
        if (!studentInfo) continue

        const paid = (inv.payments as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0)
        const netAmount = Number(inv.net_amount || inv.total_amount)
        const outstanding = netAmount - paid

        if (outstanding <= 0) continue

        if (!studentGroups.has(studentInfo.id)) {
          const prof: any = Array.isArray(studentInfo.profiles) ? studentInfo.profiles[0] : studentInfo.profiles
          const studentName = prof ? `${prof.first_name} ${prof.last_name}`.trim() : 'Student'
          
          studentGroups.set(studentInfo.id, {
            studentId: studentInfo.id,
            studentName,
            totalOutstanding: 0,
            breakdown: []
          })
        }

        const group = studentGroups.get(studentInfo.id)
        group.totalOutstanding += outstanding

        const fmtAmt = new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0 }).format(outstanding)
        group.breakdown.push(`- ${inv.term} (${inv.academic_year}): TZS ${fmtAmt}`)
      }

      // Dispatch WhatsApp for each student group
      for (const group of studentGroups.values()) {
        const totalFmt = new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0 }).format(group.totalOutstanding)
        
        const msg = `*Fee Reminder*\nDear Parent, an outstanding balance of *TZS ${totalFmt}* is due for *${group.studentName}* for current and past terms.\n\n*Breakdown:*\n${group.breakdown.join('\n')}\n\nPlease clear the balance promptly. For queries, contact the Accounts Office.`

        // Fetch parent links
        const { data: parents } = await supabase
          .from('student_parents')
          .select(`
            parent_id,
            profiles:parent_id (first_name, last_name, phone)
          `)
          .eq('student_id', group.studentId)

        if (parents) {
          for (const link of parents) {
            const parentProfile: any = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles
            if (!parentProfile || !parentProfile.phone) continue

            // A. Create In-App Notification
            await supabase.from('notifications').insert({
              user_id: link.parent_id,
              message: msg,
              link_url: `/dashboard/parent/billing`
            })

            // B. Dispatch WhatsApp Message
            await WhatsAppService.sendWhatsAppText(parentProfile.phone, msg)
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
        {/* Main Content Area */}
        <div style={{ padding: '2rem' }}>
          {outstandingStudents.length > 0 ? (
            <FeeRemindersForm
              invoices={outstandingStudents}
              sendRemindersAction={handleSendFeeRemindersAction}
            />
          ) : (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
              No outstanding balances found. All student invoices are fully paid!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
