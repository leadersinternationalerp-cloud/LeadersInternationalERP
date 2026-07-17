'use client'

import { useState, useMemo } from 'react'
import { GradeLevel, getGradeForPercentage, getGradeColor } from '@/utils/grading'

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
  saveAction: (formData: FormData) => Promise<void>
}) {
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
  const [saving, setSaving] = useState(false)

  const outOfVal = parseFloat(outOf)
  const isOutOfInvalid = isNaN(outOfVal) || outOfVal <= 0

  const isDirty = useMemo(() => {
    const scoreChanged = Object.keys(scores).some(id => scores[id] !== (initialScores[id] || ''))
    if (scoreChanged) return true
    const remarkChanged = Object.keys(remarks).some(id => remarks[id] !== (initialRemarks[id] || ''))
    if (remarkChanged) return true
    return false
  }, [scores, remarks, initialScores, initialRemarks])

  const hasDrafts = existingMarks.length > 0 && !isReleased
  const buttonLabel = isDirty || !hasDrafts ? 'Save Draft' : 'Publish Marks'

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
      }
    }
  }

  const handleRemarksChange = (studentId: string, val: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: val }))
  }

  const handleSubmit = async (e: React.FormEvent, publish: boolean) => {
    e.preventDefault()
    if (isOutOfInvalid) {
      alert('Please enter a valid &quot;Out Of&quot; value greater than 0 before saving.')
      return
    }

    setSaving(true)

    const formData = new FormData()
    formData.append('classId', classId)
    formData.append('subjectId', subjectId)
    formData.append('assessmentType', assessmentType)
    formData.append('term', term)
    formData.append('publish', publish ? 'true' : 'false')

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
      setSaving(false)
      return
    }

    try {
      await saveAction(formData)
      alert(publish ? 'Marks published successfully!' : 'Draft marks saved successfully.')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
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
            disabled={isReadOnly || saving}
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
                      disabled={isReadOnly || saving || isOutOfInvalid}
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
                    <input
                      type="text"
                      value={remarks[stud.id]}
                      disabled={isReadOnly || saving}
                      onChange={(e) => handleRemarksChange(stud.id, e.target.value)}
                      placeholder="e.g. Very active student"
                      className="input-field"
                      style={{ padding: '0.4rem' }}
                    />
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
            disabled={saving || isOutOfInvalid}
            onClick={(e) => handleSubmit(e, !(isDirty || !hasDrafts))}
            className="btn btn-primary"
            style={{ padding: '0.6rem 2.5rem', cursor: isOutOfInvalid ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : buttonLabel}
          </button>
        </div>
      )}
    </form>
  )
}
