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

interface Log {
  student_id: string
  status: string
}

export default function AttendanceForm({
  students,
  existingLogs,
  isLocked,
  classId,
  date,
  saveAction
}: {
  students: Student[]
  existingLogs: Log[]
  isLocked: boolean
  classId: string
  date: string
  saveAction: (formData: FormData) => Promise<void>
}) {
  // Initialize statuses from existing log data or default to 'Present'
  const initialStatuses: Record<string, string> = {}
  students.forEach(s => {
    const existing = existingLogs.find(l => l.student_id === s.id)
    initialStatuses[s.id] = existing ? existing.status : 'Present'
  })

  const [statuses, setStatuses] = useState<Record<string, string>>(initialStatuses)
  const [saving, setSaving] = useState(false)

  const handleMarkAllPresent = () => {
    const updated = { ...statuses }
    students.forEach(s => {
      updated[s.id] = 'Present'
    })
    setStatuses(updated)
  }

  const handleStatusChange = (studentId: string, value: string) => {
    setStatuses(prev => ({
      ...prev,
      [studentId]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, lock: boolean) => {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData()
    formData.append('classId', classId)
    formData.append('date', date)
    formData.append('lock', lock ? 'true' : 'false')

    Object.entries(statuses).forEach(([studentId, status]) => {
      formData.append(`status_${studentId}`, status)
    })

    try {
      await saveAction(formData)
      alert(lock ? 'Attendance submitted & locked successfully!' : 'Draft attendance saved successfully.')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Attendance Roster</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            Class Date: <strong>{date}</strong>
          </p>
        </div>

        {!isLocked && (
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="btn"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}
          >
            Mark All Present ✓
          </button>
        )}
      </div>

      {isLocked && (
        <div style={{
          padding: '0.75rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderLeft: '4px solid var(--color-warning)', borderRadius: '4px',
          color: 'var(--color-warning)', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600
        }}>
          ⚠️ This attendance log has been submitted & locked. It cannot be modified.
        </div>
      )}

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Student ID</th>
              <th style={{ padding: '1rem' }}>Student Name</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Status Selection</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stud) => {
              const currentStatus = statuses[stud.id]
              return (
                <tr key={stud.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{stud.student_id}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {stud.profiles.first_name} {stud.profiles.last_name}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {['Present', 'Absent', 'Late', 'Excused'].map((opt) => {
                        const isChecked = currentStatus === opt
                        let btnBg = 'transparent'
                        let btnColor = 'var(--color-text-muted)'
                        let btnBorder = '1px solid var(--color-border)'

                        if (isChecked) {
                          if (opt === 'Present') {
                            btnBg = 'rgba(16, 185, 129, 0.15)'
                            btnColor = 'var(--color-success)'
                            btnBorder = '1px solid var(--color-success)'
                          } else if (opt === 'Absent') {
                            btnBg = 'rgba(239, 68, 68, 0.15)'
                            btnColor = 'var(--color-error)'
                            btnBorder = '1px solid var(--color-error)'
                          } else if (opt === 'Late') {
                            btnBg = 'rgba(245, 158, 11, 0.15)'
                            btnColor = 'var(--color-warning)'
                            btnBorder = '1px solid var(--color-warning)'
                          } else if (opt === 'Excused') {
                            btnBg = 'rgba(59, 179, 195, 0.15)'
                            btnColor = 'var(--color-secondary)'
                            btnBorder = '1px solid var(--color-secondary)'
                          }
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={isLocked || saving}
                            onClick={() => handleStatusChange(stud.id, opt)}
                            className="btn"
                            style={{
                              padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
                              backgroundColor: btnBg, color: btnColor, border: btnBorder
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
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
            Save Draft Roster
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e: any) => handleSubmit(e, true)}
            className="btn btn-primary"
            style={{ padding: '0.6rem 2.5rem' }}
          >
            {saving ? 'Submitting...' : 'Submit & Lock Attendance'}
          </button>
        </div>
      )}
    </form>
  )
}
