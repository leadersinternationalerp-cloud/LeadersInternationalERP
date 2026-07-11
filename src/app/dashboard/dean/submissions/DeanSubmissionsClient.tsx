'use client'

import React, { useState } from 'react'
import { reviewSubmissionAction } from './actions'

export interface LessonPlanRecord {
  id: string
  week_number: number
  term: string
  academic_year: string
  file_url: string
  status: string
  created_at: string
  dean_comment?: string
  teacher_id?: string
  profiles?: { first_name: string; last_name: string }
  classes?: { name: string; section: string }
  subjects?: { name: string }
}

export default function DeanSubmissionsClient({ submissions }: { submissions: LessonPlanRecord[] }) {
  const [filterStatus, setFilterStatus] = useState('Submitted')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filtered = submissions.filter(s => filterStatus === 'All' || s.status === filterStatus)

  const handleReview = async (id: string, status: 'Approved' | 'Returned') => {
    if (status === 'Returned' && !comment.trim()) {
      alert('Please provide a comment when returning a document.')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('id', id)
    formData.append('status', status)
    formData.append('comment', comment)

    const res = await reviewSubmissionAction(formData)
    setIsSubmitting(false)

    if (res.error) {
      alert(`Error: ${res.error}`)
    } else {
      setSelectedId(null)
      setComment('')
      alert(`Document marked as ${status}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            Filter Status
          </label>
          <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Submissions</option>
            <option value="Submitted">Pending Review (Submitted)</option>
            <option value="Approved">Approved</option>
            <option value="Returned">Returned</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Teacher</th>
              <th style={{ padding: '1rem' }}>Class & Subject</th>
              <th style={{ padding: '1rem' }}>Week / Term</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const isSelected = selectedId === s.id
              return (
                <React.Fragment key={s.id}>
                  <tr style={{ borderBottom: isSelected ? 'none' : '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      {s.profiles?.first_name} {s.profiles?.last_name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {s.classes?.name} {s.classes?.section} <br/>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{s.subjects?.name}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      Week {s.week_number} <br/>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{s.term} ({s.academic_year})</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600,
                        backgroundColor: s.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : s.status === 'Returned' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: s.status === 'Approved' ? 'var(--color-success)' : s.status === 'Returned' ? 'var(--color-error)' : 'var(--color-warning)'
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => setSelectedId(isSelected ? null : s.id)} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        {isSelected ? 'Cancel' : 'Review'}
                      </button>
                    </td>
                  </tr>
                  
                  {isSelected && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                      <td colSpan={5} style={{ padding: '1.5rem', borderTop: '1px dashed var(--color-border)' }}>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 1rem 0' }}>Review Submission</h4>
                            <div style={{ marginBottom: '1rem' }}>
                              <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                📄 Open Document
                              </a>
                            </div>
                            
                            {s.dean_comment && (
                              <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>
                                <strong>Previous Comment:</strong> {s.dean_comment}
                              </div>
                            )}

                            <textarea
                              className="input-field"
                              placeholder="Add comments for the teacher (required if returning)"
                              value={comment}
                              onChange={e => setComment(e.target.value)}
                              rows={3}
                              style={{ width: '100%', marginBottom: '1rem' }}
                            />

                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <button 
                                onClick={() => handleReview(s.id, 'Approved')} 
                                disabled={isSubmitting}
                                className="btn btn-primary"
                                style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                              >
                                {isSubmitting ? 'Saving...' : '✓ Approve'}
                              </button>
                              <button 
                                onClick={() => handleReview(s.id, 'Returned')} 
                                disabled={isSubmitting}
                                className="btn btn-primary"
                                style={{ backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                              >
                                {isSubmitting ? 'Saving...' : '✗ Return'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No submissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
