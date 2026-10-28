'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { type FormState } from './LoginForm'
import { createServiceClient } from '@/utils/supabase/service'
import { sanitizePostgrestValue } from '@/lib/sanitize'

export async function loginAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  
  const rawUsernameOrEmail = (formData.get('username') as string || '').trim()
  const password = formData.get('password') as string // password for Admin, PIN for non-admin
  
  if (!rawUsernameOrEmail || !password) {
    return { error: 'Username/Email and Password/PIN are required' }
  }

  const term = sanitizePostgrestValue(rawUsernameOrEmail)
  if (!term || term !== rawUsernameOrEmail) {
    // If the input contained characters stripped by sanitization (, " ( ) \ %), fail closed
    return { error: 'Invalid username/email or password/PIN' }
  }

  // 1. Resolve email and fetch profile by username or email
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, email, role, roles, failed_attempts, locked_until, force_pin_change')
    .or([`username.eq.${term}`, `email.eq.${term}`].join(','))
    .maybeSingle()

  if (profileError || !profile) {
    return { error: 'Invalid username/email or password/PIN' }
  }

  const resolvedEmail = profile.email
  const roles = profile.roles || (profile.role ? profile.role.split(',').map((r: string) => r.trim()) : [])
  const isSystemAdmin = roles.includes('System Admin')

  // 2. Check database-level lockout status
  if (profile.locked_until) {
    const lockDate = new Date(profile.locked_until)
    if (lockDate > new Date()) {
      const minutesRemaining = Math.ceil((lockDate.getTime() - Date.now()) / (60 * 1000))
      return { error: `Too many failed attempts. Account locked. Try again in ${minutesRemaining} minutes.` }
    }
  }

  // 3. For non-admins, validate PIN format (6 to 10 digits only)
  if (!isSystemAdmin) {
    const pinRegex = /^[0-9]{6,10}$/
    if (!pinRegex.test(password)) {
      return { error: 'PIN must be a numeric code between 6 and 10 digits' }
    }
  }

  // 4. Perform Supabase authentication
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password: password
  })

  if (authError) {
    const newAttempts = (profile.failed_attempts || 0) + 1
    const updateData: { failed_attempts: number; locked_until?: string | null } = { failed_attempts: newAttempts }
    let errorMsg = `${authError.message} (${Math.max(0, 5 - newAttempts)} attempts remaining before lockout)`

    if (newAttempts >= 5) {
      const lockoutDate = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      updateData.locked_until = lockoutDate
      updateData.failed_attempts = 0
      errorMsg = 'Too many failed login attempts. Account locked for 15 minutes.'
    }

    await serviceClient
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)

    return { error: errorMsg }
  }

  // 5. Success: clear failed attempts and lockout in DB
  await serviceClient
    .from('profiles')
    .update({ failed_attempts: 0, locked_until: null })
    .eq('id', profile.id)

  // 6. First login redirection check or forced PIN change
  const userMetadata = data.user?.user_metadata
  if (userMetadata?.first_login === true || profile.force_pin_change === true) {
    redirect('/first-login')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
