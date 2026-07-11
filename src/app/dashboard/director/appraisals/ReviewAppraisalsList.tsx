'use client'

import { useState } from 'react'
import { saveReviewerEvaluationAction } from './actions'

interface Indicator {
  name: string
  max_score: number
}

interface AppraisalCycle {
  id: string
  name: string
  start_date: string
  end_date: string
  indicators: Indicator[]
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  role: string
  email: string
}

interface Appraisal {
  id: string
  cycle_id: string
  employee_id: string
  self_scores: Record<string, number>
  self_comments: string
  reviewer_scores: Record<string, number>
  reviewer_comments: string
  final_rating: string
  status: string
}

interface ReviewAppraisalsListProps {
  cycles: AppraisalCycle[]
  employees: Employee[]
  appraisals: Appraisal[]
}

export function ReviewAppraisalsList({ cycles, employees, appraisals }: ReviewAppraisalsListProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>(cycles[0]?.id || '')
  const [activeAppraisal, setActiveAppraisal] = useState<{
    employee: Employee
    appraisal: Appraisal | null
  } | null>(null)
  
  const [reviewerScores, setReviewerScores] = useState<Record<string, number>>({})
  const [reviewerComments, setReviewerComments] = useState('')
  const [finalRating, setFinalRating] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId)

  if (cycles.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No appraisal cycles created yet. Please create a cycle first.
      </div>
    )
  }

  const handleOpenEvaluate = (employee: Employee, appraisal: Appraisal | null) => {
    setActiveAppraisal({ employee, appraisal })
    setReviewerComments(appraisal?.reviewer_comments || '')
    setFinalRating(appraisal?.final_rating || 'Good')
    
    // Set initial scores
    const initialScores: Record<string, number> = {}
    selectedCycle?.indicators.forEach((ind) => {
      // default to self-score if available, otherwise reviewer-score, otherwise max_score/2 or empty
      if (appraisal?.reviewer_scores?.[ind.name] !== undefined) {
        initialScores[ind.name] = appraisal.reviewer_scores[ind.name]
      } else if (appraisal?.self_scores?.[ind.name] !== undefined) {
        initialScores[ind.name] = appraisal.self_scores[ind.name]
      } else {
        initialScores[ind.name] = ind.max_score
      }
    })
    setReviewerScores(initialScores)
    setError(null)
  }

  const handleScoreChange = (indicatorName: string, val: number, maxScore: number) => {
    setReviewerScores({
      ...reviewerScores,
      [indicatorName]: Math.min(maxScore, Math.max(0, val))
    })
  }

  const handleSubmitEvaluation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!activeAppraisal || !selectedCycle) return

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    if (activeAppraisal.appraisal?.id) {
      formData.append('appraisal_id', activeAppraisal.appraisal.id)
    }
    formData.append('cycle_id', selectedCycle.id)
    formData.append('employee_id', activeAppraisal.employee.id)
    formData.append('reviewer_scores', JSON.stringify(reviewerScores))
    formData.append('reviewer_comments', reviewerComments)
    formData.append('final_rating', finalRating)

    const res = await saveReviewerEvaluationAction(formData)
    setIsSubmitting(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setActiveAppraisal(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cycle Selector */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', display: 'block' }}>Select Appraisal Cycle</label>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="input-field"
              style={{ minWidth: '250px' }}
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selectedCycle && (
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
              <strong>Period:</strong> {new Date(selectedCycle.start_date).toLocaleDateString()} to {new Date(selectedCycle.end_date).toLocaleDateString()}<br />
              <strong>Indicators:</strong> {selectedCycle.indicators.map((i) => `${i.name} (max ${i.max_score})`).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Staff Appraisal Status List */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
          Employee Appraisals Status
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Employee Name</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Self-Assessment</th>
                <th style={{ padding: '1rem' }}>Final Rating</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const appraisal = appraisals.find(
                  (app) => app.cycle_id === selectedCycleId && app.employee_id === emp.id
                ) || null

                let statusLabel = 'Not Started'
                let statusBg = 'rgba(100, 116, 139, 0.1)'
                let statusColor = 'var(--color-text-muted)'

                if (appraisal) {
                  if (appraisal.status === 'Completed') {
                    statusLabel = 'Completed'
                    statusBg = 'rgba(16, 185, 129, 0.1)'
                    statusColor = 'var(--color-success)'
                  } else {
                    statusLabel = 'In Review'
                    statusBg = 'rgba(247, 178, 57, 0.1)'
                    statusColor = 'var(--color-accent)'
                  }
                }

                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {emp.first_name} {emp.last_name}
                      <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{emp.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{emp.role}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {appraisal?.self_scores ? (
                        <div>
                          <strong>Scored:</strong> {Object.values(appraisal.self_scores).reduce((a, b) => a + b, 0)} pts
                          {appraisal.self_comments && <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px', color: 'var(--color-text-muted)' }}>"{appraisal.self_comments}"</div>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Not submitted</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {appraisal?.final_rating ? (
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(59, 179, 195, 0.1)',
                          color: 'var(--color-secondary)'
                        }}>
                          {appraisal.final_rating}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: statusBg,
                        color: statusColor
                      }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => handleOpenEvaluate(emp, appraisal)}
                        className="btn"
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          backgroundColor: appraisal?.status === 'Completed' ? 'rgba(0,0,0,0.05)' : 'var(--color-secondary)',
                          color: appraisal?.status === 'Completed' ? 'var(--color-text)' : '#fff'
                        }}
                      >
                        {appraisal?.status === 'Completed' ? 'Review Again' : appraisal ? 'Evaluate' : 'Initiate Rating'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Modal */}
      {activeAppraisal && selectedCycle && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '650px',
            backgroundColor: 'var(--color-surface)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Evaluate Staff Performance</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Employee: {activeAppraisal.employee.first_name} {activeAppraisal.employee.last_name} ({activeAppraisal.employee.role})
                </p>
              </div>
              <button onClick={() => setActiveAppraisal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && <div className="auth-error">{error}</div>}

              {/* Self assessment view */}
              {activeAppraisal.appraisal && (
                <div style={{
                  backgroundColor: 'rgba(59, 179, 195, 0.05)',
                  border: '1px solid rgba(59, 179, 195, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.9rem'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-secondary)' }}>Employee Self-Assessment</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {selectedCycle.indicators.map((ind) => (
                      <div key={ind.name}>
                        <span style={{ fontWeight: 500 }}>{ind.name}: </span>
                        <span>{activeAppraisal.appraisal?.self_scores?.[ind.name] ?? 'N/A'} / {ind.max_score}</span>
                      </div>
                    ))}
                  </div>
                  {activeAppraisal.appraisal.self_comments && (
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Self Comments:</strong>
                      <p style={{ fontStyle: 'italic', margin: 0 }}>"{activeAppraisal.appraisal.self_comments}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviewer scoring section */}
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Reviewer Scores</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedCycle.indicators.map((ind) => (
                    <div key={ind.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{ind.name} (max {ind.max_score})</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          value={reviewerScores[ind.name] ?? ''}
                          onChange={(e) => handleScoreChange(ind.name, parseInt(e.target.value) || 0, ind.max_score)}
                          className="input-field"
                          style={{ width: '80px', textAlign: 'center' }}
                          min={0}
                          max={ind.max_score}
                          required
                        />
                        <span style={{ color: 'var(--color-text-muted)' }}>/ {ind.max_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments & rating */}
              <div className="form-group">
                <label className="form-label">Reviewer Evaluation Comments</label>
                <textarea
                  value={reviewerComments}
                  onChange={(e) => setReviewerComments(e.target.value)}
                  className="input-field"
                  placeholder="Provide details about employee performance, achievements, or training requirements..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Final Rating</label>
                <select
                  value={finalRating}
                  onChange={(e) => setFinalRating(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Satisfactory">Satisfactory</option>
                  <option value="Needs Improvement">Needs Improvement</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setActiveAppraisal(null)} className="btn" style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
