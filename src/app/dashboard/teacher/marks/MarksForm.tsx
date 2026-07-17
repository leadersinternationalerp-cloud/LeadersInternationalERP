'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { GradeLevel, getGradeForPercentage, getGradeColor } from '@/utils/grading'
import { getRandomGradeCommentAction } from './actions'

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
  remarks: string
  grading_scale?: string
}

export default function MarksForm({
  students,
  existingMarks,
  isLocked,
  isReleased,
  classId,
  subjectId,
  assessmentType,
  term,
  gradingLevels,
  saveAction
}: {
  students: Student[]
  existingMarks: Mark[]
  isLocked: boolean
  isReleased: boolean
  classId: string
  subjectId: string
  assessmentType: string
  term: string
  gradingLevels: GradeLevel[]
  saveAction: (formData: FormData) => Promise<{ success: boolean; error?: string; savedCount?: number }>
}) {
  const router = useRouter()
  const isReadOnly = isLocked || isReleased
  // Initialize Out Of from existing marks if present
  const [outOf, setOutOf] = useState<string>(() => {
    const firstMark = existingMarks[0]
    if (firstMark && firstMark.grading_scale) {
      const match = firstMark.grading_scale.match(/Out of (\d+)/)
      if (match) return match[1]
    }
    return '100'
  })

  // Initialize state
  const { initialScores, initialRemarks } = useMemo(() => {
    const scoresObj: Record<string, string> = {}
    const remarksObj: Record<string, string> = {}
    students.forEach(s => {
      const existing = existingMarks.find(m => m.student_id === s.id)
      scoresObj[s.id] = existing ? existing.score.toString() : ''
      remarksObj[s.id] = existing ? existing.remarks : ''
    })
    return { initialScores: scoresObj, initialRemarks: remarksObj }
  }, [students, existingMarks])

  const [scores, setScores] = useState<Record<string, string>>(initialScores)
  const [remarks, setRemarks] = useState<Record<string, string>>(initialRemarks)
  const [savingMode, setSavingMode] = useState<'draft' | 'publish' | null>(null)
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})

  const handleSuggestComment = async (studentId: string, targetGrade: string) => {
    if (targetGrade === '-') {
      return
    }

    console.log(`[ANTIGRAVITY-COMMENTS] Requesting suggestion. studentId=${studentId}, grade=${targetGrade}, subjectId=${subjectId}`)
    
    setLoadingComments(prev => ({ ...prev, [studentId]: true }))
    try {
      const result = await getRandomGradeCommentAction(subjectId, targetGrade)
      console.log('[ANTIGRAVITY-COMMENTS] Suggestion result:', result)

      if (result.success && result.comment) {
        // Race condition guard: verify current grade matches targetGrade
        setScores(currentScores => {
          const currentScore = currentScores[studentId] || ''
          const currentGrade = getGrade(currentScore)
          
          if (currentGrade === targetGrade) {
            handleRemarksChange(studentId, result.comment!)
            console.log(`[ANTIGRAVITY-COMMENTS] Automatically set/suggested remark for studentId=${studentId}`)
          } else {
            console.log(`[ANTIGRAVITY-COMMENTS] Ignored suggestion for studentId=${studentId} because grade changed from "${targetGrade}" to "${currentGrade}"`)
          }
          return currentScores
        })
      } else {
        const errMsg = result.error || 'No suggestions found'
        console.error('[ANTIGRAVITY-COMMENTS] Failed to get comment:', errMsg)
      }
    } catch (err) {
      console.error('[ANTIGRAVITY-COMMENTS] Error in handleSuggestComment:', err)
    } finally {
      setLoadingComments(prev => ({ ...prev, [studentId]: false }))
    }
  }
 
  const outOfVal = parseFloat(outOf)
  const isOutOfInvalid = isNaN(outOfVal) || outOfVal <= 0
 
  const hasDraftMarks = existingMarks.length > 0 && !isReleased && !isLocked
  const buttonLabel = hasDraftMarks ? 'Publish Marks' : 'Save Draft Marks'
  const isSaving = savingMode !== null
  const loadingLabel = savingMode === 'publish' ? 'Publishing...' : 'Saving Draft...'

  // Live Grading Calculator based on dynamic settings
  const getGrade = (scoreStr: string) => {
    const score = parseFloat(scoreStr)
    if (isNaN(score) || score < 0 || isOutOfInvalid || score > outOfVal) return '-'
    
    const percentage = (score / outOfVal) * 100
    return getGradeForPercentage(percentage, gradingLevels)
  }

  const handleScoreChange = (studentId: string, val: string) => {
    if (isOutOfInvalid) return

    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      const num = parseFloat(val)
      if (isNaN(num) || num <= outOfVal) {
        setScores(prev => ({ ...prev, [studentId]: val }))
        
        // Trigger automatic suggestion if the field is empty and grade is valid
        const currentGrade = getGrade(val)
        if (currentGrade !== '-' && (!remarks[studentId] || remarks[studentId].trim() === '')) {
          handleSuggestComment(studentId, currentGrade)
        }
      }
    }
  }

  const handleRemarksChange = (studentId: string, val: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: val }))
  }

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'publish') => {
    e.preventDefault()
    if (isOutOfInvalid) {
      alert('Please enter a valid &quot;Out Of&quot; value greater than 0 before saving.')
      return
    }

    setSavingMode(mode)

    const formData = new FormData()
    formData.append('classId', classId)
    formData.append('subjectId', subjectId)
    formData.append('assessmentType', assessmentType)
    formData.append('term', term)
    formData.append('mode', mode)

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
      alert(`Some scores exceed the "Out Of" limit of ${outOf}. Please correct them.`)
      setSavingMode(null)
      return
    }

    try {
      const result = await saveAction(formData)
      
      console.log('[ANTIGRAVITY-MARKS] saveAction result:', result)

      if (result && typeof result === 'object' && result.success === false) {
        const errMsg = result.error || 'Unknown server error'
        alert(`FAILED TO SAVE MARKS:\n\n${errMsg}\n\nOpen DevTools Console, filter for [ANTIGRAVITY-MARKS], and paste the logs here.`)
      } else {
        alert(mode === 'publish' ? 'Marks published successfully!' : 'Draft marks saved successfully.')
        router.refresh()
      }
    } catch (err: any) {
      console.error('[ANTIGRAVITY-MARKS] saveAction threw:', err)
      const digest = err?.digest || (err?.message?.match(/digest[:=]\s*([a-z0-9-]+)/i)?.[1] || '')
      alert(`FAILED TO SAVE MARKS:\n${err?.message || err}${digest ? '\nDigest: ' + digest : ''}\n\nPaste ALL [ANTIGRAVITY-MARKS] console output.`)
    } finally {
      setSavingMode(null)
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Marks Sheet Entry</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            Assessment: <strong>{assessmentType}</strong> • Term: <strong>{term}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>Out Of:</label>
          <input
            type="number"
            min="1"
            value={outOf}
            disabled={isReadOnly || isSaving}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || (parseInt(val) > 0 && /^\d+$/.test(val))) {
                setOutOf(val)
              }
            }}
            placeholder="e.g. 100"
            className="input-field"
            style={{ padding: '0.4rem', width: '80px', textAlign: 'center', fontWeight: 'bold' }}
            required
          />
        </div>
      </div>

      {isOutOfInvalid && (
        <div style={{
          padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderLeft: '4px solid var(--color-error)', borderRadius: '4px',
          color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600
        }}>
          ⚠️ Please enter a valid &quot;Out Of&quot; value greater than 0 to enter student scores.
        </div>
      )}

      {isReleased ? (
        <div style={{
          padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderLeft: '4px solid var(--color-success)', borderRadius: '4px',
          color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600
        }}>
          🟢 Marks are Published. Read-only mode active.
        </div>
      ) : isLocked ? (
        <div style={{
          padding: '0.75rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderLeft: '4px solid var(--color-warning)', borderRadius: '4px',
          color: 'var(--color-warning)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600
        }}>
          ⚠️ Marks are submitted & locked. Read-only mode active.
        </div>
      ) : (
        <div style={{
          padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.08)',
          borderLeft: '4px solid var(--color-primary)', borderRadius: '4px',
          color: 'var(--color-primary)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600
        }}>
          📝 Draft Mode. Marks are editable.
        </div>
      )}

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Student ID</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem', width: '150px' }}>Score (0-{outOf || '?'})</th>
              <th style={{ padding: '1rem', width: '80px', textAlign: 'center' }}>Grade</th>
              <th style={{ padding: '1rem' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stud) => {
              const currentScore = scores[stud.id]
              const currentGrade = getGrade(currentScore)
              return (
                <tr key={stud.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{stud.student_id}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {stud.profiles.first_name} {stud.profiles.last_name}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <input
                      type="text"
                      value={currentScore}
                      disabled={isReadOnly || isSaving || isOutOfInvalid}
                      onChange={(e) => handleScoreChange(stud.id, e.target.value)}
                      placeholder={isOutOfInvalid ? "Set Out Of" : `e.g. ${Math.min(outOfVal, 85)}`}
                      className="input-field"
                      style={{ padding: '0.4rem', width: '110px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <strong style={{
                      fontSize: '1.1rem',
                      color: getGradeColor(currentGrade)
                    }}>
                      {currentGrade}
                    </strong>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={remarks[stud.id]}
                        disabled={isReadOnly || isSaving}
                        onChange={(e) => handleRemarksChange(stud.id, e.target.value)}
                        placeholder="e.g. Very active student"
                        className="input-field"
                        style={{ padding: '0.4rem', flex: 1 }}
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          disabled={isSaving || loadingComments[stud.id]}
                          onClick={() => handleSuggestComment(stud.id, currentGrade)}
                          title="Suggest Comment"
                          style={{
                            padding: '0.3rem 0.6rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            opacity: loadingComments[stud.id] ? 0.5 : 1
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)'
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)'
                            e.currentTarget.style.backgroundColor = '#fff'
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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={isSaving || isOutOfInvalid}
            onClick={(e) => handleSubmit(e, hasDraftMarks ? 'publish' : 'draft')}
            className="btn btn-primary"
            style={{ padding: '0.6rem 2.5rem', cursor: isOutOfInvalid ? 'not-allowed' : 'pointer' }}
          >
            {isSaving ? loadingLabel : buttonLabel}
          </button>
        </div>
      )}
    </form>
  )
}
