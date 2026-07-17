'use client'

import { useState } from 'react'
import { saveGradingConfigAction } from './actions'
import {
  parseGradingLevels,
  validateGradingLevels,
  getGradeColor,
  GradeLevel
} from '@/utils/grading'

export default function GradingClient({ initialConfig }: { initialConfig: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [levels, setLevels] = useState<GradeLevel[]>(() => {
    return parseGradingLevels(initialConfig)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateGradingLevels(levels)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const res = await saveGradingConfigAction(levels)
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
          Define the minimum and maximum score percentage required to achieve each grade level.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {levels.map((lvl, index) => (
            <div key={lvl.grade} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <label style={{ fontWeight: '600', fontSize: '1.1rem', color: getGradeColor(lvl.grade) }}>Grade {lvl.grade}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Min:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  className="form-input"
                  style={{ padding: '0.4rem', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                  value={lvl.min}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    const newLevels = [...levels]
                    newLevels[index] = { ...lvl, min: isNaN(val) ? 0 : val }
                    setLevels(newLevels)
                  }}
                  required
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Max:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  className="form-input"
                  style={{ padding: '0.4rem', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                  value={lvl.max}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    const newLevels = [...levels]
                    newLevels[index] = { ...lvl, max: isNaN(val) ? 0 : val }
                    setLevels(newLevels)
                  }}
                  required
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>%</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          backgroundColor: 'rgba(0,0,0,0.02)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          lineHeight: '1.4',
          marginTop: '0.5rem'
        }}>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Preview Bands:</strong>
          {levels.map((lvl) => (
            <span key={lvl.grade} style={{ marginRight: '1rem', display: 'inline-block' }}>
              <span style={{ fontWeight: 600, color: getGradeColor(lvl.grade) }}>{lvl.grade}</span>: {lvl.min}–{lvl.max}%
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.6rem 2rem' }}>
          {loading ? 'Saving...' : 'Save Grading Scale'}
        </button>
      </div>
    </form>
  )
}
