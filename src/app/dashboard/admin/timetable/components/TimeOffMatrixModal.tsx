'use client'

import { useState } from 'react'
import { X, Check, HelpCircle, Ban } from 'lucide-react'
import type { TimeOffMap, TimeOffState, EngineSlot } from '@/lib/timetableEngine'
import { timeOffKey } from '@/lib/timetableEngine'

interface TimeOffMatrixModalProps {
  title: string
  days: string[]
  slots: EngineSlot[]
  initialTimeOff: TimeOffMap
  onSave: (next: TimeOffMap) => Promise<void> | void
  onClose: () => void
}

const NEXT_STATE: Record<TimeOffState, TimeOffState> = {
  ok: 'questionable',
  questionable: 'forbidden',
  forbidden: 'ok',
}

export default function TimeOffMatrixModal({
  title,
  days,
  slots,
  initialTimeOff,
  onSave,
  onClose,
}: TimeOffMatrixModalProps) {
  const [map, setMap] = useState<TimeOffMap>({ ...initialTimeOff })
  const [brush, setBrush] = useState<TimeOffState | 'cycle'>('cycle')
  const [saving, setSaving] = useState(false)

  const academicSlots = slots.filter((s) => !s.is_break).sort((a, b) => a.period_number - b.period_number)

  const toggleCell = (day: string, periodNum: number) => {
    const key = timeOffKey(day, periodNum)
    const cur = map[key] || 'ok'
    const next = brush === 'cycle' ? NEXT_STATE[cur] : brush
    const updated = { ...map }
    if (next === 'ok') {
      delete updated[key]
    } else {
      updated[key] = next
    }
    setMap(updated)
  }

  const setRow = (day: string, state: TimeOffState) => {
    const updated = { ...map }
    for (const s of academicSlots) {
      const key = timeOffKey(day, s.period_number)
      if (state === 'ok') delete updated[key]
      else updated[key] = state
    }
    setMap(updated)
  }

  const setCol = (periodNum: number, state: TimeOffState) => {
    const updated = { ...map }
    for (const d of days) {
      const key = timeOffKey(d, periodNum)
      if (state === 'ok') delete updated[key]
      else updated[key] = state
    }
    setMap(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(map)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '860px', backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#00264b' }}>Time-Off Matrix: {title}</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Click any cell (or row/column header) to mark Available, Questionable (avoid if possible), or Forbidden.
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Brush Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Click Mode:</span>
          {(
            [
              { id: 'cycle', label: 'Cycle (✓ → ? → ✗)' },
              { id: 'ok', label: 'Available (✓)' },
              { id: 'questionable', label: 'Questionable (?)' },
              { id: 'forbidden', label: 'Forbidden (✗)' },
            ] as const
          ).map((b) => (
            <button
              key={b.id}
              onClick={() => setBrush(b.id)}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: brush === b.id ? '2px solid #00264b' : '1px solid #cbd5e1',
                backgroundColor: brush === b.id ? '#eff6ff' : '#f8fafc',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              {b.label}
            </button>
          ))}
          <button
            onClick={() => setMap({})}
            style={{ marginLeft: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            Reset All to Available
          </button>
        </div>

        {/* Grid */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#00264b', color: '#fff' }}>
                <th style={{ padding: '0.55rem', textAlign: 'left', minWidth: '100px' }}>Day / Period</th>
                {academicSlots.map((s) => (
                  <th key={s.id} style={{ padding: '0.45rem', textAlign: 'center', minWidth: '64px' }}>
                    <div style={{ fontWeight: 700 }}>P{s.period_number}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>{s.start_time.slice(0, 5)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '3px' }}>
                      <button title="Mark column available" onClick={() => setCol(s.period_number, 'ok')} style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', border: 'none', background: '#dcfce7', color: '#166534', cursor: 'pointer' }}>✓</button>
                      <button title="Mark column forbidden" onClick={() => setCol(s.period_number, 'forbidden')} style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' }}>✗</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    <div>{day}</div>
                    <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                      <button onClick={() => setRow(day, 'ok')} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534', cursor: 'pointer' }}>All ✓</button>
                      <button onClick={() => setRow(day, 'forbidden')} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' }}>All ✗</button>
                    </div>
                  </td>
                  {academicSlots.map((s) => {
                    const state = map[timeOffKey(day, s.period_number)] || 'ok'
                    const bg = state === 'ok' ? '#dcfce7' : state === 'questionable' ? '#dbeafe' : '#fee2e2'
                    const fg = state === 'ok' ? '#15803d' : state === 'questionable' ? '#1d4ed8' : '#b91c1c'
                    return (
                      <td
                        key={s.id}
                        onClick={() => toggleCell(day, s.period_number)}
                        style={{
                          padding: '0.55rem',
                          textAlign: 'center',
                          backgroundColor: bg,
                          color: fg,
                          cursor: 'pointer',
                          borderLeft: '1px solid #e2e8f0',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          {state === 'ok' && <Check size={16} />}
                          {state === 'questionable' && <HelpCircle size={16} />}
                          {state === 'forbidden' && <Ban size={16} />}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none', background: '#00264b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {saving ? 'Saving...' : 'Save Time-Off'}
          </button>
        </div>
      </div>
    </div>
  )
}
