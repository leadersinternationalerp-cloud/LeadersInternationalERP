'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  parseGradingLevels,
  getGradeForPercentage,
  getGradeColor,
  parseMarkScore,
} from '@/utils/grading'
import { inferWing, matchesWingFilter, type SchoolWing, type WingFilterValue } from '@/lib/wing'
import { WingSegmentedBar, WingBadge, useWingFilter } from '@/components/WingFilterBar'
import { flagAndUnlockMarkAction } from './actions'

export interface MarksOverviewRecord {
  id: string
  class_id?: string
  subject_id?: string
  score: number
  raw_score?: number | null
  out_of?: number | null
  grading_scale?: string | null
  remarks?: string | null
  term: string
  assessment_type: string
  is_locked?: boolean
  is_released: boolean
  graded_by?: string
  subjects?: { name: string }
  classes?: { name: string; section: string }
  students?: {
    student_id: string
    profiles?: { first_name: string; last_name: string }
  }
}

export default function DeanMarksClient({
  marks,
  initialGradingScale,
  initialWingFilter = 'all',
  lockedWing = null,
}: {
  marks: MarksOverviewRecord[]
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
  const [filterStatus, setFilterStatus] = useState('All')
  const [flaggingId, setFlaggingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
    const matchesClass = filterClass === 'All' || m.classes?.name === filterClass
    const matchesSubject =
      filterSubject === 'All' || m.subjects?.name === filterSubject
    const matchesAssessment =
      filterAssessment === 'All' || m.assessment_type === filterAssessment
    const matchesTerm = filterTerm === 'All' || m.term === filterTerm
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Released' && m.is_released) ||
      (filterStatus === 'Locked' && m.is_locked && !m.is_released) ||
      (filterStatus === 'Draft' && !m.is_locked && !m.is_released)

    return (
      matchesClass &&
      matchesSubject &&
      matchesAssessment &&
      matchesTerm &&
      matchesStatus
    )
  })

  const handleFlagReview = async (markId: string) => {
    setFlaggingId(markId)
    setStatusMessage(null)
    try {
      const res = await flagAndUnlockMarkAction(markId)
      if (res.success) {
        setStatusMessage(
          'Mark unlocked for teacher revision and teacher notified.'
        )
      } else {
        setStatusMessage(`Error: ${res.error || 'Failed to flag mark'}`)
      }
    } finally {
      setFlaggingId(null)
    }
  }

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
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Class
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
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
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
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
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
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
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
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Status
          </label>
          <select
            className="input-field"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Locked">Locked / Submitted</option>
            <option value="Released">Released</option>
          </select>
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: statusMessage.startsWith('Error')
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(16, 185, 129, 0.1)',
            color: statusMessage.startsWith('Error')
              ? 'var(--color-error)'
              : 'var(--color-success)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </div>
      )}

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
              <th style={{ padding: '1rem' }}>Score (Raw / %)</th>
              <th style={{ padding: '1rem' }}>Grade</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const parsed = parseMarkScore(m)
              const pct = parsed.percentage
              const grade = getGradeForPercentage(pct, gradingLevels)
              const studProf = Array.isArray(m.students?.profiles)
                ? m.students?.profiles[0]
                : m.students?.profiles

              return (
                <tr
                  key={m.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
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
                  <td style={{ padding: '1rem', fontWeight: 600 }}>
                    {pct !== null ? `${pct.toFixed(1)}%` : '-'}
                    {parsed.rawScore !== null && parsed.outOf !== 100 && (
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
                  <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                    {m.is_released ? (
                      <span
                        style={{
                          color: 'var(--color-success)',
                          fontWeight: 600,
                        }}
                      >
                        Released
                      </span>
                    ) : m.is_locked ? (
                      <span
                        style={{
                          color: 'var(--color-warning)',
                          fontWeight: 600,
                        }}
                      >
                        Locked
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        Draft
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '1rem',
                      textAlign: 'right',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                    }}
                  >
                    {m.class_id && m.subject_id && (
                      <Link
                        href={`/dashboard/teacher/marks?class_id=${m.class_id}&subject_id=${m.subject_id}&assessment_type=${encodeURIComponent(m.assessment_type)}&term=${encodeURIComponent(m.term)}`}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.35rem 0.7rem',
                          fontSize: '0.75rem',
                          textDecoration: 'none',
                        }}
                      >
                        ✏️ Sheet
                      </Link>
                    )}
                    <button
                      onClick={() => handleFlagReview(m.id)}
                      disabled={flaggingId === m.id}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-warning)',
                        borderColor: 'var(--color-warning)',
                      }}
                    >
                      {flaggingId === m.id ? 'Unlocking...' : '🚩 Flag & Unlock'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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
