'use client'

import { useState } from 'react'

type DisciplineRecord = {
  id: string
  incident_date: string
  category: 'Misconduct' | 'Absenteeism' | 'Academic Dishonesty' | 'Bullying' | 'Other'
  description: string
  action_taken: string
  follow_up_required: boolean
  follow_up_date: string | null
  created_at: string
}

type ChildWithDiscipline = {
  id: string
  student_id: string
  grade_level: string
  section?: string | null
  profiles?: {
    first_name: string
    last_name: string
    email: string
  } | null
  records: DisciplineRecord[]
}

export default function ParentDisciplineClient({
  childrenData
}: {
  childrenData: ChildWithDiscipline[]
}) {
  const [activeChildIndex, setActiveChildIndex] = useState(0)

  if (!childrenData || childrenData.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <h3>No Children Linked</h3>
        <p>No student accounts are currently linked to your parent profile. Please contact the school administration.</p>
      </div>
    )
  }

  const activeChild = childrenData[activeChildIndex]
  const records = activeChild.records || []

  // Helper styling for category badges
  function getCategoryBadgeStyle(cat: string) {
    let bg = 'rgba(100, 116, 139, 0.1)'
    let fg = 'var(--color-text-muted)'
    if (cat === 'Misconduct') {
      bg = 'rgba(247, 178, 57, 0.15)'
      fg = 'var(--color-accent)'
    } else if (cat === 'Absenteeism') {
      bg = 'rgba(59, 179, 195, 0.15)'
      fg = 'var(--color-secondary)'
    } else if (cat === 'Academic Dishonesty') {
      bg = 'rgba(239, 68, 68, 0.15)'
      fg = 'var(--color-error)'
    } else if (cat === 'Bullying') {
      bg = 'rgba(220, 38, 38, 0.2)'
      fg = '#b91c1c'
    } else if (cat === 'Other') {
      bg = 'rgba(16, 185, 129, 0.15)'
      fg = 'var(--color-success)'
    }
    return {
      backgroundColor: bg,
      color: fg,
      padding: '0.25rem 0.6rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-block'
    }
  }

  return (
    <div>
      {/* Child Selector Tabs (only show if multiple children are linked) */}
      {childrenData.length > 1 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {childrenData.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setActiveChildIndex(idx)}
              className="btn"
              style={{
                background: activeChildIndex === idx ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeChildIndex === idx ? '#fff' : 'var(--color-text)',
                border: '1px solid var(--color-border)'
              }}
            >
              🧒 {child.profiles?.first_name} {child.profiles?.last_name}
            </button>
          ))}
        </div>
      )}

      {/* Overview Banner based on Discipline Record */}
      {records.length === 0 ? (
        <div style={{
          padding: '1.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderLeft: '6px solid var(--color-success)',
          color: 'var(--color-success)',
          fontWeight: 600,
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span>✓ {activeChild.profiles?.first_name} has a clean discipline record. No incident reports have been logged. Keep up the good work!</span>
          </div>
          <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--color-success)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
            Excellent Standing
          </span>
        </div>
      ) : (
        <div style={{
          padding: '1.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderLeft: '6px solid var(--color-error)',
          color: 'var(--color-error)',
          fontWeight: 600,
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span>⚠️ Attention: {records.length} discipline incident{records.length > 1 ? 's' : ''} logged for {activeChild.profiles?.first_name}. Please review details below.</span>
          </div>
          <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--color-error)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
            Action / Review Required
          </span>
        </div>
      )}

      {/* Discipline Incident Cards list */}
      {records.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {records.map((record) => (
            <div
              key={record.id}
              className="glass-panel"
              style={{
                padding: '1.5rem 2rem',
                borderRadius: 'var(--radius-lg)',
                borderLeft: `5px solid ${
                  record.category === 'Academic Dishonesty' || record.category === 'Bullying' 
                    ? 'var(--color-error)' 
                    : record.category === 'Misconduct' 
                      ? 'var(--color-accent)' 
                      : 'var(--color-secondary)'
                }`,
                transition: 'transform var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    📅 Incident Date:
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {new Date(record.incident_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </span>
                </div>
                
                <span style={getCategoryBadgeStyle(record.category)}>
                  {record.category}
                </span>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Incident details reported by school
                </div>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  {record.description}
                </p>
              </div>

              {/* Action and Follow-up Footer */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
              }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Action Taken:</span>{' '}
                  <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{record.action_taken}</span>
                </div>
                
                {record.follow_up_required ? (
                  <div>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>⚠️ Follow-up Parameter:</span>{' '}
                    <span style={{ fontWeight: 500 }}>
                      Requires verification/follow-up on{' '}
                      <strong>
                        {record.follow_up_date ? new Date(record.follow_up_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'TBD'}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Follow-up:</span>{' '}
                    <span style={{ color: 'var(--color-text-muted)' }}>No follow-up action required.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
