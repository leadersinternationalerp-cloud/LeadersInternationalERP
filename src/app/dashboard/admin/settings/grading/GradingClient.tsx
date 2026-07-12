'use client'

import { useState } from 'react'
import { saveGradingConfigAction } from './actions'

export default function GradingClient({ initialConfig }: { initialConfig: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [config, setConfig] = useState({
    A: initialConfig?.A ?? 90,
    B: initialConfig?.B ?? 80,
    C: initialConfig?.C ?? 70,
    D: initialConfig?.D ?? 60
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      [e.target.name]: Number(e.target.value)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (config.A <= config.B || config.B <= config.C || config.C <= config.D) {
      setError('Thresholds must be strictly descending (A > B > C > D)')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const res = await saveGradingConfigAction(config)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess('Grading scale saved successfully!')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
      {error && <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{success}</div>}

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Define the minimum percentage required to achieve each grade. Grade F will automatically be any score below the D threshold.
        </p>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ width: '100px', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-success)' }}>A</label>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>≥</span>
            <input type="number" name="A" value={config.A} onChange={handleChange} className="form-input" required min="0" max="100" />
            <span style={{ color: 'var(--color-text-muted)' }}>%</span>
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ width: '100px', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>B</label>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>≥</span>
            <input type="number" name="B" value={config.B} onChange={handleChange} className="form-input" required min="0" max="100" />
            <span style={{ color: 'var(--color-text-muted)' }}>%</span>
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ width: '100px', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-accent)' }}>C</label>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>≥</span>
            <input type="number" name="C" value={config.C} onChange={handleChange} className="form-input" required min="0" max="100" />
            <span style={{ color: 'var(--color-text-muted)' }}>%</span>
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ width: '100px', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-warning)' }}>D</label>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>≥</span>
            <input type="number" name="D" value={config.D} onChange={handleChange} className="form-input" required min="0" max="100" />
            <span style={{ color: 'var(--color-text-muted)' }}>%</span>
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)' }}>
          <label style={{ width: '100px', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-error)' }}>F</label>
          <div style={{ flex: 1, color: 'var(--color-text-muted)' }}>
            Automatically &lt; {config.D}%
          </div>
        </div>

      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Grading Scale'}
        </button>
      </div>
    </form>
  )
}
