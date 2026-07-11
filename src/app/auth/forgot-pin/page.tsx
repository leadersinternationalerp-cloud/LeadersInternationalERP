'use client'

import { useActionState } from 'react'
import { sendOtpAction } from './actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ForgotPinPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(sendOtpAction, {})

  if (state.success && state.email) {
    router.push(`/auth/reset-pin?email=${encodeURIComponent(state.email)}`)
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
            Forgot PIN / Password
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Enter your email below. We will send a 6-digit OTP to your in-app notifications and email to reset your credentials.
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
              placeholder="e.g. user@leaders.ac.tz" 
              className="input-field" 
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isPending}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {isPending ? 'Sending OTP...' : 'Send Verification OTP'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/login" style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', textDecoration: 'none' }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
