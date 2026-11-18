'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Building2, DoorOpen, Users, Settings, Clock } from 'lucide-react'
import type { EngineBuilding, EngineClassroom, EngineGroup, EngineSettings, EngineSlot, TimeOffMap } from '@/lib/timetableEngine'
import TimeOffMatrixModal from './TimeOffMatrixModal'

interface ClassItem {
  id: string
  name: string
  section?: string
}

interface ResourcesManagerModalProps {
  classes: ClassItem[]
  slots: EngineSlot[]
  buildings: EngineBuilding[]
  classrooms: EngineClassroom[]
  groups: EngineGroup[]
  settings: EngineSettings
  onRefreshConfig: () => Promise<void>
  onClose: () => void
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ResourcesManagerModal({
  classes,
  slots,
  buildings,
  classrooms,
  groups,
  settings,
  onRefreshConfig,
  onClose,
}: ResourcesManagerModalProps) {
  const [tab, setTab] = useState<'classrooms' | 'buildings' | 'groups' | 'settings'>('classrooms')
  const [saving, setSaving] = useState(false)

  // Building form
  const [bName, setBName] = useState('')
  const [bShort, setBShort] = useState('')
  const [bTravel, setBTravel] = useState(0)

  // Classroom form
  const [rName, setRName] = useState('')
  const [rShort, setRShort] = useState('')
  const [rCap, setRCap] = useState(40)
  const [rBuildingId, setRBuildingId] = useState('')
  const [rShared, setRShared] = useState(false)
  const [rHomeClassId, setRHomeClassId] = useState('')

  // Group form
  const [gClassId, setGClassId] = useState(classes[0]?.id || '')
  const [gDivision, setGDivision] = useState('Division 1')
  const [gName, setGName] = useState('')
  const [gCount, setGCount] = useState('')

  // Settings form
  const [sDays, setSDays] = useState<string[]>(settings.days_of_week || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  const [sAutoRelax, setSAutoRelax] = useState<boolean>(settings.auto_relax_constraints ?? true)
  const [sLunchEnabled, setSLunchEnabled] = useState<boolean>(settings.lunch_enabled ?? false)
  const [sLunchMin, setSLunchMin] = useState<number>(settings.lunch_min_period ?? 4)
  const [sLunchMax, setSLunchMax] = useState<number>(settings.lunch_max_period ?? 6)

  // Room Time-Off modal
  const [roomTimeOffTarget, setRoomTimeOffTarget] = useState<EngineClassroom | null>(null)

  const callConfig = async (entity: string, action: string, payload: Record<string, unknown>, id?: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, action, id, payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to save')
        return
      }
      await onRefreshConfig()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#00264b' }}>
            School Resources, Divisions & Timetable Parameters
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { id: 'classrooms', label: `Classrooms (${classrooms.length})`, icon: <DoorOpen size={15} /> },
            { id: 'buildings', label: `Buildings (${buildings.length})`, icon: <Building2 size={15} /> },
            { id: 'groups', label: `Class Divisions & Groups (${groups.length})`, icon: <Users size={15} /> },
            { id: 'settings', label: 'Parameters & Days', icon: <Settings size={15} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: tab === t.id ? '#00264b' : '#f1f5f9',
                color: tab === t.id ? '#fff' : '#334155',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
          {tab === 'classrooms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input placeholder="Room Name (e.g. Lab 1)" value={rName} onChange={(e) => setRName(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <input placeholder="Short (e.g. L1)" value={rShort} onChange={(e) => setRShort(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <input type="number" placeholder="Capacity" value={rCap} onChange={(e) => setRCap(Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <select value={rBuildingId} onChange={(e) => setRBuildingId(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
                  <option value="">No Building</option>
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={rHomeClassId} onChange={(e) => setRHomeClassId(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
                  <option value="">Home Class (None)</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500 }}>
                  <input type="checkbox" checked={rShared} onChange={(e) => setRShared(e.target.checked)} />
                  Shared Room (Lab/Gym)
                </label>
                <button
                  disabled={saving || !rName.trim()}
                  onClick={async () => {
                    await callConfig('classroom', 'upsert', {
                      name: rName,
                      short_name: rShort || null,
                      capacity: rCap,
                      building_id: rBuildingId || null,
                      is_shared: rShared,
                      home_class_id: rHomeClassId || null,
                    })
                    setRName(''); setRShort('')
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.45rem 0.75rem', borderRadius: '6px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <Plus size={15} /> Add Room
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '0.55rem' }}>Room</th>
                    <th style={{ padding: '0.55rem' }}>Short</th>
                    <th style={{ padding: '0.55rem' }}>Capacity</th>
                    <th style={{ padding: '0.55rem' }}>Building</th>
                    <th style={{ padding: '0.55rem' }}>Type / Home Class</th>
                    <th style={{ padding: '0.55rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map((r) => {
                    const bName = buildings.find((b) => b.id === r.building_id)?.name || '—'
                    const hc = classes.find((c) => c.id === r.home_class_id)
                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.55rem', fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: '0.55rem' }}>{r.short_name || '—'}</td>
                        <td style={{ padding: '0.55rem' }}>{r.capacity}</td>
                        <td style={{ padding: '0.55rem' }}>{bName}</td>
                        <td style={{ padding: '0.55rem' }}>
                          {r.is_shared ? 'Shared' : hc ? `Home: ${hc.name} ${hc.section || ''}` : 'Standard'}
                        </td>
                        <td style={{ padding: '0.55rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => setRoomTimeOffTarget(r)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                          >
                            <Clock size={12} /> Time-Off
                          </button>
                          <button
                            onClick={() => callConfig('classroom', 'delete', {}, r.id)}
                            style={{ padding: '0.25rem 0.45rem', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {classrooms.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No classrooms defined yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'buildings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input placeholder="Building Name (e.g. Science Block)" value={bName} onChange={(e) => setBName(e.target.value)} style={{ flex: 2, minWidth: '180px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <input placeholder="Short" value={bShort} onChange={(e) => setBShort(e.target.value)} style={{ flex: 1, minWidth: '90px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <input type="number" min={0} placeholder="Travel periods" value={bTravel} onChange={(e) => setBTravel(Number(e.target.value))} style={{ width: '120px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <button
                  disabled={saving || !bName.trim()}
                  onClick={async () => {
                    await callConfig('building', 'upsert', { name: bName, short_name: bShort || null, travel_periods: bTravel })
                    setBName(''); setBShort('')
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <Plus size={15} /> Add Building
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '0.55rem' }}>Name</th>
                    <th style={{ padding: '0.55rem' }}>Short</th>
                    <th style={{ padding: '0.55rem' }}>Transfer Periods Needed</th>
                    <th style={{ padding: '0.55rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.map((b) => (
                    <tr key={b.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.55rem', fontWeight: 600 }}>{b.name}</td>
                      <td style={{ padding: '0.55rem' }}>{b.short_name || '—'}</td>
                      <td style={{ padding: '0.55rem' }}>{b.travel_periods || 0}</td>
                      <td style={{ padding: '0.55rem', textAlign: 'right' }}>
                        <button onClick={() => callConfig('building', 'delete', {}, b.id)} style={{ padding: '0.25rem 0.45rem', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {buildings.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No buildings defined yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'groups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#475569', backgroundColor: '#eff6ff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                Divide a class into groups (e.g., <strong>Division: Languages</strong> → <em>French</em> &amp; <em>Swahili</em>, or <strong>Division: Lab</strong> → <em>Group A</em> &amp; <em>Group B</em>) so two group lessons can run simultaneously in the same period!
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <select value={gClassId} onChange={(e) => setGClassId(e.target.value)} style={{ flex: 1, minWidth: '140px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
                </select>
                <input placeholder="Division (e.g. Languages)" value={gDivision} onChange={(e) => setGDivision(e.target.value)} style={{ flex: 1, minWidth: '140px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <input placeholder="Group Name (e.g. French)" value={gName} onChange={(e) => setGName(e.target.value)} style={{ flex: 1, minWidth: '140px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <input type="number" placeholder="Students" value={gCount} onChange={(e) => setGCount(e.target.value)} style={{ width: '90px', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
                <button
                  disabled={saving || !gClassId || !gName.trim()}
                  onClick={async () => {
                    await callConfig('group', 'upsert', {
                      class_id: gClassId,
                      division_name: gDivision,
                      group_name: gName,
                      student_count: gCount ? Number(gCount) : null,
                    })
                    setGName(''); setGCount('')
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <Plus size={15} /> Add Group
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '0.55rem' }}>Class</th>
                    <th style={{ padding: '0.55rem' }}>Division</th>
                    <th style={{ padding: '0.55rem' }}>Group Name</th>
                    <th style={{ padding: '0.55rem' }}>Students</th>
                    <th style={{ padding: '0.55rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const cls = classes.find((c) => c.id === g.class_id)
                    return (
                      <tr key={g.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.55rem', fontWeight: 600 }}>{cls ? `${cls.name} ${cls.section || ''}` : g.class_id}</td>
                        <td style={{ padding: '0.55rem' }}>{g.division_name}</td>
                        <td style={{ padding: '0.55rem' }}>{g.group_name}</td>
                        <td style={{ padding: '0.55rem' }}>{g.student_count ?? '—'}</td>
                        <td style={{ padding: '0.55rem', textAlign: 'right' }}>
                          <button onClick={() => callConfig('group', 'delete', {}, g.id)} style={{ padding: '0.25rem 0.45rem', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {groups.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No class divisions/groups defined yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Active School Days</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ALL_DAYS.map((d) => {
                    const active = sDays.includes(d)
                    return (
                      <button
                        key={d}
                        onClick={() =>
                          setSDays((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : ALL_DAYS.filter((x) => prev.includes(x) || x === d)
                          )
                        }
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: active ? '2px solid #00264b' : '1px solid #cbd5e1',
                          backgroundColor: active ? '#eff6ff' : '#fff',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
                <input type="checkbox" checked={sAutoRelax} onChange={(e) => setSAutoRelax(e.target.checked)} />
                Automatic relaxation of soft constraints during generation (places remaining cards if strict pass leaves unplaced cards)
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
                  <input type="checkbox" checked={sLunchEnabled} onChange={(e) => setSLunchEnabled(e.target.checked)} />
                  Enforce Lunch Window between Period
                </label>
                <input type="number" min={1} max={12} value={sLunchMin} onChange={(e) => setSLunchMin(Number(e.target.value))} style={{ width: '60px', padding: '0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <span>and Period</span>
                <input type="number" min={1} max={12} value={sLunchMax} onChange={(e) => setSLunchMax(Number(e.target.value))} style={{ width: '60px', padding: '0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <button
                  disabled={saving}
                  onClick={() =>
                    callConfig('settings', 'upsert', {
                      days_of_week: sDays,
                      auto_relax_constraints: sAutoRelax,
                      lunch_enabled: sLunchEnabled,
                      lunch_min_period: sLunchMin,
                      lunch_max_period: sLunchMax,
                    })
                  }
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {saving ? 'Saving...' : 'Save Timetable Parameters'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {roomTimeOffTarget && (
        <TimeOffMatrixModal
          title={`Classroom: ${roomTimeOffTarget.name}`}
          days={settings.days_of_week || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']}
          slots={slots}
          initialTimeOff={(roomTimeOffTarget.time_off || {}) as TimeOffMap}
          onSave={async (next) => {
            await callConfig('classroom', 'upsert', { ...roomTimeOffTarget, time_off: next }, roomTimeOffTarget.id)
          }}
          onClose={() => setRoomTimeOffTarget(null)}
        />
      )}
    </div>
  )
}
