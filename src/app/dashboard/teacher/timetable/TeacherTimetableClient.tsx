'use client'

import { Calendar, FileDown } from 'lucide-react'

interface Slot {
  id: string
  period_number: number
  name: string
  start_time: string
  end_time: string
  is_break: boolean
}

interface TimetableEntry {
  id: string
  class_id: string
  class_subject_id: string
  day_of_week: string
  slot_id: string
  room?: string
  class_subjects?: {
    id: string
    teacher_id: string
    profiles?: {
      first_name: string
      last_name: string
    }
    subjects?: {
      name: string
    }
  }
  classes?: {
    name: string
    section?: string
  }
}

interface TeacherTimetableClientProps {
  slots: Slot[]
  entries: TimetableEntry[]
  teacherId: string
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TeacherTimetableClient({
  slots,
  entries,
  teacherId
}: TeacherTimetableClientProps) {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(30, 58, 138, 0.01)', border: '1px solid rgba(30, 58, 138, 0.15)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00264b', fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.25rem' }}>
            <Calendar size={20} />
            My Personal Timetable
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Review your weekly teaching sessions, classes and assigned room locations.
          </div>
        </div>
        <div>
          <a 
            href={`/api/timetable/pdf?teacher_id=${teacherId}`}
            target="_blank"
            className="btn btn-secondary" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.55rem 1.1rem', 
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: '#00264b',
              color: '#ffffff',
              border: 'none',
              textDecoration: 'none'
            }}
          >
            <FileDown size={16} />
            Export My PDF Timetable
          </a>
        </div>
      </div>

      {/* Grid Scheduler Board */}
      <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)' }}>
        {slots.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No period slots have been configured by the school administration yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
            <thead>
              <tr style={{ backgroundColor: '#00264b', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ color: '#ffffff', width: '100px', padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>DAY</th>
                {slots.map(slot => {
                  const timeRangeStr = `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`
                  return (
                    <th key={slot.id} style={{ color: '#ffffff', padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8' }}>
                      <div style={{ fontSize: '0.8rem' }}>{slot.name.toUpperCase()}</div>
                      <div style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 400 }}>{timeRangeStr}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map(day => (
                <tr key={day} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  
                  {/* Day cell (row header) */}
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 700, color: '#00264b', backgroundColor: 'rgba(0,0,0,0.01)', borderRight: '1px solid var(--color-border)' }}>
                    {day.toUpperCase()}
                  </td>

                  {/* Period Slot Columns */}
                  {slots.map(slot => {
                    const cellEntries = entries.filter(e => 
                      e.day_of_week.toLowerCase() === day.toLowerCase() && e.slot_id === slot.id
                    )

                    if (slot.is_break) {
                      return (
                        <td
                          key={slot.id}
                          style={{
                            padding: '0.75rem',
                            textAlign: 'center',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            borderRight: '1px solid var(--color-border)',
                            verticalAlign: 'middle',
                            cursor: 'default',
                            userSelect: 'none'
                          }}
                        >
                          {slot.name.toUpperCase()}
                        </td>
                      )
                    }

                    return (
                      <td 
                        key={slot.id}
                        style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          borderRight: '1px solid var(--color-border)',
                          backgroundColor: cellEntries.length > 0 ? 'rgba(30, 58, 138, 0.02)' : 'transparent',
                          verticalAlign: 'middle',
                          height: '65px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {cellEntries.map(entry => (
                            <div 
                              key={entry.id}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '0.1rem', 
                                backgroundColor: 'var(--color-bg)', 
                                padding: '0.4rem', 
                                borderRadius: 'var(--radius-sm)', 
                                border: '1px solid var(--color-border)',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                            >
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                {(() => {
                                  const cls = Array.isArray(entry.classes) ? entry.classes[0] : entry.classes
                                  return cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Class'
                                })()}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                {(() => {
                                  const cs = Array.isArray(entry.class_subjects) ? entry.class_subjects[0] : entry.class_subjects
                                  const sub = cs ? (Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects) : null
                                  return sub?.name || ''
                                })()}
                              </div>
                              {entry.room && (
                                <div style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.03)', alignSelf: 'center', color: 'var(--color-text-muted)' }}>
                                  Room: {entry.room}
                                </div>
                              )}
                            </div>
                          ))}

                          {cellEntries.length === 0 && (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>-</div>
                          )}
                        </div>
                      </td>
                    )
                  })}

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
