'use client'

import { useState, useTransition } from 'react'
import { type User } from './types'
import { updateUserAction, toggleUserStatusAction, resetUserPasswordAction } from './actions'

interface UserTableProps {
  users: User[]
  currentUserId?: string
}

const AVAILABLE_ROLES = [
  { value: 'System Admin', label: 'Admin' },
  { value: 'Director', label: 'Director' },
  { value: 'Principal', label: 'Principal' },
  { value: 'Accountant', label: 'Accountant' },
  { value: 'Teacher', label: 'Teacher' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Dean', label: 'Dean' },
  { value: 'Head of Section', label: 'Head of Section' }
]

export function UserTable({ users, currentUserId }: UserTableProps) {
  const [isPending, startTransition] = useTransition()
  
  // Modals state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isEditingPending, setIsEditingPending] = useState(false)

  // Password reset state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isPasswordPending, setIsPasswordPending] = useState(false)

  // Toggle user active status
  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    if (userId === currentUserId) {
      alert('You cannot suspend your own admin account.')
      return
    }
    
    startTransition(async () => {
      const res = await toggleUserStatusAction(userId, !currentStatus)
      if (res.error) {
        alert(res.error)
      }
    })
  }

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditFirstName(user.first_name)
    setEditLastName(user.last_name)
    setEditEmail(user.email)
    setEditRole(user.role)
    setEditError(null)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    
    setIsEditingPending(true)
    setEditError(null)

    const res = await updateUserAction(
      editingUser.id,
      editFirstName,
      editLastName,
      editRole,
      editEmail
    )

    setIsEditingPending(false)
    if (res.success) {
      setEditingUser(null)
    } else {
      setEditError(res.error)
    }
  }

  // Open Reset Password Modal
  const openResetPasswordModal = (user: User) => {
    setResetPasswordUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordSuccess(null)
  }

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPasswordUser) return

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setIsPasswordPending(true)
    setPasswordError(null)
    setPasswordSuccess(null)

    const res = await resetUserPasswordAction(resetPasswordUser.id, newPassword)

    setIsPasswordPending(false)
    if (res.success) {
      setPasswordSuccess('Password updated successfully!')
      setTimeout(() => {
        setResetPasswordUser(null)
      }, 1500)
    } else {
      setPasswordError(res.error)
    }
  }

  // Helper to map DB role to UI role label
  const getRoleLabel = (roleVal: string) => {
    const match = AVAILABLE_ROLES.find(r => r.value === roleVal)
    return match ? match.label : roleVal
  }

  return (
    <>
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Joined</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color var(--transition-fast)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {u.first_name} {u.last_name}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: u.role === 'System Admin' ? 'rgba(247, 178, 57, 0.15)' : 'rgba(59, 179, 195, 0.1)',
                      color: u.role === 'System Admin' ? 'var(--color-accent)' : 'var(--color-secondary)'
                    }}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      color: u.is_active ? 'var(--color-success)' : 'var(--color-error)', 
                      fontWeight: 600 
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: u.is_active ? 'var(--color-success)' : 'var(--color-error)'
                      }} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => openEditModal(u)}
                        className="btn"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(59, 179, 195, 0.1)',
                          color: 'var(--color-secondary)',
                          border: '1px solid rgba(59, 179, 195, 0.2)'
                        }}
                      >
                        Edit Details
                      </button>
                      <button 
                        onClick={() => openResetPasswordModal(u)}
                        className="btn"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(247, 178, 57, 0.1)',
                          color: 'var(--color-accent)',
                          border: '1px solid rgba(247, 178, 57, 0.2)'
                        }}
                      >
                        Reset PW
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className="btn"
                        disabled={isPending || u.id === currentUserId}
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: u.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: u.is_active ? 'var(--color-error)' : 'var(--color-success)',
                          border: u.is_active ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                          opacity: u.id === currentUserId ? 0.5 : 1,
                          cursor: u.id === currentUserId ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isPending ? '...' : (u.is_active ? 'Suspend' : 'Reactivate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Details Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '500px',
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Edit User Details</h2>
              <button 
                onClick={() => setEditingUser(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {editError && <div className="auth-error">{editError}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    value={editFirstName} 
                    onChange={(e) => setEditFirstName(e.target.value)} 
                    className="input-field" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    value={editLastName} 
                    onChange={(e) => setEditLastName(e.target.value)} 
                    className="input-field" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  className="input-field" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Role</label>
                <select 
                  value={editRole} 
                  onChange={(e) => setEditRole(e.target.value)} 
                  className="input-field" 
                  required
                >
                  {/* Append non-standard role if user currently has one not in standard list */}
                  {!AVAILABLE_ROLES.some(r => r.value === editingUser.role) && (
                    <option value={editingUser.role}>{editingUser.role}</option>
                  )}
                  {AVAILABLE_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)} 
                  className="btn" 
                  style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isEditingPending}
                >
                  {isEditingPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px',
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Reset Password</h2>
              <button 
                onClick={() => setResetPasswordUser(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Resetting password for <strong>{resetPasswordUser.first_name} {resetPasswordUser.last_name}</strong> ({resetPasswordUser.email}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {passwordError && <div className="auth-error">{passwordError}</div>}
              {passwordSuccess && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderLeft: '4px solid var(--color-success)',
                  color: 'var(--color-success)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem'
                }}>
                  {passwordSuccess}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="input-field" 
                  required 
                  minLength={6}
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="input-field" 
                  required 
                  minLength={6}
                  placeholder="Re-enter password"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setResetPasswordUser(null)} 
                  className="btn" 
                  style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isPasswordPending}
                >
                  {isPasswordPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
