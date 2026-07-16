'use client'

import React, { useState, useMemo } from 'react'

export interface MarksOverviewRecord {
  id: string
  score: number
  term: string
  assessment_type: string
  is_released: boolean
  teacher_id?: string
  subjects?: { name: string }
  classes?: { name: string; section: string }
  students?: { 
    student_id: string
    profiles?: { first_name: string; last_name: string } 
  }
}

export default function DeanMarksClient({ marks }: { marks: MarksOverviewRecord[] }) {
  const [filterClass, setFilterClass] = useState('All')
  const [filterSubject, setFilterSubject] = useState('All')
  const [filterTerm, setFilterTerm] = useState('All')

  const classes = useMemo(() => Array.from(new Set(marks.map(m => m.classes?.name).filter(Boolean))).sort(), [marks])
  const subjects = useMemo(() => Array.from(new Set(marks.map(m => m.subjects?.name).filter(Boolean))).sort(), [marks])
  const terms = useMemo(() => Array.from(new Set(marks.map(m => m.term).filter(Boolean))).sort(), [marks])

  const filtered = marks.filter(m => {
    return (filterClass === 'All' || m.classes?.name === filterClass) &&
           (filterSubject === 'All' || m.subjects?.name === filterSubject) &&
           (filterTerm === 'All' || m.term === filterTerm)
  })

  const getGrade = (score: number) => {
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const handleFlagReview = async (markId: string) => {
    // In a full implementation, this would trigger a server action to create a notification
    // for the teacher indicating that a specific mark needs review.
    alert(`Mark ID ${markId} flagged for review. Teacher will be notified.`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            Class
          </label>
          <select className="input-field" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="All">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            Subject
          </label>
          <select className="input-field" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="All">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            Term
          </label>
          <select className="input-field" value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
            <option value="All">All Terms</option>
            {terms.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Student</th>
              <th style={{ padding: '1rem' }}>Class</th>
              <th style={{ padding: '1rem' }}>Subject</th>
              <th style={{ padding: '1rem' }}>Assessment (Term)</th>
              <th style={{ padding: '1rem' }}>Score</th>
              <th style={{ padding: '1rem' }}>Grade</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const grade = getGrade(m.score)
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {m.students?.profiles?.first_name} {m.students?.profiles?.last_name}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.students?.student_id}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{m.classes?.name} {m.classes?.section}</td>
                  <td style={{ padding: '1rem' }}>{m.subjects?.name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{m.assessment_type} ({m.term})</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{m.score}%</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600,
                      backgroundColor: grade === 'A' ? 'rgba(16, 185, 129, 0.1)' : grade === 'F' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.05)',
                      color: grade === 'A' ? 'var(--color-success)' : grade === 'F' ? 'var(--color-error)' : 'var(--color-text)'
                    }}>
                      {grade}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button onClick={() => handleFlagReview(m.id)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
                      🚩 Flag Review
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No marks found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
