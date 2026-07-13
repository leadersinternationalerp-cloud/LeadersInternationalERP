'use client'

import { useState, useActionState } from 'react'
import { loginAction } from './actions'
import { Eye, EyeOff } from 'lucide-react'

import Link from 'next/link'

export type FormState = {
  error: string | null;
}

const initialState: FormState = {
  error: null,
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)
  const [authType, setAuthType] = useState<'staff' | 'admin'>('staff')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="auth-form" style={{ width: '100%' }}>
      {state.error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{state.error}</div>}
      
      {/* Segmented Toggle */}
      <div style={{
        display: 'flex',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '9999px',
        padding: '4px',
        marginBottom: '1.5rem',
        border: '1px solid var(--color-border)'
      }}>
        <button
          type="button"
          onClick={() => setAuthType('staff')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: authType === 'staff' ? '#fff' : 'transparent',
            color: authType === 'staff' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: authType === 'staff' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: authType === 'staff' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          Staff & Parents
        </button>
        <button
          type="button"
          onClick={() => setAuthType('admin')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: authType === 'admin' ? '#fff' : 'transparent',
            color: authType === 'admin' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: authType === 'admin' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: authType === 'admin' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          System Admin
        </button>
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label htmlFor="username" className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          {authType === 'staff' ? 'Username' : 'Email / Username'}
        </label>
        <input 
          type="text" 
          id="username" 
          name="username" 
          className="input-field" 
          style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
          placeholder={authType === 'staff' ? 'e.g. parent123, tr.john' : 'admin@example.com'} 
          required 
        />
      </div>
      
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label htmlFor="password" className="form-label" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
            {authType === 'staff' ? 'PIN' : 'Password'}
          </label>
          <Link href="/auth/forgot-pin" style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 500 }}>
            Forgot {authType === 'staff' ? 'PIN' : 'Password'}?
          </Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input 
            type={showPassword ? 'text' : 'password'} 
            id="password" 
            name="password" 
            className="input-field" 
            style={{ padding: '0.75rem', paddingRight: '2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
            placeholder={authType === 'staff' ? '6-10 digit PIN' : 'Enter your password'} 
            pattern={authType === 'staff' ? '\\d{6,10}' : undefined}
            title={authType === 'staff' ? 'PIN must be a 6 to 10 digit number' : ''}
            required 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0'
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '0.8rem', borderRadius: '9999px', fontWeight: 600, fontSize: '1rem' }}
        disabled={isPending}
      >
        {isPending ? 'Authenticating...' : 'Sign in'}
      </button>
    </form>
  )
}
