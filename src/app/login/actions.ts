'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { type FormState } from './LoginForm'

export async function loginAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string 
  
  if (!email || !password) {
    return { error: 'Email and Password/PIN are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
