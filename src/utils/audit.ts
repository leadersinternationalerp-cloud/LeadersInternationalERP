import { createClient } from '@/utils/supabase/server'

export async function logAuditAction(
  userId: string | undefined,
  action: string,
  targetTable?: string,
  details?: any,
  ipAddress?: string
) {
  try {
    const supabase = await createClient()
    
    // Resolve user ID if not provided explicitly (from active session)
    let finalUserId = userId
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        finalUserId = user.id
      }
    }

    if (!finalUserId) {
      console.warn(`[AUDIT LOG WARNING] Attempted to log action "${action}" but no user ID could be resolved.`)
      return
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: finalUserId,
      action,
      target_table: targetTable || null,
      details: details || {},
      ip_address: ipAddress || '127.0.0.1'
    })

    if (error) {
      console.error(`[AUDIT LOG ERROR] Failed to write audit log: ${error.message}`)
    } else {
      console.log(`[AUDIT LOG] ${finalUserId} performed "${action}" on table "${targetTable || 'N/A'}"`)
    }
  } catch (err) {
    console.error(`[AUDIT LOG EXCEPTION] Failed to run logAuditAction:`, err)
  }
}
