'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Lock, CheckCircle2, ClipboardList, Save } from 'lucide-react'
import { createCATestAction, deleteCATestAction, saveCATestScoresAction } from './actions'

export interface CATestItem {
  id: string
  class_id: string
  subject_id: string
  term: string
  title: string
  assessment_date: string
  max_mark: number
  is_locked: boolean
  scored_count: number
}

export interface StudentRow {
  id: string
  student_id: string
  first_name: string
  last_name: string
}

export interface CAScoreRow {
  assessment_id: string
  student_id: string
  raw_score: number
  percentage: number
  remarks: string
}

interface Props {
  classes: Array<{ id: string; name: string; section?: string }>
  allocations: Array<{ class_id: string; subject_id: string; subject_name: string }>
  terms: string[]
  selectedClassId: string
  selectedSubjectId: string
  selectedTerm: string
  tests: CATestItem[]
  students: StudentRow[]
  scores: CAScoreRow[]
  canUnlock: boolean
}

export default function CATestsClient({
  classes,
  allocations,
  terms,
  selectedClassId,
  selectedSubjectId,
  selectedTerm,
  tests,
  students,
  scores,
  canUnlock,
}: Props) {
  const router = useRouter()

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [maxMark, setMaxMark] = useState('100')
  const [creating, setCreating] = useState(false)

  const [activeTestId, setActiveTestId] = useState<string>(tests[0]?.id || '')
  const [draftScores, setDraftScores] = useState<Record<string, { raw_score: string; remarks: string }>>({})
  const [savingScores, setSavingScores] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; msg: string } | null>(null)

  const activeTest = tests.find(t => t.id === activeTestId) || null

  useEffect(() => {
    if (!tests.some(t => t.id === activeTestId)) {
      setActiveTestId(tests[0]?.id || '')
    }
  }, [tests, activeTestId])

  useEffect(() => {
    const map: Record<string, { raw_score: string; remarks: string }> = {}
    students.forEach(s => {
      const existing = scores.find(sc => sc.assessment_id === activeTestId && sc.student_id === s.id)
      map[s.id] = {
        raw_score: existing ? String(existing.raw_score) : '',
        remarks: existing?.remarks || '',
      }
    })
    setDraftScores(map)
    setFeedback(null)
  }, [activeTestId, students, scores])

  const subjectsForClass = allocations.filter(a => a.class_id === selectedClassId)

  const navigateFilter = (clsId: string, subjId: string, termVal: string) => {
    const params = new URLSearchParams()
    if (clsId) params.set('class_id', clsId)
    if (subjId) params.set('subject_id', subjId)
    if (termVal) params.set('term', termVal)
    router.push(`/dashboard/teacher/ca-tests?${params.toString()}`)
  }

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFeedback(null)
    const res = await createCATestAction({
      class_id: selectedClassId,
      subject_id: selectedSubjectId,
      term: selectedTerm,
      title,
      assessment_date: assessmentDate,
      max_mark: parseFloat(maxMark) || 100,
    })
    setCreating(false)
    if (res.error) {
      setFeedback({ type: 'error', msg: res.error })
    } else {
      setTitle('')
      setShowCreate(false)
      setFeedback({ type: 'success', msg: `Created C.A. test "${res.assessment?.title}".` })
      if (res.assessment?.id) setActiveTestId(res.assessment.id)
      router.refresh()
    }
  }

  const handleDeleteTest = async (id: string, testTitle: string) => {
    if (!confirm(`Delete C.A. test "${testTitle}" and its scores?`)) return
    setFeedback(null)
    const res = await deleteCATestAction(id)
    if (res.error) {
      setFeedback({ type: 'error', msg: res.error })
    } else {
      setFeedback({ type: 'success', msg: `Deleted "${testTitle}".` })
      router.refresh()
    }
  }

  const handleSaveScores = async (lock: boolean) => {
    if (!activeTest) return
    setSavingScores(true)
    setFeedback(null)
    const entries = students.map(s => ({
      student_id: s.id,
      raw_score: draftScores[s.id]?.raw_score ?? '',
      remarks: draftScores[s.id]?.remarks ?? '',
    }))
    const res = await saveCATestScoresAction({
      assessment_id: activeTest.id,
      lock,
      entries,
    })
    setSavingScores(false)
    if (res.error) {
      setFeedback({ type: 'error', msg: res.error })
    } else {
      setFeedback({
        type: 'success',
        msg: lock
          ? `Published ${res.savedCount} score(s) and rolled up C.A. average to Marks!`
          : `Saved ${res.savedCount} draft score(s) and updated C.A. average.`,
      })
      router.refresh()
    }
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: '180px', flex: 1 }}>
          <label className="form-label">Class</label>
          <select
            className="input-field"
            value={selectedClassId}
            onChange={e => {
              const nextCls = e.target.value
              const firstSubj = allocations.find(a => a.class_id === nextCls)?.subject_id || ''
              navigateFilter(nextCls, firstSubj, selectedTerm)
            }}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ minWidth: '180px', flex: 1 }}>
          <label className="form-label">Subject</label>
          <select
            className="input-field"
            value={selectedSubjectId}
            onChange={e => navigateFilter(selectedClassId, e.target.value, selectedTerm)}
          >
            {subjectsForClass.map(s => (
              <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ minWidth: '150px' }}>
          <label className="form-label">Term</label>
          <select
            className="input-field"
            value={selectedTerm}
            onChange={e => navigateFilter(selectedClassId, selectedSubjectId, e.target.value)}
          >
            {terms.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(v => !v)}
          className="btn btn-primary"
          disabled={!selectedClassId || !selectedSubjectId}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem' }}
        >
          <Plus size={16} /> New C.A. Test
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            fontWeight: 600,
            backgroundColor: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: feedback.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Create Test Form */}
      {showCreate && (
        <form onSubmit={handleCreateTest} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.05rem' }}>Create New C.A. / Unit Test</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label">Test / Topic Title *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Topic 3: Fractions Test"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="input-field"
                value={assessmentDate}
                onChange={e => setAssessmentDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Max Mark (Out of) *</label>
              <input
                type="number"
                min={1}
                step="0.5"
                className="input-field"
                value={maxMark}
                onChange={e => setMaxMark(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </form>
      )}

      {/* Tests List + Score Entry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ClipboardList size={17} /> C.A. Tests ({tests.length})
          </h3>
          {tests.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No C.A. tests created yet for this class &amp; subject. Click &ldquo;New C.A. Test&rdquo; above to create one.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {tests.map(t => {
                const isSelected = t.id === activeTestId
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTestId(t.id)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{t.title}</strong>
                      {t.is_locked ? (
                        <Lock size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteTest(t.id, t.title)
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: 0 }}
                          title="Delete test"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      {t.assessment_date} • Out of {t.max_mark} • {t.scored_count}/{students.length} scored
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Score Entry Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          {!activeTest ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Select or create a C.A. test on the left to enter student marks.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{activeTest.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Date: {activeTest.assessment_date} • Max Mark: <strong>{activeTest.max_mark}</strong> • Automatically rolls up to <strong>C.A.</strong> average
                  </div>
                </div>
                {activeTest.is_locked && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Lock size={13} /> Locked &amp; Published
                  </span>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.7rem 0.5rem' }}>ID</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Student</th>
                      <th style={{ padding: '0.7rem 0.5rem', width: '130px' }}>Score (/ {activeTest.max_mark})</th>
                      <th style={{ padding: '0.7rem 0.5rem', width: '80px' }}>%</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const entry = draftScores[s.id] || { raw_score: '', remarks: '' }
                      const rawNum = parseFloat(entry.raw_score)
                      const pct = !isNaN(rawNum) && activeTest.max_mark > 0
                        ? Math.round(((rawNum / activeTest.max_mark) * 100) * 10) / 10
                        : null
                      const disabled = (activeTest.is_locked && !canUnlock) || savingScores
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{s.student_id}</td>
                          <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.9rem' }}>{s.first_name} {s.last_name}</td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <input
                              type="number"
                              min={0}
                              max={activeTest.max_mark}
                              step="0.5"
                              disabled={disabled}
                              className="input-field"
                              style={{ width: '105px', padding: '0.35rem 0.5rem' }}
                              value={entry.raw_score}
                              onChange={e =>
                                setDraftScores(prev => ({
                                  ...prev,
                                  [s.id]: { ...entry, raw_score: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            {pct !== null ? `${pct}%` : '—'}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <input
                              type="text"
                              disabled={disabled}
                              className="input-field"
                              style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                              placeholder="Optional remark..."
                              value={entry.remarks}
                              onChange={e =>
                                setDraftScores(prev => ({
                                  ...prev,
                                  [s.id]: { ...entry, remarks: e.target.value },
                                }))
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {(!activeTest.is_locked || canUnlock) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={savingScores}
                    onClick={() => handleSaveScores(false)}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Save size={15} /> Save Draft &amp; Update C.A.
                  </button>
                  <button
                    type="button"
                    disabled={savingScores}
                    onClick={() => handleSaveScores(true)}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle2 size={15} /> Publish &amp; Lock Test
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
