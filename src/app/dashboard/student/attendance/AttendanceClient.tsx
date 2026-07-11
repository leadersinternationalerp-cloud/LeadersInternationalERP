'use client'

import React, { useState } from 'react'

interface AttendanceRecord {
  id: string
  date: string
  status: 'Present' | 'Absent' | 'Late' | 'Excused'
  remarks?: string
}

export default function AttendanceClient({ initialLogs }: { initialLogs: AttendanceRecord[] }) {
  const [viewDate, setViewDate] = useState(() => new Date())
  
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Statistics
  const monthLogs = initialLogs.filter(log => {
    const d = new Date(log.date)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const totalMonth = monthLogs.length
  const present = monthLogs.filter(l => l.status === 'Present').length
  const absent = monthLogs.filter(l => l.status === 'Absent').length
  const late = monthLogs.filter(l => l.status === 'Late').length
  const excused = monthLogs.filter(l => l.status === 'Excused').length
  const rate = totalMonth > 0 ? Math.round(((present + late) / totalMonth) * 100) : 0

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const handleToday = () => setViewDate(new Date())

  const getDaysGrid = () => {
    const firstDayIndex = new Date(year, month, 1).getDay()
    const numDays = new Date(year, month + 1, 0).getDate()
    const prevNumDays = new Date(year, month, 0).getDate()

    const grid = []

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({ day: prevNumDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevNumDays - i) })
    }
    for (let i = 1; i <= numDays; i++) {
      grid.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) })
    }
    const remaining = (grid.length > 35 ? 42 : 35) - grid.length
    for (let i = 1; i <= remaining; i++) {
      grid.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) })
    }

    return grid
  }

  const daysGrid = getDaysGrid()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--color-success)', border: '#6ee7b7' }
      case 'Absent': return { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--color-error)', border: '#fca5a5' }
      case 'Late': return { bg: 'rgba(249, 115, 22, 0.1)', text: 'var(--color-warning)', border: '#fdba74' }
      case 'Excused': return { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--color-primary)', border: '#93c5fd' }
      default: return { bg: 'rgba(0,0,0,0.05)', text: 'var(--color-text-muted)', border: 'var(--color-border)' }
    }
  }

  const isToday = (d: Date) => {
    const t = new Date()
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Summary Stats */}
      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Present</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{present}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Absent</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-error)' }}>{absent}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Late</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{late}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Excused</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{excused}</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Month Rate</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: rate >= 90 ? 'var(--color-success)' : 'var(--color-warning)' }}>{rate}%</div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn" style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--color-border)' }} onClick={handleToday}>
            Today
          </button>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <button className="btn" style={{ padding: '0.4rem 0.6rem', background: 'transparent', border: '1px solid var(--color-border)' }} onClick={handlePrevMonth}>◀</button>
            <button className="btn" style={{ padding: '0.4rem 0.6rem', background: 'transparent', border: '1px solid var(--color-border)' }} onClick={handleNextMonth}>▶</button>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginLeft: '0.5rem', color: 'var(--color-primary)' }}>
            {monthNames[month]} {year}
          </h3>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'rgba(0,0,0,0.02)', textAlign: 'center', borderBottom: '1px solid var(--color-border)', padding: '0.75rem 0' }}>
          {weekdays.map(wd => (
            <div key={wd} style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{wd}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--color-border)', gap: '1px' }}>
          {daysGrid.map((cell, idx) => {
            const cellDateStr = cell.date.toISOString().split('T')[0]
            const att = initialLogs.find(l => l.date === cellDateStr)
            const cellIsToday = isToday(cell.date)

            return (
              <div 
                key={idx} 
                style={{ 
                  minHeight: '110px', 
                  backgroundColor: cell.isCurrentMonth ? 'var(--color-surface)' : 'rgba(0,0,0,0.03)',
                  padding: '0.4rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem',
                  opacity: cell.isCurrentMonth ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {cellIsToday ? (
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', backgroundColor: 'var(--color-secondary)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cell.day}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: cell.isCurrentMonth ? 600 : 400, color: 'var(--color-text-muted)' }}>
                      {cell.day}
                    </span>
                  )}
                </div>

                {att && (
                  <div style={{
                    marginTop: 'auto',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: getStatusColor(att.status).bg,
                    color: getStatusColor(att.status).text,
                    border: `1px solid ${getStatusColor(att.status).border}`,
                    textAlign: 'center'
                  }}>
                    {att.status}
                    {att.remarks && (
                      <div style={{ fontSize: '0.65rem', fontWeight: 400, marginTop: '2px', opacity: 0.8 }}>
                        {att.remarks}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
