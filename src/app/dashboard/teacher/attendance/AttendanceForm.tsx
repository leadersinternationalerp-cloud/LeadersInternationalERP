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
  reason?: string | null
}

export default function AttendanceForm({
  students,
  existingLogs,
  isLocked,
  canEditDate = true,
  isFutureDate = false,
  holidayName = null,
  isWeekend = false,
  classId,
  date,
  saveAction,
}: {
  students: Student[]
  existingLogs: Log[]
  isLocked: boolean
  canEditDate?: boolean
  isFutureDate?: boolean
  holidayName?: string | null
  isWeekend?: boolean
  classId: string
  date: string
  saveAction: (formData: FormData) => Promise<{ error?: string } | void>
}) {
  const initialStatuses: Record<string, string> = {}
  const initialReasons: Record<string, string> = {}
  students.forEach(s => {
    const existing = existingLogs.find(l => l.student_id === s.id)
    initialStatuses[s.id] = existing ? existing.status : 'Present'
    initialReasons[s.id] = existing?.reason || ''
  })

  const [statuses, setStatuses] = useState<Record<string, string>>(initialStatuses)
  const [reasons, setReasons] = useState<Record<string, string>>(initialReasons)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const readOnly = isLocked || !canEditDate || isFutureDate

  const handleMarkAllPresent = () => {
    const updated = { ...statuses }
    students.forEach(s => {
      updated[s.id] = 'Present'
    })
    setStatuses(updated)
    setFormError('')
  }

  const handleStatusChange = (studentId: string, value: string) => {
    setStatuses(prev => ({
      ...prev,
      [studentId]: value,
    }))
    setFormError('')
  }

  const handleReasonChange = (studentId: string, value: string) => {
    setReasons(prev => ({
      ...prev,
      [studentId]: value,
    }))
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, lock: boolean) => {
    e.preventDefault()
    if (readOnly) return

    const missingReasonStudents = students.filter(
      s => statuses[s.id] === 'Absent' && !(reasons[s.id] || '').trim()
    )
    if (missingReasonStudents.length > 0) {
      const names = missingReasonStudents
        .slice(0, 3)
        .map(s => `${s.profiles.first_name} ${s.profiles.last_name}`.trim())
        .join(', ')
      setFormError(
        `Absence reason is required for all Absent students (${names}${missingReasonStudents.length > 3 ? ` +${missingReasonStudents.length - 3} more` : ''}).`
      )
      return
    }

    setSaving(true)
    setFormError('')
    setFormSuccess('')

    const formData = new FormData()
    formData.append('classId', classId)
    formData.append('date', date)
    formData.append('lock', lock ? 'true' : 'false')

    Object.entries(statuses).forEach(([studentId, status]) => {
      formData.append(`status_${studentId}`, status)
      formData.append(`reason_${studentId}`, (reasons[studentId] || '').trim())
    })

    try {
      const result = await saveAction(formData)
      if (result && 'error' in result && result.error) {
        setFormError(result.error)
      } else {
        setFormSuccess(
          lock
            ? 'Attendance submitted & locked successfully!'
            : 'Draft attendance saved successfully.'
        )
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const counts = students.reduce(
    (acc, s) => {
      const st = statuses[s.id] || 'Present'
      if (st === 'Present') acc.present++
      else if (st === 'Absent') acc.absent++
      else if (st === 'Late') acc.late++
      else if (st === 'Excused') acc.excused++
      return acc
    },
    { present: 0, absent: 0, late: 0, excused: 0 }
  )

  return (
    <form onSubmit={e => e.preventDefault()} className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Attendance Roster</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            Class Date: <strong>{date}</strong> • Present: <strong style={{ color: 'var(--color-success)' }}>{counts.present}</strong> • Absent: <strong style={{ color: 'var(--color-error)' }}>{counts.absent}</strong> • Late: <strong style={{ color: 'var(--color-warning)' }}>{counts.late}</strong> • Excused: <strong style={{ color: 'var(--color-secondary)' }}>{counts.excused}</strong>
          </p>
        </div>

        {!readOnly && (
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

      {(holidayName || isWeekend) && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '4px',
            color: '#1d4ed8',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 600,
          }}
        >
          📅 {holidayName ? `Public Holiday: ${holidayName} — regular school attendance is not required.` : 'Weekend — regular school attendance is not required.'}
        </div>
      )}

      {isFutureDate && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid var(--color-error)',
            borderRadius: '4px',
            color: 'var(--color-error)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 600,
          }}
        >
          ⛔ Attendance cannot be marked for future dates.
        </div>
      )}

      {!isFutureDate && !canEditDate && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '4px solid var(--color-warning)',
            borderRadius: '4px',
            color: 'var(--color-warning)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 600,
          }}
        >
          🔒 Teachers can only mark or edit today&apos;s attendance. Contact a Dean, Principal, or HOS to backfill past dates.
        </div>
      )}

      {isLocked && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '4px solid var(--color-warning)',
            borderRadius: '4px',
            color: 'var(--color-warning)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            fontWeight: 600,
          }}
        >
          ⚠️ This attendance log has been submitted &amp; locked. It cannot be modified.
        </div>
      )}

      {formError && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          {formError}
        </div>
      )}

      {formSuccess && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          {formSuccess}
        </div>
      )}

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Student ID</th>
              <th style={{ padding: '0.85rem 1rem' }}>Student Name</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Status Selection</th>
              <th style={{ padding: '0.85rem 1rem', minWidth: '210px' }}>Reason / Note</th>
            </tr>
          </thead>
          <tbody>
            {students.map(stud => {
              const currentStatus = statuses[stud.id]
              const currentReason = reasons[stud.id] || ''
              const needsReason = currentStatus === 'Absent'
              const showReasonInput = currentStatus === 'Absent' || currentStatus === 'Excused' || currentStatus === 'Late'
              const missingRequired = needsReason && !currentReason.trim()

              return (
                <tr key={stud.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{stud.student_id}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                    {stud.profiles.first_name} {stud.profiles.last_name}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {['Present', 'Absent', 'Late', 'Excused'].map(opt => {
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
                            disabled={readOnly || saving}
                            onClick={() => handleStatusChange(stud.id, opt)}
                            className="btn"
                            style={{
                              padding: '0.25rem 0.7rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              backgroundColor: btnBg,
                              color: btnColor,
                              border: btnBorder,
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {showReasonInput ? (
                      <input
                        type="text"
                        disabled={readOnly || saving}
                        value={currentReason}
                        onChange={e => handleReasonChange(stud.id, e.target.value)}
                        placeholder={needsReason ? 'Required: reason for absence...' : 'Optional note...'}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.82rem',
                          borderRadius: 'var(--radius-sm)',
                          border: missingRequired ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                          background: 'var(--color-bg)',
                          color: 'var(--color-text)',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
