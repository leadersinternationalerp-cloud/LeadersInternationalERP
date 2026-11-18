'use client'

import { useState } from 'react'
import { Shield, Plus, Trash2 } from 'lucide-react'

interface Teacher {
  id: string
  first_name: string
  last_name: string
}

interface Slot {
  id: string
  period_number: number
  name: string
  start_time: string
  end_time: string
  is_break: boolean
}

interface SupervisionRecord {
  id: string
  day_of_week: string
  slot_id: string
  teacher_id: string
  area_name: string
  profiles?: { first_name?: string; last_name?: string }
  timetable_slots?: { name?: string; start_time?: string; end_time?: string }
}

interface SupervisionsPanelProps {
  days: string[]
  slots: Slot[]
  teachers: Teacher[]
  supervisions: SupervisionRecord[]
  onRefreshConfig: () => Promise<void>
}

export default function SupervisionsPanel({
  days,
  slots,
  teachers,
  supervisions,
  onRefreshConfig,
}: SupervisionsPanelProps) {
  const breakSlots = slots.filter((s) => s.is_break)
  const [day, setDay] = useState(days[0] || 'Monday')
  const [slotId, setSlotId] = useState(breakSlots[0]?.id || slots[0]?.id || '')
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '')
  const [areaName, setAreaName] = useState('Main Courtyard')
  const [saving, setSaving] = useState(false)

  const addSupervision = async () => {
    if (!day || !slotId || !teacherId || !areaName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'supervision',
          action: 'upsert',
          payload: { day_of_week: day, slot_id: slotId, teacher_id: teacherId, area_name: areaName },
        }),
      })
      await onRefreshConfig()
    } finally {
      setSaving(false)
    }
  }

  const deleteSupervision = async (id: string) => {
    await fetch('/api/timetable/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'supervision', action: 'delete', id }),
    })
    await onRefreshConfig()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#00264b', marginBottom: '0.75rem' }}>
          <Shield size={18} /> Assign Break &amp; Lunch Supervision Duty
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
          <select value={day} onChange={(e) => setDay(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={slotId} onChange={(e) => setSlotId(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
            {(breakSlots.length > 0 ? breakSlots : slots).map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})</option>
            ))}
          </select>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </select>
          <input placeholder="Area / Zone (e.g. Dining Hall)" value={areaName} onChange={(e) => setAreaName(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
          <button
            disabled={saving || !slotId}
            onClick={addSupervision}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            <Plus size={15} /> Assign Duty
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '0.55rem' }}>Day</th>
              <th style={{ padding: '0.55rem' }}>Break / Slot</th>
              <th style={{ padding: '0.55rem' }}>Area / Zone</th>
              <th style={{ padding: '0.55rem' }}>Supervisor</th>
              <th style={{ padding: '0.55rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {supervisions.map((sup) => (
              <tr key={sup.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.55rem', fontWeight: 600 }}>{sup.day_of_week}</td>
                <td style={{ padding: '0.55rem' }}>
                  {sup.timetable_slots?.name || 'Break'} ({sup.timetable_slots?.start_time?.slice(0, 5)}–{sup.timetable_slots?.end_time?.slice(0, 5)})
                </td>
                <td style={{ padding: '0.55rem' }}>{sup.area_name}</td>
                <td style={{ padding: '0.55rem' }}>{sup.profiles?.first_name} {sup.profiles?.last_name}</td>
                <td style={{ padding: '0.55rem', textAlign: 'right' }}>
                  <button onClick={() => deleteSupervision(sup.id)} style={{ padding: '0.25rem 0.45rem', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {supervisions.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No break supervisions assigned yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
