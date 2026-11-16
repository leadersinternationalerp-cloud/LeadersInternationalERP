'use client'

import { useState } from 'react'
import { saveWeightsAction } from './actions'
import { Plus, Trash2, Save, RefreshCw, Sparkles } from 'lucide-react'

export interface AssessmentWeightItem {
  id?: string
  assessment_type: string
  weight: number
  is_active: boolean
  display_order: number
  assessment_category?: 'ca' | 'exam'
}

interface Props {
  initialWeights: AssessmentWeightItem[]
}

function inferCategory(type: string, cat?: 'ca' | 'exam'): 'ca' | 'exam' {
  if (cat === 'ca' || cat === 'exam') return cat
  const upper = type.trim().toUpperCase()
  if (
    ['MID-TERM', 'MIDTERM', 'TERMINAL', 'FINAL', 'OPENER', 'MOCK'].includes(upper) ||
    upper.includes('EXAM')
  ) {
    return 'exam'
  }
  return 'ca'
}

export default function AssessmentWeightsClient({ initialWeights }: Props) {
  const [weights, setWeights] = useState<AssessmentWeightItem[]>(() =>
    initialWeights.map(w => ({
      ...w,
      assessment_category: inferCategory(w.assessment_type, w.assessment_category),
    }))
  )
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
        display_order: nextOrder,
        assessment_category: 'ca',
      },
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

  const applyQuickSplit = (targetCaPct: number) => {
    const targetExamPct = Math.max(0, 100 - targetCaPct)
    setWeights(prev => {
      const activeCaIndices = prev
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => w.is_active && inferCategory(w.assessment_type, w.assessment_category) === 'ca')
      const activeExamIndices = prev
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => w.is_active && inferCategory(w.assessment_type, w.assessment_category) === 'exam')

      const updated = prev.map(w => ({ ...w }))

      if (activeCaIndices.length > 0) {
        const base = Math.floor((targetCaPct * 100) / activeCaIndices.length) / 100
        const remainder = Math.round((targetCaPct - base * activeCaIndices.length) * 100) / 100
        activeCaIndices.forEach(({ i }, idx) => {
          const extra = idx === activeCaIndices.length - 1 ? remainder : 0
          updated[i].weight = Math.round((base + extra) * 100) / 100
        })
      }

      if (activeExamIndices.length > 0) {
        const base = Math.floor((targetExamPct * 100) / activeExamIndices.length) / 100
        const remainder = Math.round((targetExamPct - base * activeExamIndices.length) * 100) / 100
        activeExamIndices.forEach(({ i }, idx) => {
          const extra = idx === activeExamIndices.length - 1 ? remainder : 0
          updated[i].weight = Math.round((base + extra) * 100) / 100
        })
      }

      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

  const activeWeights = weights.filter(w => w.is_active)
  const caTotal = activeWeights
    .filter(w => inferCategory(w.assessment_type, w.assessment_category) === 'ca')
    .reduce((sum, w) => sum + Number(w.weight || 0), 0)
  const examTotal = activeWeights
    .filter(w => inferCategory(w.assessment_type, w.assessment_category) === 'exam')
    .reduce((sum, w) => sum + Number(w.weight || 0), 0)
  const totalActiveWeight = Math.round((caTotal + examTotal) * 100) / 100

  const presets = [
    { label: '40% C.A / 60% Exams', ca: 40 },
    { label: '30% C.A / 70% Exams', ca: 30 },
    { label: '50% C.A / 50% Exams', ca: 50 },
    { label: '20% C.A / 80% Exams', ca: 20 },
    { label: '0% C.A / 100% Exams', ca: 0 },
  ]

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', maxWidth: '900px' }}>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', marginTop: 0, marginBottom: '0.5rem' }}>
        Dynamic Assessment Weights Settings
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Configure which Continuous Assessments (C.A.) and Exams are included on student report cards. Online quizzes automatically persist their scores into <strong>QUIZZES</strong> and contribute to the C.A. share.
      </p>

      {/* Live C.A. vs Exam Split Bar */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.03)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ color: '#15803d' }}>C.A. Total: {Math.round(caTotal * 100) / 100}%</span>
          <span style={{ color: totalActiveWeight === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            Combined Total: {totalActiveWeight}% {totalActiveWeight !== 100 ? '(Recommended: 100%)' : '✓'}
          </span>
          <span style={{ color: '#c2410c' }}>Exams Total: {Math.round(examTotal * 100) / 100}%</span>
        </div>
        <div style={{ height: '10px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.25)', overflow: 'hidden', display: 'flex' }}>
          <div
            style={{
              width: `${totalActiveWeight > 0 ? Math.min(100, (caTotal / Math.max(100, totalActiveWeight)) * 100) : 0}%`,
              background: '#16a34a',
              transition: 'width 0.2s ease',
            }}
            title={`C.A.: ${caTotal}%`}
          />
          <div
            style={{
              width: `${totalActiveWeight > 0 ? Math.min(100, (examTotal / Math.max(100, totalActiveWeight)) * 100) : 0}%`,
              background: '#ea580c',
              transition: 'width 0.2s ease',
            }}
            title={`Exams: ${examTotal}%`}
          />
        </div>

        {/* Quick Split Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={13} /> Quick Splits:
          </span>
          {presets.map(p => {
            const isActive = Math.round(caTotal) === p.ca && Math.round(totalActiveWeight) === 100
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyQuickSplit(p.ca)}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

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
                  <th style={{ padding: '0.5rem 0.25rem', width: '130px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Category</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '100px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Weight</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '80px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Order</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '75px', color: 'var(--color-text-muted)', fontWeight: '600', textAlign: 'center' }}>Active</th>
                  <th style={{ padding: '0.5rem 0.25rem', width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {weights.map((w, index) => {
                  const isQuizzes = w.assessment_type.trim().toUpperCase() === 'QUIZZES'
                  const category = inferCategory(w.assessment_type, w.assessment_category)
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.5)' }}>
                      <td style={{ padding: '0.5rem 0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. QUIZZES or Test 1"
                            style={{ padding: '0.4rem', flex: 1, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                            value={w.assessment_type}
                            onChange={e => handleChange(index, 'assessment_type', e.target.value)}
                            required
                          />
                          {isQuizzes && (
                            <span
                              title="Scores from Online Quizzes automatically contribute to this C.A. category"
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '999px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#15803d',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Online Quizzes
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.25rem' }}>
                        <select
                          className="form-input"
                          value={category}
                          onChange={e => handleChange(index, 'assessment_category', e.target.value as 'ca' | 'exam')}
                          style={{ padding: '0.4rem', width: '95%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                        >
                          <option value="ca">C.A.</option>
                          <option value="exam">Exam</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem 0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            className="form-input"
                            style={{ padding: '0.4rem', width: '64px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
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
                  )
                })}
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
