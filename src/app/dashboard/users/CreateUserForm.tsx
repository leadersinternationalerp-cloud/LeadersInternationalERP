'use client'

import { useState, useActionState, useEffect } from 'react'
import { createUserAction } from './actions'

export type FormState = {
  error: string | null;
  success?: boolean;
}

const initialState: FormState = {
  error: null,
  success: false
}

export function CreateUserForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createUserAction, initialState)
  const [selectedRole, setSelectedRole] = useState('Teacher')

  // Reset form when success
  if (state.success && isOpen) {
    setIsOpen(false)
    state.success = false
    setSelectedRole('Teacher')
  }

  const isSystemAdmin = selectedRole === 'System Admin'

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        + Add New User
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{
            padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '500px',
            backgroundColor: 'var(--color-surface)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Create New User</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {state.error && <div className="auth-error">{state.error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" name="first_name" className="input-field" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" name="last_name" className="input-field" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="input-field" required />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" name="username" className="input-field" required placeholder="e.g. tr.john" />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select name="role" className="input-field" required value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  <option value="System Admin">System Admin</option>
                  <option value="Director">Director</option>
                  <option value="Principal">Principal</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Parent">Parent</option>
                  <option value="Dean">Dean</option>
                  <option value="Head of Section">Head of Section</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{isSystemAdmin ? 'Password' : 'PIN'}</label>
                {isSystemAdmin ? (
                  <input type="password" name="password" className="input-field" required minLength={6} placeholder="Enter a secure password" />
                ) : (
                  <input type="password" name="password" className="input-field" required pattern="\d{6,10}" title="PIN must be a 6 to 10 digit number" placeholder="6-10 digit PIN" />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn" style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
