'use client'

import { useState } from 'react'
import { saveSelfAssessmentAction } from '../../director/appraisals/actions'

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

interface StaffAppraisalsClientProps {
  cycles: AppraisalCycle[]
  appraisals: Appraisal[]
}

export function StaffAppraisalsClient({ cycles, appraisals }: StaffAppraisalsClientProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>(cycles[0]?.id || '')
  const [selfScores, setSelfScores] = useState<Record<string, number>>({})
  const [selfComments, setSelfComments] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId)
  const appraisal = appraisals.find((a) => a.cycle_id === selectedCycleId) || null

  // Initialize self scores when cycle or appraisal changes
  const [lastInitialized, setLastInitialized] = useState<string>('')
  const initKey = `${selectedCycleId}-${appraisal?.id || 'new'}`
  if (selectedCycle && initKey !== lastInitialized) {
    const scores: Record<string, number> = {}
    selectedCycle.indicators.forEach((ind) => {
      scores[ind.name] = appraisal?.self_scores?.[ind.name] !== undefined 
        ? appraisal.self_scores[ind.name] 
        : ind.max_score
    })
    setSelfScores(scores)
    setSelfComments(appraisal?.self_comments || '')
    setLastInitialized(initKey)
    setError(null)
    setSuccess(false)
  }

  if (cycles.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No appraisal cycles have been active or created yet.
      </div>
    )
  }

  const handleScoreChange = (indicatorName: string, val: number, maxScore: number) => {
    setSelfScores({
      ...selfScores,
      [indicatorName]: Math.min(maxScore, Math.max(0, val))
    })
  }

  const handleSubmitSelfAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCycle) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('cycle_id', selectedCycle.id)
    formData.append('self_scores', JSON.stringify(selfScores))
    formData.append('self_comments', selfComments)

    const res = await saveSelfAssessmentAction(formData)
    setIsSubmitting(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess(true)
    }
  }

  // Calculate totals
  const totalMaxScore = selectedCycle?.indicators.reduce((acc, curr) => acc + curr.max_score, 0) || 0
  const totalSelfScore = selectedCycle?.indicators.reduce((acc, curr) => acc + (selfScores[curr.name] || 0), 0) || 0
  const totalReviewerScore = selectedCycle?.indicators.reduce((acc, curr) => acc + (appraisal?.reviewer_scores?.[curr.name] || 0), 0) || 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
      {/* Appraisal Cycles Selector & Statuses */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Select Appraisal Cycle</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cycles.map((c) => {
              const app = appraisals.find((a) => a.cycle_id === c.id)
              const isActive = c.id === selectedCycleId

              let badgeText = 'Not Started'
              let badgeColor = 'var(--color-text-muted)'
              let badgeBg = 'rgba(100, 116, 139, 0.1)'

              if (app) {
                if (app.status === 'Completed') {
                  badgeText = 'Completed'
                  badgeColor = 'var(--color-success)'
                  badgeBg = 'rgba(16, 185, 129, 0.1)'
                } else {
                  badgeText = 'In Review'
                  badgeColor = 'var(--color-accent)'
                  badgeBg = 'rgba(247, 178, 57, 0.1)'
                }
              }

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCycleId(c.id)}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isActive ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                    backgroundColor: isActive ? 'rgba(59, 179, 195, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</span>
                    <span style={{
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: badgeBg,
                      color: badgeColor
                    }}>
                      {badgeText}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    End Date: {new Date(c.end_date).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Evaluation Summary if Completed */}
        {appraisal?.status === 'Completed' && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-success)' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--color-success)' }}>Evaluation Final Result</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <span>Final Rating:</span>
                <span style={{
                  fontWeight: 700,
                  color: 'var(--color-secondary)'
                }}>
                  {appraisal.final_rating}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <span>Self Score Total:</span>
                <span style={{ fontWeight: 600 }}>{totalSelfScore} / {totalMaxScore}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <span>Reviewer Score Total:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{totalReviewerScore} / {totalMaxScore}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Appraisal Evaluation details */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        {selectedCycle && (
          <>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem' }}>{selectedCycle.name} Details</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Evaluation period: {new Date(selectedCycle.start_date).toLocaleDateString()} to {new Date(selectedCycle.end_date).toLocaleDateString()}
              </p>
            </div>

            {appraisal?.status === 'Completed' ? (
              // Read-only completed view
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Scores Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedCycle.indicators.map((ind) => {
                      const sScore = appraisal.self_scores?.[ind.name] ?? 0
                      const rScore = appraisal.reviewer_scores?.[ind.name] ?? 0
                      return (
                        <div key={ind.name} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.25rem' }}>
                            <span>{ind.name}</span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Max Score: {ind.max_score}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Self Score: </span>
                              <strong>{sScore}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Reviewer Score: </span>
                              <strong style={{ color: 'var(--color-success)' }}>{rScore}</strong>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>My Self Comments</strong>
                    <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {appraisal.self_comments ? `"${appraisal.self_comments}"` : 'No comments submitted.'}
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(59, 179, 195, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 179, 195, 0.1)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-secondary)' }}>Reviewer Comments</strong>
                    <p style={{ fontStyle: 'italic', color: 'var(--color-text)', fontSize: '0.875rem' }}>
                      {appraisal.reviewer_comments ? `"${appraisal.reviewer_comments}"` : 'No evaluator comments.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Self-assessment editable form
              <form onSubmit={handleSubmitSelfAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {error && <div className="auth-error">{error}</div>}
                {success && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderLeft: '4px solid var(--color-success)',
                    color: 'var(--color-success)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem'
                  }}>
                    Self-assessment submitted successfully! It is now under review.
                  </div>
                )}

                {appraisal?.status === 'In Review' && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(247, 178, 57, 0.1)',
                    borderLeft: '4px solid var(--color-accent)',
                    color: 'var(--color-accent)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}>
                    You have already submitted a self-assessment. You can update your self-scores/comments until your reviewer completes the final evaluation.
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Self-Scoring Criteria</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedCycle.indicators.map((ind) => (
                      <div key={ind.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{ind.name}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Max Score: {ind.max_score}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input
                            type="range"
                            min={0}
                            max={ind.max_score}
                            value={selfScores[ind.name] ?? ind.max_score}
                            onChange={(e) => handleScoreChange(ind.name, parseInt(e.target.value) || 0, ind.max_score)}
                            style={{ flex: 1, accentColor: 'var(--color-secondary)' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input
                              type="number"
                              min={0}
                              max={ind.max_score}
                              value={selfScores[ind.name] ?? ind.max_score}
                              onChange={(e) => handleScoreChange(ind.name, parseInt(e.target.value) || 0, ind.max_score)}
                              className="input-field"
                              style={{ width: '60px', padding: '0.35rem', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>/ {ind.max_score}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Self Assessment Comments</label>
                  <textarea
                    value={selfComments}
                    onChange={(e) => setSelfComments(e.target.value)}
                    className="input-field"
                    placeholder="Reflect on your achievements, areas of improvement, and goals during this cycle..."
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : appraisal ? 'Update Self-Assessment' : 'Submit Self-Assessment'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
