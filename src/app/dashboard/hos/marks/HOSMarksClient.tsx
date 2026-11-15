'use client'

import React, { useState, useMemo } from 'react'
import {
  parseGradingLevels,
  getGradeForPercentage,
  getGradeColor,
  parseMarkScore,
} from '@/utils/grading'
import { inferWing, matchesWingFilter, type SchoolWing, type WingFilterValue } from '@/lib/wing'
import { WingSegmentedBar, WingBadge, useWingFilter } from '@/components/WingFilterBar'

export interface HOSMarksRecord {
  id: string
  class_id?: string
  subject_id?: string
  score: number | null
  raw_score?: number | null
  out_of?: number | null
  grading_scale?: string | null
  term: string
  assessment_type: string
  is_locked?: boolean
  is_released: boolean
  subjects?: { name: string }
  classes?: { name: string; section: string }
  students?: {
    student_id: string
    profiles?: { first_name: string; last_name: string }
  }
}

export default function HOSMarksClient({
  marks,
  initialGradingScale,
  initialWingFilter = 'all',
  lockedWing = null,
}: {
  marks: HOSMarksRecord[]
  initialGradingScale?: any
  initialWingFilter?: WingFilterValue
  lockedWing?: SchoolWing | null
}) {
  const gradingLevels = parseGradingLevels(initialGradingScale)
  const { wingFilter, setWingFilter } = useWingFilter(initialWingFilter, lockedWing)
  const [filterClass, setFilterClass] = useState('All')
  const [filterSubject, setFilterSubject] = useState('All')
  const [filterAssessment, setFilterAssessment] = useState('All')
  const [filterTerm, setFilterTerm] = useState('All')

  const wingCounts = useMemo(() => {
    let cambridge = 0
    let necta = 0
    for (const m of marks) {
      if (inferWing(m.classes || (m.students as any) || {}) === 'Cambridge') cambridge++
      else necta++
    }
    return { all: marks.length, Cambridge: cambridge, NECTA: necta }
  }, [marks])

  const classes = useMemo(
    () =>
      Array.from(
        new Set(
          marks
            .filter((m) => matchesWingFilter(m.classes || (m.students as any) || {}, wingFilter))
            .map((m) => m.classes?.name)
            .filter(Boolean)
        )
      ).sort(),
    [marks, wingFilter]
  )
  const subjects = useMemo(
    () =>
      Array.from(
        new Set(marks.map((m) => m.subjects?.name).filter(Boolean))
      ).sort(),
    [marks]
  )
  const assessments = useMemo(
    () =>
      Array.from(
        new Set(marks.map((m) => m.assessment_type).filter(Boolean))
      ).sort(),
    [marks]
  )
  const terms = useMemo(
    () => Array.from(new Set(marks.map((m) => m.term).filter(Boolean))).sort(),
    [marks]
  )

  const filtered = marks.filter((m) => {
    if (!matchesWingFilter(m.classes || (m.students as any) || {}, wingFilter)) return false
    return (
      (filterClass === 'All' || m.classes?.name === filterClass) &&
      (filterSubject === 'All' || m.subjects?.name === filterSubject) &&
      (filterAssessment === 'All' || m.assessment_type === filterAssessment) &&
      (filterTerm === 'All' || m.term === filterTerm)
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          Showing {filtered.length} mark entries
        </div>
        <WingSegmentedBar
          value={wingFilter}
          onChange={(next) => {
            setWingFilter(next)
            setFilterClass('All')
          }}
          lockedWing={lockedWing}
          counts={wingCounts}
          compact
        />
      </div>
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Class (Section Filter)
          </label>
          <select
            className="input-field"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="All">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Subject
          </label>
          <select
            className="input-field"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="All">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Assessment
          </label>
          <select
            className="input-field"
            value={filterAssessment}
            onChange={(e) => setFilterAssessment(e.target.value)}
          >
            <option value="All">All Assessments</option>
            {assessments.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Term
          </label>
          <select
            className="input-field"
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
          >
            <option value="All">All Terms</option>
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="glass-panel"
        style={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'rgba(0,0,0,0.02)',
                borderBottom: '2px solid var(--color-border)',
              }}
            >
              <th style={{ padding: '1rem' }}>Student</th>
              <th style={{ padding: '1rem' }}>Class</th>
              <th style={{ padding: '1rem' }}>Subject</th>
              <th style={{ padding: '1rem' }}>Assessment (Term)</th>
              <th style={{ padding: '1rem' }}>Score</th>
              <th style={{ padding: '1rem' }}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const parsed = parseMarkScore(m)
              const pct = parsed.percentage
              const isMissing = pct === null || pct === undefined
              const grade = isMissing
                ? 'N/A'
                : getGradeForPercentage(pct, gradingLevels)
              const studProf = Array.isArray(m.students?.profiles)
                ? m.students?.profiles[0]
                : m.students?.profiles

              return (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: isMissing
                      ? 'rgba(239, 68, 68, 0.05)'
                      : 'transparent',
                  }}
                >
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {studProf?.first_name} {studProf?.last_name}
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {m.students?.student_id}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span>{m.classes?.name} {m.classes?.section}</span>
                      <WingBadge wing={inferWing(m.classes || (m.students as any) || {})} />
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{m.subjects?.name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                    {m.assessment_type} ({m.term})
                  </td>
                  <td
                    style={{
                      padding: '1rem',
                      fontWeight: 600,
                      color: isMissing
                        ? 'var(--color-error)'
                        : 'var(--color-text)',
                    }}
                  >
                    {isMissing ? 'Missing' : `${pct.toFixed(1)}%`}
                    {!isMissing &&
                      parsed.rawScore !== null &&
                      parsed.outOf !== 100 && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          Raw: {parsed.rawScore} / {parsed.outOf}
                        </div>
                      )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        color: getGradeColor(grade),
                        border: `1px solid ${getGradeColor(grade)}`,
                      }}
                    >
                      {grade}
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                  }}
                >
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
