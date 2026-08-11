'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/utils/date'
import { resubmitLessonPlanAction } from './actions'
import { BookOpen, CheckCircle2, Clock, AlertTriangle, FileText, Upload, RefreshCw, X, Filter, ExternalLink, Plus } from 'lucide-react'

export interface LessonPlanItem {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  week_number: number
  term: string
  academic_year: string
  file_url: string
  status: string
  teacher_comments?: string
  review_notes?: string
  dean_comment?: string
  reviewer_id?: string
  reviewed_at?: string
  submitted_at: string
  updated_at?: string
  classes?: { name: string; section?: string }
  subjects?: { name: string }
  reviewer?: { first_name: string; last_name: string; role?: string }
}

interface TeacherLessonPlansClientProps {
  plans: LessonPlanItem[]
}

export default function TeacherLessonPlansClient({ plans }: TeacherLessonPlansClientProps) {
  const [termFilter, setTermFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [selectedPlanForResubmit, setSelectedPlanForResubmit] = useState<LessonPlanItem | null>(null)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [resubmitError, setResubmitError] = useState<string | null>(null)
  const [resubmitSuccess, setResubmitSuccess] = useState<string | null>(null)

  // Calculations for stats
  const totalCount = plans.length
  const approvedCount = plans.filter(p => p.status === 'Approved').length
  const pendingCount = plans.filter(p => p.status === 'Submitted').length
  const returnedCount = plans.filter(p => p.status === 'Returned').length

  // Filtered plans
  const filteredPlans = plans.filter(plan => {
    const matchesTerm = termFilter === 'All' || plan.term === termFilter
    const matchesStatus = statusFilter === 'All' || plan.status === statusFilter
    return matchesTerm && matchesStatus
  })

  async function handleResubmitSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedPlanForResubmit) return

    setIsResubmitting(true)
    setResubmitError(null)
    setResubmitSuccess(null)

    const formData = new FormData(e.currentTarget)
    formData.append('planId', selectedPlanForResubmit.id)

    const result = await resubmitLessonPlanAction(formData)

    setIsResubmitting(false)

    if (result.error) {
      setResubmitError(result.error)
    } else {
      setResubmitSuccess('Lesson plan revised and resubmitted successfully!')
      setTimeout(() => {
        setSelectedPlanForResubmit(null)
        setResubmitSuccess(null)
      }, 1500)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header with Title & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
            My Lesson Plans
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Submit, track, and manage your weekly instructional lesson plans for section supervisor review.
          </p>
        </div>
        <Link href="/dashboard/teacher/lesson-plans/new" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
          <Plus size={18} />
          <span>Submit New Lesson Plan</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Plans</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalCount}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Pending Review</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{pendingCount}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Approved</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{approvedCount}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Needs Revision</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{returnedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Filter size={16} />
          <span>Filter Plans:</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ minWidth: '160px' }}>
            <select
              className="input-field"
              value={termFilter}
              onChange={e => setTermFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="input-field"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Pending Review (Submitted)</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Needs Revision (Returned)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lesson Plans List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredPlans.map(plan => {
          const isApproved = plan.status === 'Approved'
          const isReturned = plan.status === 'Returned'
          const feedback = plan.review_notes || plan.dean_comment

          return (
            <div
              key={plan.id}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                borderLeft: isApproved
                  ? '4px solid #10b981'
                  : isReturned
                  ? '4px solid #ef4444'
                  : '4px solid #f59e0b',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--color-secondary)' }}>
                    {plan.classes?.name || 'Class'} {plan.classes?.section ? `(${plan.classes.section})` : ''} — {plan.subjects?.name || 'General / Homeroom'}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                    <span>Term: <strong>{plan.term}</strong></span>
                    <span>Week: <strong>Week {plan.week_number}</strong></span>
                    <span>Academic Year: <strong>{plan.academic_year}</strong></span>
                    <span>Submitted: <strong>{formatDate(plan.submitted_at)}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: isApproved
                        ? 'rgba(16, 185, 129, 0.12)'
                        : isReturned
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)',
                      color: isApproved
                        ? '#10b981'
                        : isReturned
                        ? '#ef4444'
                        : '#b45309',
                      border: isApproved
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : isReturned
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    {isApproved && <CheckCircle2 size={14} />}
                    {isReturned && <AlertTriangle size={14} />}
                    {!isApproved && !isReturned && <Clock size={14} />}
                    {plan.status === 'Submitted' ? 'Pending Review' : plan.status}
                  </span>
                </div>
              </div>

              {/* Body Content */}
              <div style={{ display: 'grid', gridTemplateColumns: feedback ? '1.2fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div>
                  {plan.teacher_comments && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>My Submission Notes:</span>
                      <p style={{ margin: '0.25rem 0 0 0', fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        "{plan.teacher_comments}"
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {plan.file_url ? (
                      <a
                        href={plan.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                      >
                        <FileText size={16} />
                        <span>View Attached Document</span>
                        <ExternalLink size={14} style={{ opacity: 0.7 }} />
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No document attached</span>
                    )}

                    {isReturned && (
                      <button
                        onClick={() => {
                          setSelectedPlanForResubmit(plan)
                          setResubmitError(null)
                          setResubmitSuccess(null)
                        }}
                        className="btn btn-primary"
                        style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                      >
                        <RefreshCw size={15} />
                        <span>Resubmit / Revise Plan</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Supervisor Remarks Box */}
                {feedback && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isReturned ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                      border: isReturned ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: isReturned ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                      {isReturned ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                      <span>Supervisor Review Remarks</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: 1.5, color: 'var(--color-text)' }}>
                      "{feedback}"
                    </p>
                    {plan.reviewer && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                        — {plan.reviewer.first_name} {plan.reviewer.last_name} {plan.reviewed_at ? `(${formatDate(plan.reviewed_at)})` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )
        })}

        {filteredPlans.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <BookOpen size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>No Lesson Plans Found</h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              {plans.length === 0
                ? "You haven't submitted any lesson plans yet. Click the button below to upload your first weekly lesson plan."
                : "No lesson plans matched your selected filter criteria."}
            </p>
            {plans.length === 0 && (
              <Link href="/dashboard/teacher/lesson-plans/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Submit Your First Lesson Plan
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Resubmit Modal */}
      {selectedPlanForResubmit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              backgroundColor: 'var(--color-surface, #ffffff)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>
                Resubmit Lesson Plan Revision
              </h2>
              <button
                onClick={() => setSelectedPlanForResubmit(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid #ef4444', padding: '0.85rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <strong style={{ color: '#ef4444' }}>Supervisor Remarks:</strong>
              <p style={{ margin: '0.25rem 0 0 0' }}>
                "{selectedPlanForResubmit.review_notes || selectedPlanForResubmit.dean_comment || 'Plan returned for revision.'}"
              </p>
            </div>

            <form onSubmit={handleResubmitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {resubmitError && (
                <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {resubmitError}
                </div>
              )}

              {resubmitSuccess && (
                <div style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {resubmitSuccess}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Class & Subject</label>
                <input
                  type="text"
                  className="input-field"
                  value={`${selectedPlanForResubmit.classes?.name || 'Class'} — ${selectedPlanForResubmit.subjects?.name || 'General / Homeroom'} (Week ${selectedPlanForResubmit.week_number}, ${selectedPlanForResubmit.term})`}
                  disabled
                  style={{ opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.03)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Updated Document File (PDF / DOCX)
                </label>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx"
                  className="input-field"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Leave empty to keep current file ({selectedPlanForResubmit.file_url ? 'file attached' : 'none'}).
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Teacher Revision Notes / Response
                </label>
                <textarea
                  name="teacher_comments"
                  rows={3}
                  className="input-field"
                  placeholder="Explain corrections or additions made in this revision..."
                  defaultValue={selectedPlanForResubmit.teacher_comments || ''}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPlanForResubmit(null)}
                  className="btn btn-secondary"
                  disabled={isResubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isResubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isResubmitting ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Resubmitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Resubmit Revision</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
