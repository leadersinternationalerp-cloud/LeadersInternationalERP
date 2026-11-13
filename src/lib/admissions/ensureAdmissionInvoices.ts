import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ensures every existing record in `admission_applications` has a persisted
 * TZS 30,000 invoice row in `admission_invoices`.
 */
export async function ensureMissingAdmissionInvoices(supabase: SupabaseClient) {
  try {
    const [{ data: apps, error: appsErr }, { data: existingInvs, error: invsErr }] = await Promise.all([
      supabase.from('admission_applications').select('id, application_no'),
      supabase.from('admission_invoices').select('application_id'),
    ])

    if (appsErr || invsErr || !apps?.length) {
      return
    }

    const existingSet = new Set((existingInvs || []).map((i: { application_id: string }) => i.application_id))
    const missing = apps
      .filter((a: { id: string; application_no: string }) => !existingSet.has(a.id))
      .map((a: { id: string; application_no: string }) => ({
        application_id: a.id,
        invoice_no: `INV-${a.application_no}`,
        amount: 30000,
        currency: 'TZS',
        status: 'unpaid',
      }))

    if (missing.length > 0) {
      const { error: upsertErr } = await supabase
        .from('admission_invoices')
        .upsert(missing, { onConflict: 'application_id', ignoreDuplicates: true })

      if (upsertErr) {
        console.warn('[ensureMissingAdmissionInvoices] upsert warning:', upsertErr.message)
      }
    }
  } catch (err) {
    console.warn('[ensureMissingAdmissionInvoices] notice:', err)
  }
}
