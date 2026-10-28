'use server'

import crypto from 'crypto'
import { createServiceClient } from '@/utils/supabase/service'
import { sanitizePostgrestValue } from '@/lib/sanitize'
import { sendMail, esc } from '@/lib/email/mailer'

export type ForgotPinState = {
  error?: string
  success?: boolean
  email?: string
}

function computeOtpHash(otp: string, userId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'lis-otp-secret-salt'
  return crypto.createHash('sha256').update(`${otp}:${userId}:${secret}`).digest('hex')
}

export async function sendOtpAction(prevState: ForgotPinState, formData: FormData): Promise<ForgotPinState> {
  const usernameOrEmail = (formData.get('usernameOrEmail') as string || '').trim()
  if (!usernameOrEmail) {
    return { error: 'Username or Email is required' }
  }

  const supabase = createServiceClient()
  const term = sanitizePostgrestValue(usernameOrEmail)
  
  if (!term || term !== usernameOrEmail) {
    // Fail safely with generic response to avoid query injection and account enumeration
    return { success: true, email: usernameOrEmail }
  }

  // 1. Fetch user by username or email in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name')
    .or([`username.eq.${term}`, `email.eq.${term}`].join(','))
    .maybeSingle()

  if (!profile || !profile.email) {
    // Return generic success to prevent account enumeration
    return { success: true, email: usernameOrEmail }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // 2. Rate-limit checks: max 3 requests per account per hour
  const { count: userAttempts } = await supabase
    .from('otp_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .gte('created_at', oneHourAgo)

  if ((userAttempts || 0) >= 3) {
    // Rate limited, return generic response without executing email
    return { success: true, email: profile.email }
  }

  // 3. Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString()
  const otpHash = computeOtpHash(otp, profile.id)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins

  // 4. Record OTP in database
  await supabase.from('otp_requests').insert({
    user_id: profile.id,
    otp_hash: otpHash,
    expires_at: expiresAt,
    attempts: 0,
    is_used: false,
  })

  // 5. Send OTP via email only
  await sendMail({
    to: profile.email,
    subject: 'Verification Code - Leaders International ERP',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Password / PIN Reset Request</h2>
        <p>Hello ${esc(profile.first_name || 'User')},</p>
        <p>A PIN reset was requested for your account. Use the verification code below:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px 0; color: #00264b;">
          ${otp}
        </div>
        <p>This code will expire in 15 minutes. If you did not make this request, you can safely ignore this email.</p>
      </div>
    `,
    text: `Your verification code is: ${otp}. It will expire in 15 minutes.`,
    template: 'pin_reset_otp'
  })

  return { success: true, email: profile.email }
}

export async function resetPinAction(prevState: ForgotPinState, formData: FormData): Promise<ForgotPinState> {
  const email = (formData.get('email') as string || '').trim()
  const otp = (formData.get('otp') as string || '').trim()
  const newPin = (formData.get('newPin') as string || '').trim()
  const confirmPin = (formData.get('confirmPin') as string || '').trim()

  if (!email || !otp || !newPin || !confirmPin) {
    return { error: 'All fields are required', email }
  }

  if (newPin !== confirmPin) {
    return { error: 'New PIN and confirmation do not match', email }
  }

  const supabase = createServiceClient()

  // 1. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, roles, role')
    .eq('email', email)
    .maybeSingle()

  if (!profile) {
    return { error: 'Invalid verification attempt', email }
  }

  const roles = profile.roles || (profile.role ? profile.role.split(',').map((r: string) => r.trim()) : [])
  const isSystemAdmin = roles.includes('System Admin')

  if (!isSystemAdmin) {
    const pinRegex = /^[0-9]{6,10}$/
    if (!pinRegex.test(newPin)) {
      return { error: 'PIN must be a numeric code between 6 and 10 digits', email }
    }
  } else {
    if (newPin.length < 6) {
      return { error: 'Password must be at least 6 characters long', email }
    }
  }

  // 2. Fetch active OTP request
  const now = new Date().toISOString()
  const { data: otpRow } = await supabase
    .from('otp_requests')
    .select('id, otp_hash, attempts, expires_at')
    .eq('user_id', profile.id)
    .eq('is_used', false)
    .gte('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otpRow) {
    return { error: 'Invalid or expired verification code. Please request a new one.', email }
  }

  if ((otpRow.attempts || 0) >= 5) {
    await supabase.from('otp_requests').update({ is_used: true }).eq('id', otpRow.id)
    return { error: 'Too many incorrect attempts. Please request a new code.', email }
  }

  const expectedHash = computeOtpHash(otp, profile.id)
  if (expectedHash !== otpRow.otp_hash) {
    await supabase
      .from('otp_requests')
      .update({ attempts: (otpRow.attempts || 0) + 1 })
      .eq('id', otpRow.id)
    return { error: 'Invalid verification code', email }
  }

  // 3. Mark OTP as used
  await supabase
    .from('otp_requests')
    .update({ is_used: true })
    .eq('id', otpRow.id)

  // 4. Update auth user password
  const { error: resetError } = await supabase.auth.admin.updateUserById(profile.id, {
    password: newPin,
  })

  if (resetError) {
    return { error: `Failed to reset PIN: ${resetError.message}`, email }
  }

  // 5. Update profiles table
  let pinHash = null
  if (!isSystemAdmin) {
    pinHash = crypto.createHash('sha256').update(newPin).digest('hex')
  }

  await supabase
    .from('profiles')
    .update({
      pin_hash: pinHash,
      force_pin_change: false,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id)

  return { success: true }
}
