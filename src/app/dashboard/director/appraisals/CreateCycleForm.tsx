'use client'

import { useState } from 'react'
import { saveAppraisalCycleAction } from './actions'

interface Indicator {
  name: string
  max_score: number
}

export function CreateCycleForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const [indicators, setIndicators] = useState<Indicator[]>([
    { name: 'Quality of Work', max_score: 5 },
    { name: 'Productivity & Efficiency', max_score: 5 },
    { name: 'Communication & Collaboration', max_score: 5 },
    { name: 'Attendance & Reliability', max_score: 5 }
  ])

  const handleAddIndicator = () => {
    setIndicators([...indicators, { name: '', max_score: 5 }])
  }

  const handleRemoveIndicator = (index: number) => {
    setIndicators(indicators.filter((_, i) => i !== index))
  }

  const handleIndicatorChange = (index: number, field: keyof Indicator, value: any) => {
    const updated = [...indicators]
    if (field === 'max_score') {
      updated[index][field] = parseInt(value) || 0
    } else {
      updated[index][field] = value
    }
    setIndicators(updated)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)

    // Validate indicators
    if (indicators.length === 0) {
      setError('Please add at least one indicator.')
      setIsPending(false)
      return
    }

    for (const ind of indicators) {
      if (!ind.name.trim()) {
        setError('Indicator names cannot be empty.')
        setIsPending(false)
        return
      }
      if (ind.max_score <= 0) {
        setError('Indicator max score must be greater than 0.')
        setIsPending(false)
        return
      }
    }

    formData.append('indicators', JSON.stringify(indicators))

    const result = await saveAppraisalCycleAction(formData)
    setIsPending(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
      // Reset form
      setIndicators([
        { name: 'Quality of Work', max_score: 5 },
        { name: 'Productivity & Efficiency', max_score: 5 },
        { name: 'Communication & Collaboration', max_score: 5 },
        { name: 'Attendance & Reliability', max_score: 5 }
      ])
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        + Create New Cycle
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '600px',
            backgroundColor: 'var(--color-surface)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Create Appraisal Cycle</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && <div className="auth-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Cycle Name</label>
                <input type="text" name="name" className="input-field" placeholder="e.g., Annual Appraisal 2026" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" name="start_date" className="input-field" required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" name="end_date" className="input-field" required />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Performance Indicators</h3>
                  <button type="button" onClick={handleAddIndicator} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)' }}>
                    + Add Indicator
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {indicators.map((ind, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Indicator Name (e.g., Leadership)"
                        value={ind.name}
                        onChange={(e) => handleIndicatorChange(index, 'name', e.target.value)}
                        className="input-field"
                        style={{ flex: 3 }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Max Score"
                        value={ind.max_score}
                        onChange={(e) => handleIndicatorChange(index, 'max_score', e.target.value)}
                        className="input-field"
                        style={{ flex: 1 }}
                        min={1}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIndicator(index)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--color-error)', fontSize: '1.1rem', padding: '0.25rem'
                        }}
                        title="Remove Indicator"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn" style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Create Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
