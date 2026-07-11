'use client'

import { useState } from 'react'

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
}

export default function MarksForm({
  students,
  existingMarks,
  isLocked,
  classId,
  subjectId,
  assessmentType,
  term,
  saveAction
}: {
  students: Student[]
  existingMarks: Mark[]
  isLocked: boolean
  classId: string
  subjectId: string
  assessmentType: string
  term: string
  saveAction: (formData: FormData) => Promise<void>
}) {
  // Initialize state
  const initialScores: Record<string, string> = {}
  const initialRemarks: Record<string, string> = {}

  students.forEach(s => {
    const existing = existingMarks.find(m => m.student_id === s.id)
    initialScores[s.id] = existing ? existing.score.toString() : ''
    initialRemarks[s.id] = existing ? existing.remarks : ''
  })

  const [scores, setScores] = useState<Record<string, string>>(initialScores)
  const [remarks, setRemarks] = useState<Record<string, string>>(initialRemarks)
  const [saving, setSaving] = useState(false)

  // Live Kiswahili Grading Calculator
  const getGrade = (scoreStr: string) => {
    const score = parseFloat(scoreStr)
    if (isNaN(score) || score < 0 || score > 100) return '-'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'var(--color-success)'
    if (grade === 'B') return 'var(--color-secondary)'
    if (grade === 'C') return 'var(--color-text)'
    if (grade === 'D') return 'var(--color-warning)'
    if (grade === 'F') return 'var(--color-error)'
    return 'var(--color-text-muted)'
  };

  const handleScoreChange = (studentId: string, val: string) => {
    if (val === '' || (/^\d*\.?\d*$/.test(val) && parseFloat(val) <= 100)) {
      setScores(prev => ({ ...prev, [studentId]: val }))
    }
  }

  const handleRemarksChange = (studentId: string, val: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: val }))
  }

  const handleSubmit = async (e: React.FormEvent, lock: boolean) => {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData()
    formData.append('classId', classId)
    formData.append('subjectId', subjectId)
    formData.append('assessmentType', assessmentType)
    formData.append('term', term)
    formData.append('lock', lock ? 'true' : 'false')

    Object.entries(scores).forEach(([studentId, scoreVal]) => {
      if (scoreVal !== '') {
        formData.append(`score_${studentId}`, scoreVal)
        formData.append(`remarks_${studentId}`, remarks[studentId] || '')
        formData.append(`grade_${studentId}`, getGrade(scoreVal))
      }
    })

    try {
      await saveAction(formData)
      alert(lock ? 'Marks submitted & locked successfully!' : 'Draft marks saved successfully.')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Marks Sheet Entry</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
          Assessment: <strong>{assessmentType}</strong> • Term: <strong>{term}</strong>
        </p>
      </div>

      {isLocked && (
        <div style={{
          padding: '0.75rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderLeft: '4px solid var(--color-warning)', borderRadius: '4px',
          color: 'var(--color-warning)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600
        }}>
          ⚠️ Marks are submitted & locked. Read-only mode active.
        </div>
      )}

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Student ID</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem', width: '120px' }}>Score (0-100)</th>
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
                      disabled={isLocked || saving}
                      onChange={(e) => handleScoreChange(stud.id, e.target.value)}
                      placeholder="e.g. 85"
                      className="input-field"
                      style={{ padding: '0.4rem', width: '90px', textAlign: 'center' }}
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
                      disabled={isLocked || saving}
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

      {!isLocked && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={saving}
            onClick={(e: any) => handleSubmit(e, false)}
            className="btn"
            style={{ padding: '0.6rem 2rem', background: 'transparent', border: '1px solid var(--color-border)' }}
          >
            Save Draft Grades
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e: any) => handleSubmit(e, true)}
            className="btn btn-primary"
            style={{ padding: '0.6rem 2.5rem' }}
          >
            {saving ? 'Saving...' : 'Submit & Lock Marks Sheet'}
          </button>
        </div>
      )}
    </form>
  )
}
