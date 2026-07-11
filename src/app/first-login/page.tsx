import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function FirstLoginPage() {
  const supabase = await createClient()

  // Verify that the user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if they actually need to be here
  if (user.user_metadata?.first_login !== true) {
    redirect('/dashboard')
  }

  // Server action to update PIN/password
  async function handleFirstLoginSetup(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
      return
    }

    if (password !== confirmPassword) {
      return
    }

    if (password.length < 6) {
      return
    }

    // 1. Update Auth password/PIN
    const { error: pwdError } = await supabase.auth.updateUser({
      password: password
    })

    if (pwdError) {
      console.error('Failed to update password:', pwdError.message)
      return
    }

    // 2. Clear first_login flag from user metadata
    const { error: metaError } = await supabase.auth.updateUser({
      data: { first_login: false }
    })

    if (metaError) {
      console.error('Failed to clear first_login metadata:', metaError.message)
      return
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#0f172a', padding: '2rem', fontFamily: 'Inter, sans-serif'
    }}>
      <div className="glass-panel" style={{
        padding: '3rem', width: '100%', maxWidth: '440px',
        borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 0.5rem 0' }}>
            First Login Setup
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
            For security, please configure your new secure PIN or password before accessing the system.
          </p>
        </div>

        <form action={handleFirstLoginSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>New PIN / Password</label>
            <input 
              type="password" 
              name="password" 
              placeholder="Min. 6 digits/characters..." 
              className="input-field" 
              required 
              minLength={6} 
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Confirm New PIN / Password</label>
            <input 
              type="password" 
              name="confirmPassword" 
              placeholder="Confirm new value..." 
              className="input-field" 
              required 
              minLength={6} 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
            Save & Enter Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
