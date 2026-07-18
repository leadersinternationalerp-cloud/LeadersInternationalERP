'use client'

import { useState } from 'react'
import { saveWeightsAction } from './actions'
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react'

export interface AssessmentWeightItem {
  id?: string
  assessment_type: string
  weight: number
  is_active: boolean
  display_order: number
}

interface Props {
  initialWeights: AssessmentWeightItem[]
}

export default function AssessmentWeightsClient({ initialWeights }: Props) {
  const [weights, setWeights] = useState<AssessmentWeightItem[]>(initialWeights)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    const nextOrder = weights.length > 0 ? Math.max(...weights.map(w => w.display_order)) + 1 : 0
    setWeights(prev => [
      ...prev,
      {
        assessment_type: '',
        weight: 10,
        is_active: true,
        display_order: nextOrder
      }
    ])
  }

  const handleDelete = (index: number) => {
    setWeights(prev => prev.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof AssessmentWeightItem, value: any) => {
    setWeights(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const emptyTypes = weights.filter(w => !w.assessment_type.trim())
    if (emptyTypes.length > 0) {
      setError('Error: Assessment type names cannot be empty.')
      return
    }

    const activeList = weights.filter(w => w.is_active)
    if (activeList.length === 0) {
      setError('Error: You must have at least one active assessment type.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const res = await saveWeightsAction(weights)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess('Assessment weights configuration saved successfully!')
    }
  }

  const totalActiveWeight = weights
    .filter(w => w.is_active)
    .reduce((sum, w) => sum + Number(w.weight || 0), 0)

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', marginTop: 0, marginBottom: '0.5rem' }}>
        Dynamic Assessment Weights Settings
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Configure which exams, quizzes, or activities are included on the student report card. Enter names matching the assessment types used in marks entry (e.g. QUIZZES, Test 1, Mid-Term, Terminal). The system will compute weighted averages automatically.
      </p>

      {error && <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}
      {success && <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {weights.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '1rem' }}>
            No assessment types defined. Click the button below to add one.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.25rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Assessment Type Name</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '100px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Weight</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '90px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Order</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '90px', color: 'var(--color-text-muted)', fontWeight: '600', textAlign: 'center' }}>Active</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '60px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {weights.map((w, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.5)' }}>
                    <td style={{ padding: '0.5rem 0.25rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. QUIZZES or Test 1"
                        style={{ padding: '0.4rem', width: '95%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                        value={w.assessment_type}
                        onChange={e => handleChange(index, 'assessment_type', e.target.value)}
                        required
                      />
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="form-input"
                          style={{ padding: '0.4rem', width: '60px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                          value={w.weight}
                          onChange={e => handleChange(index, 'weight', isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))}
                          required
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '0.4rem', width: '50px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                        value={w.display_order}
                        onChange={e => handleChange(index, 'display_order', isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value))}
                        required
                      />
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={w.is_active}
                        onChange={e => handleChange(index, 'is_active', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.25rem' }}
                        title="Delete assessment type"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={handleAdd}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Plus size={16} /> Add Assessment Type
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: totalActiveWeight === 100 ? 'var(--color-success)' : 'var(--color-text)' }}>
            Total Active Weight: {totalActiveWeight}%
          </span>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600 }}
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </form>
  )
}
