'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

import Link from 'next/link'

export type FormState = {
  error: string | null;
}

const initialState: FormState = {
  error: null,
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="auth-form">
      {state.error && <div className="auth-error">{state.error}</div>}
      
      <div className="form-group">
        <label htmlFor="username" className="form-label">Username / Email</label>
        <input 
          type="text" 
          id="username" 
          name="username" 
          className="input-field" 
          placeholder="Enter your username or email" 
          required 
        />
      </div>
      
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="password" className="form-label" style={{ margin: 0 }}>Password / PIN</label>
          <Link href="/auth/forgot-pin" style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', textDecoration: 'none' }}>
            Forgot PIN?
          </Link>
        </div>
        <input 
          type="password" 
          id="password" 
          name="password" 
          className="input-field" 
          placeholder="Enter password or 6-10 digit PIN" 
          required 
        />
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary" 
        style={{ marginTop: '0.5rem', padding: '0.75rem' }}
        disabled={isPending}
      >
        {isPending ? 'Authenticating...' : 'Sign In'}
      </button>
    </form>
  )
}
