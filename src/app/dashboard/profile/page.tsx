import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'

export default async function ProfilePage() {
  const supabase = await createClient()

  // 1. Fetch authenticated user details
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p>Loading...</p>

  // 2. Fetch public profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 3. Fetch optional Student or Staff IDs
  const { data: student } = await supabase
    .from('students')
    .select('student_id')
    .eq('id', user.id)
    .single()

  const { data: staff } = await supabase
    .from('staff')
    .select('employee_id')
    .eq('id', user.id)
    .single()

  const uniqueId = student?.student_id || staff?.employee_id || 'N/A'

  const userRoles: string[] = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  // Server Action to update profile information
  async function handleUpdateProfile(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const phone = formData.get('phone') as string
    const newPin = formData.get('newPin') as string
    const confirmPin = formData.get('confirmPin') as string

    // 1. Update phone number
    if (phone) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (profileError) {
        console.error('Error updating phone:', profileError.message)
      }
    }

    // 2. Update PIN / Password (via admin SDK to bypass token limits if needed or standard Auth)
    if (newPin) {
      if (newPin !== confirmPin) {
        console.error('PINs do not match')
        return
      }

      // Fetch user profile to verify role
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const roles = profile?.roles || (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])
      const isSystemAdmin = roles.includes('System Admin')

      if (!isSystemAdmin) {
        const pinRegex = /^[0-9]{6,10}$/
        if (!pinRegex.test(newPin)) {
          console.error('PIN must be a numeric code between 6 and 10 digits')
          return
        }
      } else {
        if (newPin.length < 6) {
          console.error('Password must be at least 6 characters long')
          return
        }
      }

      const { error: authError } = await serviceClient.auth.admin.updateUserById(user.id, {
        password: newPin,
        user_metadata: { first_login: false } // ensure first login is false since they changed it
      })

      if (authError) {
        console.error('Error updating auth password/PIN:', authError.message)
        return
      }

      // Save pin_hash in profiles table
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
        .eq('id', user.id)
    }

    revalidatePath('/dashboard/profile')
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        My Profile & Settings
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Profile Card Summary */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%', backgroundColor: 'var(--color-primary)',
            color: '#fff', fontSize: '2.5rem', fontWeight: 700, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'
          }}>
            {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
          </div>
          
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            {profile?.first_name} {profile?.last_name}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
            {profile?.email}
          </p>

          <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            {userRoles.join(', ')}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>School ID:</span>
              <strong style={{ float: 'right' }}>{uniqueId}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Phone:</span>
              <strong style={{ float: 'right' }}>{profile?.phone || 'Not Configured'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Account Status:</span>
              <span style={{
                float: 'right', fontWeight: 700, fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px',
                backgroundColor: profile?.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: profile?.is_active ? 'var(--color-success)' : 'var(--color-error)'
              }}>
                {profile?.is_active ? 'ACTIVE' : 'SUSPENDED'}
              </span>
            </div>
          </div>
        </div>

        {/* Update Form */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', fontWeight: 600 }}>Update Settings</h3>
          
          <form action={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                defaultValue={profile?.phone || ''} 
                placeholder="e.g. +255 770 000 000" 
                className="input-field" 
              />
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', margin: '1rem 0' }}></div>

            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-secondary)', margin: 0 }}>
              Change PIN / Password
            </h4>

            <div className="form-group">
              <label className="form-label">New PIN / Password</label>
              <input 
                type="password" 
                name="newPin" 
                placeholder="Min. 6 digits/characters..." 
                className="input-field" 
                minLength={6} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New PIN / Password</label>
              <input 
                type="password" 
                name="confirmPin" 
                placeholder="Confirm new value..." 
                className="input-field" 
                minLength={6} 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem', marginTop: '0.5rem' }}>
              Save Profile Changes
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
