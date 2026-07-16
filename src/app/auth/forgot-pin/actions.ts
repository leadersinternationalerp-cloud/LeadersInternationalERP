'use server'

import { createServiceClient } from '@/utils/supabase/service'

export type ForgotPinState = {
  error?: string
  success?: boolean
  email?: string
}

export async function sendOtpAction(prevState: ForgotPinState, formData: FormData): Promise<ForgotPinState> {
  const usernameOrEmail = (formData.get('usernameOrEmail') as string || '').trim()
  if (!usernameOrEmail) {
    return { error: 'Username or Email is required' }
  }

  const supabase = createServiceClient()

  // 1. Fetch user by username or email in profiles to get user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, first_name')
    .or(`username.eq."${usernameOrEmail}",email.eq."${usernameOrEmail}"`)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: 'No user account found with this username or email' }
  }

  const email = profile.email

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

  const supabase = createServiceClient()
 
   // 1. Fetch profile to get ID and roles
   const { data: profile, error: profileError } = await supabase
     .from('profiles')
     .select('id, roles, role')
     .eq('email', email)
     .single()
 
   if (profileError || !profile) {
     return { error: 'No user account found with this email', email }
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
 
   // 4.1 Update pin_hash in profiles table
   let pinHash = null
   if (!isSystemAdmin) {
     const crypto = require('crypto')
     pinHash = crypto.createHash('sha256').update(newPin).digest('hex')
   }
 
   await supabase
     .from('profiles')
     .update({
       pin_hash: pinHash,
       updated_at: new Date().toISOString()
     })
     .eq('id', profile.id)
 
   // 5. In-app confirmation
   await supabase.from('notifications').insert({
     user_id: profile.id,
     message: 'Your account password/PIN was successfully reset. You can now log in.',
     link_url: null
   })
 
   return { success: true }
}
