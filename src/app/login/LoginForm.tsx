'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

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
        <label htmlFor="email" className="form-label">Email ID</label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          className="input-field" 
          placeholder="Enter your email" 
          required 
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password" className="form-label">Password / PIN</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          className="input-field" 
          placeholder="Enter your password or PIN" 
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
