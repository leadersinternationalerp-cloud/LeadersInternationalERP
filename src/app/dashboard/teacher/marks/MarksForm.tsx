'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  GradeLevel,
  getGradeForPercentage,
  getGradeColor,
  parseMarkScore,
} from '@/utils/grading'
import {
  getRandomGradeCommentAction,
  getBatchGradeCommentsAction,
  unlockMarksAction,
} from './actions'

interface Student {
  id: string
  student_id: string
  profiles: {
    first_name: string
    last_name: string
  }
}

interface Mark {
  student_id: string
  score: number
  raw_score?: number | null
  out_of?: number | null
  remarks: string
  grading_scale?: string
}

export default function MarksForm({
  students,
  existingMarks,
  isLocked,
  isReleased,
  canUnlock = false,
  classId,
  subjectId,
  assessmentType,
  term,
  gradingLevels,
  saveAction,
}: {
  students: Student[]
  existingMarks: Mark[]
  isLocked: boolean
  isReleased: boolean
  canUnlock?: boolean
  classId: string
  subjectId: string
  assessmentType: string
  term: string
  gradingLevels: GradeLevel[]
  saveAction: (
    formData: FormData
  ) => Promise<{ success: boolean; error?: string; savedCount?: number }>
}) {
  const router = useRouter()
  const isReadOnly = isLocked || isReleased

  // Initialize Out Of from existing marks using parseMarkScore
  const [outOf, setOutOf] = useState<string>(() => {
    const firstMark = existingMarks[0]
    if (firstMark) {
      const parsed = parseMarkScore(firstMark)
      if (parsed.outOf > 0) return String(parsed.outOf)
    }
    return '100'
  })

  // Initialize state with raw scores so teacher always edits the raw mark out of outOf
  const { initialScores, initialRemarks } = useMemo(() => {
    const scoresObj: Record<string, string> = {}
    const remarksObj: Record<string, string> = {}
    students.forEach((s) => {
      const existing = existingMarks.find((m) => m.student_id === s.id)
      if (existing) {
        const parsed = parseMarkScore(existing)
        scoresObj[s.id] =
          parsed.rawScore !== null && parsed.rawScore !== undefined
            ? String(parsed.rawScore)
            : ''
        remarksObj[s.id] = existing.remarks || ''
      } else {
        scoresObj[s.id] = ''
        remarksObj[s.id] = ''
      }
    })
    return { initialScores: scoresObj, initialRemarks: remarksObj }
  }, [students, existingMarks])

  const [scores, setScores] = useState<Record<string, string>>(initialScores)
  const [remarks, setRemarks] = useState<Record<string, string>>(initialRemarks)
  const [savingMode, setSavingMode] = useState<'draft' | 'publish' | 'unlock' | null>(
    null
  )
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [bulkLoadingComments, setBulkLoadingComments] = useState(false)
  const [suggestedRemarks, setSuggestedRemarks] = useState<Record<string, string>>({})
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const outOfVal = parseFloat(outOf)
  const isOutOfInvalid = isNaN(outOfVal) || outOfVal <= 0
  const isSaving = savingMode !== null

  const getPercentage = (scoreStr: string): number | null => {
    const score = parseFloat(scoreStr)
    if (isNaN(score) || score < 0 || isOutOfInvalid || score > outOfVal) return null
    return Math.round(((score / outOfVal) * 100) * 100) / 100
  }

  // Live Grading Calculator based on dynamic settings
  const getGrade = (scoreStr: string) => {
    const pct = getPercentage(scoreStr)
    if (pct === null) return '-'
    return getGradeForPercentage(pct, gradingLevels)
  }

  // Live class statistics
  const stats = useMemo(() => {
    const validPcts: number[] = []
    students.forEach((s) => {
      const pct = getPercentage(scores[s.id] || '')
      if (pct !== null) validPcts.push(pct)
    })
    if (validPcts.length === 0) {
      return {
        entered: 0,
        total: students.length,
        avg: null as number | null,
        avgGrade: '-',
        highest: null as number | null,
        lowest: null as number | null,
      }
    }
    const sum = validPcts.reduce((a, b) => a + b, 0)
    const avg = sum / validPcts.length
    return {
      entered: validPcts.length,
      total: students.length,
      avg,
      avgGrade: getGradeForPercentage(avg, gradingLevels),
      highest: Math.max(...validPcts),
      lowest: Math.min(...validPcts),
    }
  }, [scores, outOf, students, gradingLevels])

  const handleSuggestComment = async (studentId: string, targetGrade: string) => {
    if (targetGrade === '-') return

    setLoadingComments((prev) => ({ ...prev, [studentId]: true }))
    try {
      const result = await getRandomGradeCommentAction(subjectId, targetGrade)
      if (result.success && result.comment) {
        setScores((currentScores) => {
          const currentScore = currentScores[studentId] || ''
          const currentGrade = getGrade(currentScore)
          if (currentGrade === targetGrade) {
            handleRemarksChange(studentId, result.comment!)
            setSuggestedRemarks((prev) => ({ ...prev, [studentId]: result.comment! }))
          }
          return currentScores
        })
      }
    } catch (err) {
      console.error('Error in handleSuggestComment:', err)
    } finally {
      setLoadingComments((prev) => ({ ...prev, [studentId]: false }))
    }
  }

  const handleBulkAutoFillRemarks = async () => {
    const itemsToFill: { studentId: string; grade: string }[] = []
    students.forEach((s) => {
      const g = getGrade(scores[s.id] || '')
      const existingRemark = (remarks[s.id] || '').trim()
      if (g !== '-' && !existingRemark) {
        itemsToFill.push({ studentId: s.id, grade: g })
      }
    })

    if (itemsToFill.length === 0) {
      setFeedbackBanner({
        type: 'success',
        text: 'All graded students already have remarks filled in.',
      })
      return
    }

    setBulkLoadingComments(true)
    try {
      const res = await getBatchGradeCommentsAction(subjectId, itemsToFill)
      if (res.success && res.comments) {
        setRemarks((prev) => ({ ...prev, ...res.comments }))
        setSuggestedRemarks((prev) => ({ ...prev, ...res.comments }))
        setFeedbackBanner({
          type: 'success',
          text: `Auto-filled remarks for ${Object.keys(res.comments).length} student(s).`,
        })
      }
    } catch (err) {
      console.error('Error auto-filling remarks:', err)
    } finally {
      setBulkLoadingComments(false)
    }
  }

  const handleScoreChange = (studentId: string, val: string) => {
    if (isOutOfInvalid) return

    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      const num = parseFloat(val)
      if (isNaN(num) || num <= outOfVal) {
        const prevScore = scores[studentId] || ''
        const prevGrade = getGrade(prevScore)

        setScores((prev) => ({ ...prev, [studentId]: val }))

        const currentGrade = getGrade(val)
        if (currentGrade !== '-' && currentGrade !== prevGrade) {
          const isRemarkUnmodified =
            !remarks[studentId] ||
            remarks[studentId].trim() === '' ||
            remarks[studentId] === suggestedRemarks[studentId]

          if (isRemarkUnmodified) {
            handleSuggestComment(studentId, currentGrade)
          }
        }
      }
    }
  }

  const handleRemarksChange = (studentId: string, val: string) => {
    setRemarks((prev) => ({ ...prev, [studentId]: val }))
  }

  const handleUnlock = async () => {
    setSavingMode('unlock')
    setFeedbackBanner(null)
    try {
      const formData = new FormData()
      formData.append('classId', classId)
      formData.append('subjectId', subjectId)
      formData.append('assessmentType', assessmentType)
      formData.append('term', term)
      const res = await unlockMarksAction(formData)
      if (!res.success) {
        setFeedbackBanner({
          type: 'error',
          text: res.error || 'Failed to unlock marks.',
        })
      } else {
        setFeedbackBanner({
          type: 'success',
          text: 'Marks unlocked! You can now edit and re-save.',
        })
        router.refresh()
      }
    } finally {
      setSavingMode(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'publish') => {
    e.preventDefault()
    setFeedbackBanner(null)

    if (isOutOfInvalid) {
      setFeedbackBanner({
        type: 'error',
        text: 'Please enter a valid "Out Of" value greater than 0 before saving.',
      })
      return
    }

    setSavingMode(mode)

    const formData = new FormData()
    formData.append('classId', classId)
    formData.append('subjectId', subjectId)
    formData.append('assessmentType', assessmentType)
    formData.append('term', term)
    formData.append('mode', mode)
    formData.append('outOf', outOf)

    let hasInvalidScore = false

    Object.entries(scores).forEach(([studentId, scoreVal]) => {
      if (scoreVal !== '') {
        const score = parseFloat(scoreVal)
        if (isNaN(score) || score < 0 || score > outOfVal) {
          hasInvalidScore = true
        }
        formData.append(`score_${studentId}`, scoreVal)
        formData.append(`remarks_${studentId}`, remarks[studentId] || '')
        formData.append(`grade_${studentId}`, `Out of ${outOf} (${getGrade(scoreVal)})`)
      }
    })

    if (hasInvalidScore) {
      setFeedbackBanner({
        type: 'error',
        text: `Some scores exceed the "Out Of" limit of ${outOf}. Please correct them.`,
      })
      setSavingMode(null)
      return
    }

    try {
      const result = await saveAction(formData)

      if (result && typeof result === 'object' && result.success === false) {
        setFeedbackBanner({
          type: 'error',
          text: result.error || 'Failed to save marks.',
        })
      } else {
        setFeedbackBanner({
          type: 'success',
          text:
            mode === 'publish'
              ? `Marks submitted & published (${result.savedCount || 0} student records)!`
              : `Draft marks saved (${result.savedCount || 0} student records). Raw scores and Out Of (${outOf}) stored.`,
        })
        router.refresh()
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'An unexpected error occurred while saving marks.',
      })
    } finally {
      setSavingMode(null)
    }
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="glass-panel"
      style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Marks Sheet Entry</h2>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--color-text-muted)',
              margin: '0.25rem 0 0 0',
            }}
          >
            Assessment: <strong>{assessmentType}</strong> • Term:{' '}
            <strong>{term}</strong> • Raw scores are automatically normalized to %
            from <strong>Out Of</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!isReadOnly && (
            <button
              type="button"
              disabled={isSaving || bulkLoadingComments}
              onClick={handleBulkAutoFillRemarks}
              className="btn btn-secondary"
              style={{
                padding: '0.45rem 0.9rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Automatically fill remarks for graded students with empty remarks"
            >
              <span>✦</span>
              {bulkLoadingComments ? 'Auto-Filling...' : 'Auto-Fill Missing Remarks'}
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(0,0,0,0.02)',
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <label
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
            >
              Out Of:
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={outOf}
              disabled={isReadOnly || isSaving}
              onChange={(e) => {
                const val = e.target.value
                if (val === '' || (parseFloat(val) > 0 && /^\d*\.?\d*$/.test(val))) {
                  setOutOf(val)
                }
              }}
              placeholder="e.g. 100"
              className="input-field"
              style={{
                padding: '0.35rem',
                width: '80px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
              required
            />
          </div>
        </div>
      </div>

      {/* Live Class Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          padding: '0.85rem 1rem',
          backgroundColor: 'rgba(15, 23, 42, 0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          fontSize: '0.85rem',
        }}
      >
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Scores Entered: </span>
          <strong>
            {stats.entered} / {stats.total}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Class Average: </span>
          <strong>
            {stats.avg !== null ? `${stats.avg.toFixed(1)}% (${stats.avgGrade})` : '-'}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Highest: </span>
          <strong style={{ color: 'var(--color-success)' }}>
            {stats.highest !== null ? `${stats.highest.toFixed(1)}%` : '-'}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Lowest: </span>
          <strong style={{ color: 'var(--color-warning)' }}>
            {stats.lowest !== null ? `${stats.lowest.toFixed(1)}%` : '-'}
          </strong>
        </div>
      </div>

      {feedbackBanner && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor:
              feedbackBanner.type === 'success'
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            borderLeft: `4px solid ${
              feedbackBanner.type === 'success'
                ? 'var(--color-success)'
                : 'var(--color-error)'
            }`,
            borderRadius: '4px',
            color:
              feedbackBanner.type === 'success'
                ? 'var(--color-success)'
                : 'var(--color-error)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          {feedbackBanner.text}
        </div>
      )}

      {isOutOfInvalid && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid var(--color-error)',
            borderRadius: '4px',
            color: 'var(--color-error)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: 600,
          }}
        >
          ⚠️ Please enter a valid &quot;Out Of&quot; value greater than 0 to enter
          student scores.
        </div>
      )}

      {isReleased ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderLeft: '4px solid var(--color-success)',
            borderRadius: '4px',
            color: 'var(--color-success)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span>🟢 Marks are Published. Read-only mode active.</span>
          {canUnlock && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleUnlock}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            >
              {savingMode === 'unlock' ? 'Unlocking...' : '🔓 Unlock for Editing'}
            </button>
          )}
        </div>
      ) : isLocked ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '4px solid var(--color-warning)',
            borderRadius: '4px',
            color: 'var(--color-warning)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span>⚠️ Marks are submitted & locked. Read-only mode active.</span>
          {canUnlock && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleUnlock}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            >
              {savingMode === 'unlock' ? 'Unlocking...' : '🔓 Unlock for Editing'}
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderLeft: '4px solid var(--color-primary)',
            borderRadius: '4px',
            color: 'var(--color-primary)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: 600,
          }}
        >
          📝 Draft Mode. You can save drafts freely or submit &amp; lock when ready.
        </div>
      )}

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderBottom: '2px solid var(--color-border)',
              }}
            >
              <th style={{ padding: '0.85rem 1rem' }}>Student ID</th>
              <th style={{ padding: '0.85rem 1rem' }}>Name</th>
              <th style={{ padding: '0.85rem 1rem', width: '140px' }}>
                Raw Score (0–{outOf || '?'})
              </th>
              <th style={{ padding: '0.85rem 1rem', width: '95px', textAlign: 'center' }}>
                % Score
              </th>
              <th style={{ padding: '0.85rem 1rem', width: '80px', textAlign: 'center' }}>
                Grade
              </th>
              <th style={{ padding: '0.85rem 1rem' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stud) => {
              const currentScore = scores[stud.id] || ''
              const currentPct = getPercentage(currentScore)
              const currentGrade = getGrade(currentScore)
              return (
                <tr
                  key={stud.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                    {stud.student_id}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                    {stud.profiles?.first_name} {stud.profiles?.last_name}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <input
                      type="text"
                      value={currentScore}
                      disabled={isReadOnly || isSaving || isOutOfInvalid}
                      onChange={(e) => handleScoreChange(stud.id, e.target.value)}
                      placeholder={
                        isOutOfInvalid
                          ? 'Set Out Of'
                          : `0–${outOfVal}`
                      }
                      className="input-field"
                      style={{
                        padding: '0.4rem',
                        width: '105px',
                        textAlign: 'center',
                        fontWeight: 600,
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: '0.85rem 1rem',
                      textAlign: 'center',
                      fontWeight: 600,
                      color:
                        currentPct !== null
                          ? 'var(--color-text)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    {currentPct !== null ? `${currentPct.toFixed(1)}%` : '-'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <strong
                      style={{
                        fontSize: '1.05rem',
                        color: getGradeColor(currentGrade),
                      }}
                    >
                      {currentGrade}
                    </strong>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={remarks[stud.id] || ''}
                        disabled={isReadOnly || isSaving}
                        onChange={(e) => handleRemarksChange(stud.id, e.target.value)}
                        placeholder="e.g. Strong mastery of key concepts"
                        className="input-field"
                        style={{ padding: '0.4rem', flex: 1 }}
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          disabled={isSaving || loadingComments[stud.id] || currentGrade === '-'}
                          onClick={() => handleSuggestComment(stud.id, currentGrade)}
                          title="Suggest Constructive Remark for Grade"
                          style={{
                            padding: '0.3rem 0.6rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#fff',
                            cursor: currentGrade === '-' ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            opacity: loadingComments[stud.id] || currentGrade === '-' ? 0.5 : 1,
                          }}
                        >
                          {loadingComments[stud.id] ? '⏳' : '✦'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!isReadOnly && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            disabled={isSaving || isOutOfInvalid}
            onClick={(e) => handleSubmit(e, 'draft')}
            className="btn btn-secondary"
            style={{
              padding: '0.6rem 1.75rem',
              fontWeight: 600,
              cursor: isOutOfInvalid ? 'not-allowed' : 'pointer',
            }}
          >
            {savingMode === 'draft' ? 'Saving Draft...' : '💾 Save Draft Marks'}
          </button>

          <button
            type="button"
            disabled={isSaving || isOutOfInvalid}
            onClick={(e) => handleSubmit(e, 'publish')}
            className="btn btn-primary"
            style={{
              padding: '0.6rem 2rem',
              fontWeight: 600,
              cursor: isOutOfInvalid ? 'not-allowed' : 'pointer',
            }}
          >
            {savingMode === 'publish' ? 'Publishing...' : '✅ Submit & Publish Marks'}
          </button>
        </div>
      )}
    </form>
  )
}
