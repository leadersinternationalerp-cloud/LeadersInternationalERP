'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Bell, CalendarX2, Search, X } from 'lucide-react'

export interface AbsenteeItem {
  id: string
  student_id: string
  student_code: string
  student_name: string
  class_id: string
  class_name: string
  status: string
  reason: string
}

export interface ClassSummaryItem {
  class_id: string
  class_name: string
  section: string
  present: number
  absent: number
  late: number
  excused: number
  total_records: number
  attendance_rate_pct: number
  marked_today: boolean
  unmarked_dates: string[]
}

interface Props {
  selectedDate: string
  period: 'daily' | 'weekly' | 'monthly'
  periodStart: string
  periodEnd: string
  expectedSchoolDaysCount: number
  totalClasses: number
  classesMarkedOnDate: number
  absentees: AbsenteeItem[]
  classSummaries: ClassSummaryItem[]
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (val: string | number) => {
    const s = String(val ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function HOSAttendanceClient({
  selectedDate,
  period,
  periodStart,
  periodEnd,
  expectedSchoolDaysCount,
  totalClasses,
  classesMarkedOnDate,
  absentees,
  classSummaries,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'absentees' | 'summary'>('absentees')
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Absent' | 'Late' | 'Excused'>('all')
  const [missingModalClass, setMissingModalClass] = useState<ClassSummaryItem | null>(null)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderMsg, setReminderMsg] = useState('')

  const filteredAbsentees = useMemo(() => {
    const q = search.trim().toLowerCase()
    return absentees.filter(item => {
      if (classFilter !== 'all' && item.class_id !== classFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (q) {
        const hay = `${item.student_name} ${item.student_code} ${item.class_name} ${item.reason}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [absentees, classFilter, statusFilter, search])

  const counts = useMemo(() => {
    const absent = absentees.filter(a => a.status === 'Absent').length
    const late = absentees.filter(a => a.status === 'Late').length
    const excused = absentees.filter(a => a.status === 'Excused').length
    return { total: absentees.length, absent, late, excused }
  }, [absentees])

  const avgAttendancePct = useMemo(() => {
    const withRecords = classSummaries.filter(c => c.total_records > 0)
    if (withRecords.length === 0) return 0
    return Math.round(withRecords.reduce((s, c) => s + c.attendance_rate_pct, 0) / withRecords.length)
  }, [classSummaries])

  const updateFilters = (newDate: string, newPeriod: string) => {
    const params = new URLSearchParams()
    params.set('date', newDate)
    params.set('period', newPeriod)
    router.push(`/dashboard/hos/attendance?${params.toString()}`)
  }

  const handleSendReminders = async () => {
    setSendingReminder(true)
    setReminderMsg('')
    try {
      const res = await fetch('/api/cron/attendance-reminder', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setReminderMsg(json?.error || 'Failed to send reminders.')
      } else if (json.skipped) {
        setReminderMsg(`Skipped: ${json.reason}.`)
      } else if (json.pendingCount === 0) {
        setReminderMsg('All classes have already marked attendance today.')
      } else {
        setReminderMsg(`Sent ${json.sent} push reminder(s) for ${json.pendingCount} unmarked class(es).`)
      }
    } catch {
      setReminderMsg('Network error while sending attendance reminders.')
    } finally {
      setSendingReminder(false)
    }
  }

  return (
    <div>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--color-primary)' }}>
            Attendance &amp; Absentees Overview
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Monitor daily absentees, mandatory absence reasons, and unmarked school days ({periodStart} to {periodEnd}).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => updateFilters(e.target.value, period)}
            className="input-field"
            style={{ padding: '0.45rem 0.7rem' }}
          />
          <select
            value={period}
            onChange={e => updateFilters(selectedDate, e.target.value)}
            className="input-field"
            style={{ padding: '0.45rem 0.7rem' }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (7 days)</option>
            <option value="monthly">Monthly (30 days)</option>
          </select>
          <button
            type="button"
            onClick={handleSendReminders}
            disabled={sendingReminder}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <Bell size={15} />
            {sendingReminder ? 'Sending...' : 'Remind Unmarked Teachers'}
          </button>
        </div>
      </div>

      {reminderMsg && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', borderLeft: '4px solid var(--color-primary)' }}>
          {reminderMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.15rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Classes Marked ({selectedDate})</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{classesMarkedOnDate} / {totalClasses}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.15rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-error)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Absent ({selectedDate})</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-error)' }}>{counts.absent}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.15rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Late / Excused ({selectedDate})</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{counts.late} / {counts.excused}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.15rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Period Avg ({expectedSchoolDaysCount} school days)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{avgAttendancePct}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('absentees')}
          className={`btn ${activeTab === 'absentees' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          Daily Absentees ({counts.total})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          Class Summary &amp; Missing Days
        </button>
      </div>

      {activeTab === 'absentees' ? (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '200px', flex: '1 1 220px', maxWidth: '300px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search student or reason..."
                  className="input-field"
                  style={{ paddingLeft: '2rem', width: '100%' }}
                />
              </div>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input-field">
                <option value="all">All Classes</option>
                {classSummaries.map(c => (
                  <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="input-field">
                <option value="all">All Statuses</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Excused">Excused</option>
              </select>
            </div>
            <button
              type="button"
              disabled={filteredAbsentees.length === 0}
              onClick={() =>
                downloadCsv(
                  `LIS_Absentees_${selectedDate}.csv`,
                  ['Student ID', 'Student Name', 'Class', 'Status', 'Reason'],
                  filteredAbsentees.map(a => [a.student_code, a.student_name, a.class_name, a.status, a.reason])
                )
              }
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Student ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Class</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Reason / Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbsentees.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{item.student_code || '—'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{item.student_name}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{item.class_name}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: item.status === 'Absent' ? 'rgba(239,68,68,0.12)' : item.status === 'Late' ? 'rgba(245,158,11,0.12)' : 'rgba(59,179,195,0.12)',
                          color: item.status === 'Absent' ? 'var(--color-error)' : item.status === 'Late' ? 'var(--color-warning)' : 'var(--color-secondary)',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>{item.reason || '—'}</td>
                  </tr>
                ))}
                {filteredAbsentees.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No absentees, late arrivals, or excused students recorded for {selectedDate}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
              Class Attendance Breakdown ({periodStart} to {periodEnd})
            </h3>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `LIS_Class_Attendance_${period}_${periodEnd}.csv`,
                  ['Class', 'Section', 'Marked Today', 'Present', 'Late', 'Excused', 'Absent', 'Rate %', 'Missing Days'],
                  classSummaries.map(c => [
                    c.class_name,
                    c.section,
                    c.marked_today ? 'Yes' : 'No',
                    c.present,
                    c.late,
                    c.excused,
                    c.absent,
                    `${c.attendance_rate_pct}%`,
                    c.unmarked_dates.length,
                  ])
                )
              }
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
            >
              <Download size={14} /> Export Summary CSV
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Class</th>
                  <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Today ({selectedDate})</th>
                  <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Present</th>
                  <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Late</th>
                  <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Excused</th>
                  <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Absent</th>
                  <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Missing Days</th>
                  <th style={{ textAlign: 'right', padding: '0.85rem 1rem' }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {classSummaries.map(c => (
                  <tr key={c.class_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                      {c.class_name} {c.section ? <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>({c.section})</span> : null}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {c.marked_today ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.8rem' }}>Marked ✓</span>
                      ) : (
                        <Link
                          href={`/dashboard/teacher/attendance?class_id=${c.class_id}&date=${selectedDate}`}
                          style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'underline' }}
                        >
                          Pending
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--color-success)' }}>{c.present}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--color-warning)' }}>{c.late}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--color-secondary)' }}>{c.excused}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--color-error)' }}>{c.absent}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {c.unmarked_dates.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setMissingModalClass(c)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem', color: 'var(--color-error)' }}
                        >
                          <CalendarX2 size={13} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                          {c.unmarked_dates.length} day(s)
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-success)', fontSize: '0.8rem' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: c.total_records === 0 ? 'var(--color-text-muted)' : c.attendance_rate_pct < 85 ? 'var(--color-error)' : 'var(--color-success)' }}>
                      {c.total_records > 0 ? `${c.attendance_rate_pct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Missing Days Modal */}
      {missingModalClass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50,
          }}
          onClick={() => setMissingModalClass(null)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                Unmarked School Days — {missingModalClass.class_name}
              </h3>
              <button type="button" onClick={() => setMissingModalClass(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
              Weekends and Tanzanian public holidays are automatically excluded. Click any date to backfill attendance:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
              {missingModalClass.unmarked_dates.map(d => (
                <Link
                  key={d}
                  href={`/dashboard/teacher/attendance?class_id=${missingModalClass.class_id}&date=${d}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', textDecoration: 'none' }}
                >
                  {d}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
