'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { type FormState } from './CreateUserForm'

export async function createUserAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    return { error: 'Service role key not configured. Cannot create users.' }
  }

  // Create an admin client bypassing RLS to create Auth users
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const role = formData.get('role') as string

  if (!email || !password || !first_name || !last_name || !role) {
    return { error: 'All fields are required' }
  }

  try {
    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm for internal systems
      user_metadata: {
        first_name,
        last_name,
        role
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // 2. Insert into the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        first_name,
        last_name,
        email,
        role
      })

    if (profileError) {
      // Rollback auth user creation if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    revalidatePath('/dashboard/users')
    return { success: true, error: null }
  } catch (error: any) {
    return { error: error.message || 'An error occurred during user creation' }
  }
}
