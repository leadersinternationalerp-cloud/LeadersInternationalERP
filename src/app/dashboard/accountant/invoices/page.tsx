import { createServiceClient } from '@/utils/supabase/service'
import { ensureMissingAdmissionInvoices } from '@/lib/admissions/ensureAdmissionInvoices'
import { getSessionUser } from '@/lib/auth/session'
import { hasAnyRole } from '@/lib/auth/roles'
import { generateInvoicesAction } from '../actions'
import InvoicesClient from './InvoicesClient'

const INVOICE_ACCESS_ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Head of Section',
  'Accountant',
  'Receptionist',
] as const

export default async function InvoicesPage() {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, INVOICE_ACCESS_ROLES)) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)', fontWeight: 600 }}>
        Access Denied. You do not have permission to view student invoices.
      </div>
    )
  }

  const supabase = createServiceClient()

  // Fetch all invoices joining students, profiles, and payments
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select(`
      *,
      students:student_id (
        id,
        student_id,
        grade_level,
        profiles!students_id_fkey (
          first_name,
          last_name,
          email
        )
      ),
      payments (
        amount
      )
    `)
    .order('created_at', { ascending: false })

  const invoices = (invoicesRaw || []).map((inv) => {
    const paid = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    return {
      ...inv,
      total_paid: paid,
      students: inv.students,
    }
  })

  // Backfill & fetch admission form invoices (TZS 30,000)
  let admissionInvoices: any[] = []
  try {
    await ensureMissingAdmissionInvoices(supabase)
    const { data: admInvRaw } = await supabase
      .from('admission_invoices')
      .select(`
        *,
        admission_applications:application_id (
          id,
          application_no,
          first_name,
          middle_name,
          last_name,
          curriculum,
          class_applied_for,
          start_term,
          parent_name,
          parent_phone,
          parent_email,
          source,
          sales_agent_name
        )
      `)
      .order('created_at', { ascending: false })
    admissionInvoices = admInvRaw || []
  } catch (admErr) {
    console.warn('[invoices/page] admission_invoices query notice:', admErr)
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
        Student Invoices & Billing Manager
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '2rem', alignItems: 'start' }}>
        {/* Bulk Invoices Generation Panel */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Bulk Invoice Generator</h2>

          <form action={handleBulkGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <select name="academic_year" className="input-field" required defaultValue="2027">
                <option value="2027">2027</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
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
                <optgroup label="Cambridge Wing">
                  <option value="Cambridge Year 1">Cambridge Year 1</option>
                  <option value="Cambridge Year 2">Cambridge Year 2</option>
                  <option value="Cambridge Year 3">Cambridge Year 3</option>
                  <option value="Cambridge Year 4">Cambridge Year 4</option>
                  <option value="Cambridge Year 5">Cambridge Year 5</option>
                  <option value="Cambridge Year 6">Cambridge Year 6</option>
                </optgroup>
                <optgroup label="NECTA Wing">
                  <option value="Baby Class">Baby Class</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" name="due_date" className="input-field" required defaultValue="2027-01-08" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
              Generate Invoices
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              Generates invoices for all enrolled students in the grade level, including any outstanding balances
              carried forward from previous terms.
            </p>
          </form>
        </div>

        {/* Invoices List */}
        <InvoicesClient initialInvoices={invoices || []} initialAdmissionInvoices={admissionInvoices} />
      </div>
    </div>
  )
}
