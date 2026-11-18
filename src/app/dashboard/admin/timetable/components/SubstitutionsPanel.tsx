'use client'

import { useState, useMemo } from 'react'
import { UserCheck, Calendar, Sparkles, Trash2, CheckCircle2 } from 'lucide-react'
import type { SubstituteCandidate } from '@/lib/timetableEngine'

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

interface EntryItem {
  id: string
  class_id: string
  class_subject_id: string
  day_of_week: string
  slot_id: string
  room?: string
  class_subjects?: {
    teacher_id: string
    profiles?: { first_name: string; last_name: string }
    subjects?: { name: string }
  }
  classes?: { name: string; section?: string }
}

interface SubstitutionRecord {
  id: string
  sub_date: string
  entry_id: string
  original_teacher_id?: string | null
  substitute_teacher_id?: string | null
  room?: string | null
  status: string
  notes?: string | null
}

interface SubstitutionsPanelProps {
  teachers: Teacher[]
  slots: Slot[]
  entries: EntryItem[]
  substitutions: SubstitutionRecord[]
  onRefreshConfig: () => Promise<void>
}

export default function SubstitutionsPanel({
  teachers,
  slots,
  entries,
  substitutions,
  onRefreshConfig,
}: SubstitutionsPanelProps) {
  const [subDate, setSubDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [absentTeacherId, setAbsentTeacherId] = useState(teachers[0]?.id || '')
  const [suggestionsByEntry, setSuggestionsByEntry] = useState<Record<string, SubstituteCandidate[]>>({})
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null)

  const dayOfWeek = useMemo(() => {
    const d = new Date(subDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long' })
  }, [subDate])

  const affectedEntries = useMemo(() => {
    return entries
      .filter((e) => e.day_of_week === dayOfWeek && e.class_subjects?.teacher_id === absentTeacherId)
      .sort((a, b) => {
        const sa = slots.find((s) => s.id === a.slot_id)?.period_number || 0
        const sb = slots.find((s) => s.id === b.slot_id)?.period_number || 0
        return sa - sb
      })
  }, [entries, dayOfWeek, absentTeacherId, slots])

  const findSubstitutes = async (entryId: string) => {
    setLoadingEntryId(entryId)
    try {
      const res = await fetch('/api/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'substitution', action: 'suggest_substitutes', payload: { entry_id: entryId } }),
      })
      const json = await res.json()
      if (res.ok) {
        setSuggestionsByEntry((prev) => ({ ...prev, [entryId]: json.candidates || [] }))
      }
    } finally {
      setLoadingEntryId(null)
    }
  }

  const assignSubstitute = async (entry: EntryItem, subTeacherId: string) => {
    await fetch('/api/timetable/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'substitution',
        action: 'upsert',
        payload: {
          sub_date: subDate,
          entry_id: entry.id,
          original_teacher_id: absentTeacherId,
          substitute_teacher_id: subTeacherId,
          status: 'assigned',
        },
      }),
    })
    await onRefreshConfig()
  }

  const deleteSubstitution = async (id: string) => {
    await fetch('/api/timetable/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'substitution', action: 'delete', id }),
    })
    await onRefreshConfig()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Date ({dayOfWeek})
          </label>
          <input type="date" value={subDate} onChange={(e) => setSubDate(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
        </div>
        <div style={{ minWidth: '240px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Absent Teacher</label>
          <select value={absentTeacherId} onChange={(e) => setAbsentTeacherId(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#475569' }}>
          <strong>{affectedEntries.length}</strong> lesson(s) need cover on {dayOfWeek}
        </div>
      </div>

      {/* Affected Lessons */}
      <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#00264b' }}>Lessons Requiring Cover</h4>
        {affectedEntries.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No lessons scheduled for this teacher on {dayOfWeek}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {affectedEntries.map((e) => {
              const slot = slots.find((s) => s.id === e.slot_id)
              const existingSub = substitutions.find((s) => s.entry_id === e.id && s.sub_date === subDate)
              const subTeacher = existingSub ? teachers.find((t) => t.id === existingSub.substitute_teacher_id) : null
              const candidates = suggestionsByEntry[e.id] || []

              return (
                <div key={e.id} style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#00264b', fontSize: '0.9rem' }}>
                        {slot ? `${slot.name} (${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)})` : 'Period'}
                      </span>
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        {e.classes?.name} {e.classes?.section || ''} — {e.class_subjects?.subjects?.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {existingSub ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.78rem', fontWeight: 600 }}>
                          <CheckCircle2 size={14} />
                          Covered by: {subTeacher ? `${subTeacher.first_name} ${subTeacher.last_name}` : 'Assigned'}
                          <button onClick={() => deleteSubstitution(existingSub.id)} style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', marginLeft: '0.25rem' }}>
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => findSubstitutes(e.id)}
                          disabled={loadingEntryId === e.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Sparkles size={14} />
                          {loadingEntryId === e.id ? 'Ranking...' : 'Suggest Substitutes'}
                        </button>
                      )}
                    </div>
                  </div>

                  {candidates.length > 0 && !existingSub && (
                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.5rem' }}>
                      {candidates.slice(0, 6).map((c) => (
                        <div key={c.teacher_id} style={{ padding: '0.55rem 0.7rem', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f172a' }}>{c.teacher_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.reasons.join(' • ')}</div>
                          </div>
                          <button
                            onClick={() => assignSubstitute(e, c.teacher_id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.55rem', borderRadius: '5px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <UserCheck size={12} /> Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
