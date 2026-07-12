import { createClient } from '@/utils/supabase/server'

/**
 * Logs a system action into the audit_logs table.
 * @param action - A concise string describing the action (e.g., 'Payment Recorded', 'Leave Approved')
 * @param target_table - The affected database table (e.g., 'payments', 'leave_applications')
 * @param details - Additional JSON data (e.g., amount, target ID)
 */
export async function logAuditAction(action: string, target_table?: string, details?: any) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    // Attempt to log the action
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null, // null if system automated
      action,
      target_table,
      details: details || {}
    })
  } catch (error) {
    console.error('[AUDIT LOG FAILED]', error)
  }
}
