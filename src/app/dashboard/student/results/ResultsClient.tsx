'use client'

import React, { useState, useMemo } from 'react'
import { parseGradingLevels, getGradeForPercentage, getGradeColor } from '@/utils/grading'

export interface MarkRecord {
  id: string
  score: number
  term: string
  assessment_type: string
  remarks?: string
  subjects?: { name: string }
}

export default function ResultsClient({
  marks,
  initialGradingScale
}: {
  marks: MarkRecord[]
  initialGradingScale?: any
}) {
  const gradingLevels = parseGradingLevels(initialGradingScale)
  // Group by term
  const terms = useMemo(() => {
    const t = new Set<string>()
    marks.forEach(m => t.add(m.term))
    return Array.from(t).sort()
  }, [marks])

  const [activeTerm, setActiveTerm] = useState<string>(terms.length > 0 ? terms[terms.length - 1] : '')

  const termMarks = marks.filter(m => m.term === activeTerm)

  const getGrade = (score: number) => {
    return getGradeForPercentage(score, gradingLevels)
  }

  const overallAvg = termMarks.length > 0 
    ? Math.round(termMarks.reduce((acc, curr) => acc + curr.score, 0) / termMarks.length) 
    : 0
  const overallGrade = termMarks.length > 0 ? getGrade(overallAvg) : 'N/A'

  if (marks.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <h2>No Results Available</h2>
        <p>Results for the current term have not yet been released.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {terms.map(t => (
          <button
            key={t}
            onClick={() => setActiveTerm(t)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTerm === t ? 'var(--color-surface)' : 'transparent',
              color: activeTerm === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              fontWeight: activeTerm === t ? 600 : 500,
              cursor: 'pointer',
              borderBottom: activeTerm === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Average Score</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>{overallAvg}%</div>
        </div>
        <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Overall Grade</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{overallGrade}</div>
        </div>
        <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.print()} style={{ width: '100%' }}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Subject</th>
              <th style={{ padding: '1rem' }}>Assessment</th>
              <th style={{ padding: '1rem' }}>Score</th>
              <th style={{ padding: '1rem' }}>Grade</th>
              <th style={{ padding: '1rem' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {termMarks.map((m) => {
              const grade = getGrade(m.score)
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{m.subjects?.name || 'Unknown'}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{m.assessment_type}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{m.score}%</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600,
                      backgroundColor: 'rgba(0,0,0,0.03)',
                      color: getGradeColor(grade),
                      border: `1px solid ${getGradeColor(grade)}`
                    }}>
                      {grade}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{m.remarks || '-'}</td>
                </tr>
              )
            })}
            {termMarks.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No marks found for this term.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
