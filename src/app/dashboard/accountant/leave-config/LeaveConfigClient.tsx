'use client'

import { useState } from 'react'
import { saveLeaveConfigAction } from './actions'

export default function LeaveConfigClient({ initialConfig }: { initialConfig: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [config, setConfig] = useState({
    annual_leave: initialConfig?.annual_leave ?? 28,
    sick_leave: initialConfig?.sick_leave ?? 14,
    maternity_leave: initialConfig?.maternity_leave ?? 84,
    paternity_leave: initialConfig?.paternity_leave ?? 5,
    emergency_leave: initialConfig?.emergency_leave ?? 5,
    study_leave: initialConfig?.study_leave ?? 0,
    unpaid_leave: initialConfig?.unpaid_leave ?? 0,
    max_carry_over: initialConfig?.max_carry_over ?? 5,
    max_advance_percent: initialConfig?.max_advance_percent ?? 30,
    min_service_months_advance: initialConfig?.min_service_months_advance ?? 6
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      [e.target.name]: Number(e.target.value)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await saveLeaveConfigAction(config)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess('Leave configuration saved successfully!')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
      {error && <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Entitlements Section */}
        <div>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Leave Entitlements (Days/Year)</h3>
          
          <div className="form-group">
            <label className="form-label">Annual Leave</label>
            <input type="number" name="annual_leave" value={config.annual_leave} onChange={handleChange} className="form-input" required min="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Sick Leave</label>
            <input type="number" name="sick_leave" value={config.sick_leave} onChange={handleChange} className="form-input" required min="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Maternity Leave</label>
            <input type="number" name="maternity_leave" value={config.maternity_leave} onChange={handleChange} className="form-input" required min="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Paternity Leave</label>
            <input type="number" name="paternity_leave" value={config.paternity_leave} onChange={handleChange} className="form-input" required min="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Emergency Leave</label>
            <input type="number" name="emergency_leave" value={config.emergency_leave} onChange={handleChange} className="form-input" required min="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Study Leave</label>
            <input type="number" name="study_leave" value={config.study_leave} onChange={handleChange} className="form-input" required min="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Unpaid Leave Limit</label>
            <input type="number" name="unpaid_leave" value={config.unpaid_leave} onChange={handleChange} className="form-input" required min="0" />
          </div>
        </div>

        {/* Rules Section */}
        <div>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Rules & Constraints</h3>
          
          <div className="form-group">
            <label className="form-label">Max Carry Over Days (Annual)</label>
            <input type="number" name="max_carry_over" value={config.max_carry_over} onChange={handleChange} className="form-input" required min="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Max Advance % of Net Salary</label>
            <input type="number" name="max_advance_percent" value={config.max_advance_percent} onChange={handleChange} className="form-input" required min="0" max="100" />
          </div>

          <div className="form-group">
            <label className="form-label">Min Service (Months) for Advance</label>
            <input type="number" name="min_service_months_advance" value={config.min_service_months_advance} onChange={handleChange} className="form-input" required min="0" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  )
}
