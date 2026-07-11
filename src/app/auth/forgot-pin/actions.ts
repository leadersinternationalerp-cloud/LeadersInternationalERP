'use server'

import { createServiceClient } from '@/utils/supabase/service'

export type ForgotPinState = {
  error?: string
  success?: boolean
  email?: string
}

export async function sendOtpAction(prevState: ForgotPinState, formData: FormData): Promise<ForgotPinState> {
  const email = formData.get('email') as string
  if (!email) {
    return { error: 'Email is required' }
  }

  const supabase = createServiceClient()

  // 1. Fetch user by email in profiles to get user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name')
    .eq('email', email)
    .single()

  if (profileError || !profile) {
    return { error: 'No user account found with this email' }
  }

  // 2. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins

  // 3. Update auth user metadata with OTP and expiry
  const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
    user_metadata: {
      otp,
      otp_expires_at: expiresAt
    }
  })

  if (updateError) {
    console.error('Error setting OTP metadata:', updateError.message)
    return { error: 'Failed to generate reset code. Try again.' }
  }

  // 4. Create in-app notification first
  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: profile.id,
    message: `Security alert: Your temporary PIN reset OTP code is ${otp}. It will expire in 30 minutes.`,
    link_url: null
  })

  if (notifError) {
    console.error('Error creating OTP notification:', notifError.message)
  }

  // 5. Console simulation
  console.log(`[RESET OTP SENDER] Sent OTP ${otp} to ${email} (Expires: ${expiresAt})`)

  return { success: true, email }
}

export async function resetPinAction(prevState: ForgotPinState, formData: FormData): Promise<ForgotPinState> {
  const email = formData.get('email') as string
  const otp = formData.get('otp') as string
  const newPin = formData.get('newPin') as string
  const confirmPin = formData.get('confirmPin') as string

  if (!email || !otp || !newPin || !confirmPin) {
    return { error: 'All fields are required', email }
  }

  if (newPin !== confirmPin) {
    return { error: 'New PIN and confirmation do not match', email }
  }

  if (newPin.length < 6) {
    return { error: 'PIN/Password must be at least 6 characters long', email }
  }

  const supabase = createServiceClient()

  // 1. Fetch profile to get ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (profileError || !profile) {
    return { error: 'No user account found with this email', email }
  }

  // 2. Fetch auth user to inspect metadata
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.id)
  if (userError || !user) {
    return { error: 'Failed to retrieve auth user record', email }
  }

  const metaOtp = user.user_metadata?.otp
  const metaExpiry = user.user_metadata?.otp_expires_at

  // 3. Validate OTP
  if (!metaOtp || metaOtp !== otp) {
    return { error: 'Invalid verification OTP code', email }
  }

  if (new Date(metaExpiry) < new Date()) {
    return { error: 'Reset OTP has expired. Please request a new one.', email }
  }

  // 4. Update password and clear OTP metadata
  const { error: resetError } = await supabase.auth.admin.updateUserById(profile.id, {
    password: newPin,
    user_metadata: {
      otp: null,
      otp_expires_at: null,
      first_login: false // bypass first login since they just reset it
    }
  })

  if (resetError) {
    console.error('Error resetting password/PIN:', resetError.message)
    return { error: `Failed to reset PIN: ${resetError.message}`, email }
  }

  // 5. In-app confirmation
  await supabase.from('notifications').insert({
    user_id: profile.id,
    message: 'Your account password/PIN was successfully reset. You can now log in.',
    link_url: null
  })

  return { success: true }
}
