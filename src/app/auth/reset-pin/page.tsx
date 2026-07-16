'use client'

import { useActionState, use } from 'react'
import { resetPinAction } from '../forgot-pin/actions'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPinPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const router = useRouter()
  const params = use(searchParams)
  const defaultEmail = params.email || ''

  const [state, formAction, isPending] = useActionState(resetPinAction, { email: defaultEmail })

  if (state.success) {
    alert('Your PIN/Password has been reset successfully. Please log in with your new credentials.')
    router.push('/login')
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
            Verify OTP & Reset
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Enter the 6-digit verification code sent to you and set your new login PIN or password.
          </p>
        </div>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {state.error && (
            <div style={{
              padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderLeft: '4px solid var(--color-error)', borderRadius: '4px',
              color: 'var(--color-error)', fontSize: '0.85rem'
            }}>
              {state.error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Email Address</label>
            <input 
              type="email" 
              name="email" 
              defaultValue={state.email || defaultEmail} 
              className="input-field" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>6-Digit OTP Code</label>
            <input 
              type="text" 
              name="otp" 
              placeholder="e.g. 123456" 
              className="input-field" 
              required 
              maxLength={6} 
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.85rem' }}>New PIN / Password</label>
            <input 
              type="password" 
              name="newPin" 
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
              name="confirmPin" 
              placeholder="Confirm new PIN..." 
              className="input-field" 
              required 
              minLength={6} 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isPending}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {isPending ? 'Verifying & Saving...' : 'Reset PIN & Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/auth/forgot-pin" style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', textDecoration: 'none' }}>
            Request New OTP
          </Link>
        </div>
      </div>
    </div>
  )
}
