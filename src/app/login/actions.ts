'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { type FormState } from './LoginForm'
import { cookies } from 'next/headers'

export async function loginAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const cookieStore = await cookies()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string // acts as password for Admin, PIN for non-admin
  
  if (!email || !password) {
    return { error: 'Email and Password/PIN are required' }
  }

  // 1. Check lockout status
  const lockoutUntil = cookieStore.get('lockout_until')?.value
  if (lockoutUntil) {
    const lockoutDate = new Date(lockoutUntil)
    if (lockoutDate > new Date()) {
      const minutesRemaining = Math.ceil((lockoutDate.getTime() - Date.now()) / (60 * 1000))
      return { error: `Too many failed login attempts. Account locked. Try again in ${minutesRemaining} minutes.` }
    }
  }

  // 2. Perform authentication
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password, // For non-admin, the seeded PIN acts as their auth password
  })

  if (error) {
    // Increment failed attempts
    const failedAttempts = parseInt(cookieStore.get('failed_attempts')?.value || '0') + 1
    if (failedAttempts >= 5) {
      const until = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      cookieStore.set('lockout_until', until, { maxAge: 15 * 60 })
      cookieStore.set('failed_attempts', '0', { maxAge: 15 * 60 })
      return { error: 'Too many failed login attempts. Account locked for 15 minutes.' }
    } else {
      cookieStore.set('failed_attempts', failedAttempts.toString(), { maxAge: 15 * 60 })
      return { error: `${error.message} (${5 - failedAttempts} attempts remaining before lockout)` }
    }
  }

  // 3. Clear failed attempts on success
  cookieStore.delete('failed_attempts')
  cookieStore.delete('lockout_until')

  // 4. First login PIN/password check
  const userMetadata = data.user?.user_metadata
  if (userMetadata?.first_login === true) {
    redirect('/first-login')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
