'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, Users, FileDown, Plus, Trash2, ShieldAlert, Sparkles, CheckCircle2, Loader2, Info } from 'lucide-react'

interface ClassItem {
  id: string
  name: string
  section?: string
}

interface Teacher {
  id: string
  first_name: string
  last_name: string
}

interface Allocation {
  id: string
  class_id: string
  teacher_id: string
  subject_id: string | null
  profiles?: {
    first_name: string
    last_name: string
  }
  subjects?: {
    name: string
  }
}

interface Slot {
  id: string
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
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

interface TimetableClientProps {
  classes: ClassItem[]
  teachers: Teacher[]
  allocations: Allocation[]
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TimetableClient({
  classes,
  teachers,
  allocations
}: TimetableClientProps) {
  // Config state
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '')
  const [viewType, setViewType] = useState<'class' | 'teacher' | 'summary'>('class')

  // Slots & Entries state
  const [slots, setSlots] = useState<Slot[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [savingSlots, setSavingSlots] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)

  // AI input state
  const [aiInput, setAiInput] = useState('8am start, 40min lessons, 10min break after 2nd, 20min after 4th, 1hr lunch after 6th')
  const [totalPeriods, setTotalPeriods] = useState(8)

  // Scheduling Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [modalCell, setModalCell] = useState<{ day: string; slot: Slot } | null>(null)
  const [selectedAllocId, setSelectedAllocId] = useState('')
  const [roomText, setRoomText] = useState('')
  
  // Conflict warning state
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Fetch Slots
  const fetchSlots = async () => {
    setLoading(true)
    try {
      // We load either class-specific or default global slots
      const res = await fetch(`/api/timetable/slots?class_id=${viewType === 'class' ? selectedClassId : ''}`)
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Entries
  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/timetable/entries')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [selectedClassId, viewType])

  useEffect(() => {
    fetchEntries()
  }, [])

  // Process AI slot parser
  const handleAiSlotParse = async () => {
    if (!aiInput.trim()) return
    setSavingSlots(true)
    try {
      const res = await fetch('/api/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: viewType === 'class' ? selectedClassId : null,
          text: aiInput,
          total_periods: totalPeriods
        })
      })
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots || [])
        alert('Slots generated and saved successfully!')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingSlots(false)
    }
  }

  // Allocations corresponding to selected view
  const classAllocations = useMemo(() => {
    return allocations.filter(a => a.class_id === selectedClassId)
  }, [allocations, selectedClassId])

  // Get active class info name
  const currentClassName = useMemo(() => {
    const cls = classes.find(c => c.id === selectedClassId)
    return cls ? `${cls.name} ${cls.section || ''}`.trim() : ''
  }, [classes, selectedClassId])

  // Get active teacher info name
  const currentTeacherName = useMemo(() => {
    const t = teachers.find(teach => teach.id === selectedTeacherId)
    return t ? `${t.first_name} ${t.last_name}` : ''
  }, [teachers, selectedTeacherId])

  // Open Scheduler Modal
  const openScheduler = (day: string, slot: Slot) => {
    setModalCell({ day, slot })
    // Pre-fill active entry if it exists
    const targetEntry = entries.find(e => 
      e.day_of_week.toLowerCase() === day.toLowerCase() && 
      e.slot_id === slot.id &&
      (viewType === 'class' ? e.class_id === selectedClassId : true)
    )

    if (targetEntry) {
      setSelectedAllocId(targetEntry.class_subject_id)
      setRoomText(targetEntry.room || '')
    } else {
      setSelectedAllocId(classAllocations[0]?.id || '')
      setRoomText('')
    }
    setConflictWarning(null)
    setShowScheduleModal(true)
  }

  // Save Scheduled Allocation Cell
  const handleSaveEntry = async (force: boolean = false) => {
    if (!modalCell || !selectedAllocId) return
    setSavingEntry(true)
    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: viewType === 'class' ? selectedClassId : allocations.find(a => a.id === selectedAllocId)?.class_id,
          class_subject_id: selectedAllocId,
          day_of_week: modalCell.day,
          slot_id: modalCell.slot.id,
          room: roomText,
          force
        })
      })

      if (res.ok) {
        await fetchEntries()
        setShowScheduleModal(false)
      } else if (res.status === 409) {
        const errData = await res.json()
        setConflictWarning(errData.message)
      } else {
        const errData = await res.json()
        alert(errData.error || 'Failed to save entry')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingEntry(false)
    }
  }

  // Remove Scheduled Cell entry
  const handleRemoveEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to remove this scheduled slot?')) return
    try {
      const res = await fetch(`/api/timetable/entries?id=${entryId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchEntries()
        setShowScheduleModal(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Check conflicts locally to show inline alert icons in UI
  const getConflictWarning = (day: string, slotId: string, entry: TimetableEntry) => {
    // A teacher conflict occurs if this teacher is scheduled in another class at the same day + slot
    const teacherId = entry.class_subjects?.teacher_id
    const classId = entry.class_id
    
    const otherEntry = entries.find(e => 
      e.id !== entry.id &&
      e.day_of_week.toLowerCase() === day.toLowerCase() &&
      e.slot_id === slotId &&
      (e.class_subjects?.teacher_id === teacherId || e.class_id === classId)
    )

    if (otherEntry) {
      if (otherEntry.class_subjects?.teacher_id === teacherId && otherEntry.class_id !== classId) {
        const otherClassName = otherEntry.classes ? `${otherEntry.classes.name} ${otherEntry.classes.section || ''}`.trim() : 'Another class'
        return `Conflict: Teacher is also scheduled in ${otherClassName}`
      }
      if (otherEntry.class_id === classId && otherEntry.class_subject_id !== entry.class_subject_id) {
        return `Conflict: Class is scheduled for multiple subjects`
      }
    }
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header Action Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(30, 58, 138, 0.01)', border: '1px solid rgba(30, 58, 138, 0.15)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00264b', fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.25rem' }}>
            <Calendar size={20} />
            Timetable Management Module
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Design schedules, configure period durations with AI parsing, detect conflicts and export timetables.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a 
            href={`/api/timetable/pdf?${viewType === 'class' ? `class_id=${selectedClassId}` : viewType === 'teacher' ? `teacher_id=${selectedTeacherId}` : 'summary=true'}`}
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
            Export Grid PDF
          </a>
        </div>
      </div>

      {/* 2. AI Time Slot Generator Configuration */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={16} style={{ color: '#f59e0b' }} />
          AI-Assisted Time Slot Generator
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                Shorthand Timeline Prompt
              </label>
              <input 
                type="text" 
                className="input-field" 
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.85rem' }} 
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="e.g. 8am start, 45min lessons, 10min break after 2nd, 20min after 4th, 1hr lunch after 6th"
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                Total Periods
              </label>
              <input 
                type="number" 
                className="input-field" 
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.85rem' }} 
                value={totalPeriods}
                onChange={e => setTotalPeriods(Number(e.target.value))}
                min={1}
                max={15}
              />
            </div>
            <div style={{ paddingTop: '1.45rem' }}>
              <button
                type="button"
                onClick={handleAiSlotParse}
                disabled={savingSlots}
                className="btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {savingSlots && <Loader2 size={14} className="animate-spin" />}
                Generate & Save slots
              </button>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Info size={14} />
            <span>This configures the school default timeline. Generating new slots clears previous slots configuration.</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toggle & Views */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Toggle buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.04)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setViewType('class')}
              style={{
                border: 'none',
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: viewType === 'class' ? '#00264b' : 'transparent',
                color: viewType === 'class' ? '#ffffff' : 'var(--color-text)'
              }}
            >
              Class Schedule
            </button>
            <button
              onClick={() => setViewType('teacher')}
              style={{
                border: 'none',
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: viewType === 'teacher' ? '#00264b' : 'transparent',
                color: viewType === 'teacher' ? '#ffffff' : 'var(--color-text)'
              }}
            >
              Teacher Schedule
            </button>
            <button
              onClick={() => setViewType('summary')}
              style={{
                border: 'none',
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: viewType === 'summary' ? '#00264b' : 'transparent',
                color: viewType === 'summary' ? '#ffffff' : 'var(--color-text)'
              }}
            >
              School Summary
            </button>
          </div>

          {/* Filtering Dropdown inputs */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {viewType === 'class' && (
              <div>
                <select 
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="input-field"
                  style={{ minWidth: '180px', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `- ${c.section}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {viewType === 'teacher' && (
              <div>
                <select 
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="input-field"
                  style={{ minWidth: '180px', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {viewType === 'summary' && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Displaying combined active schedules across all classes.
              </span>
            )}
          </div>

        </div>
      </div>

      {/* 4. Weekly Grid Schedule Board */}
      <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)' }}>
        {slots.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No periods slots generated. Use the AI Shorthand Time Slot Generator panel above to configure period times.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
            <thead>
              <tr style={{ backgroundColor: '#00264b', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ color: '#ffffff', width: '130px', padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>TIME SLOT</th>
                {DAYS_OF_WEEK.map(day => (
                  <th key={day} style={{ color: '#ffffff', padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                    {day.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, sIdx) => {
                if (slot.is_break) {
                  return (
                    <tr key={slot.id} style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</span>
                      </td>
                      <td colSpan={5} style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
                        {slot.name.toUpperCase()} (BREAKTIME)
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={slot.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: sIdx % 2 === 1 ? 'rgba(0,0,0,0.01)' : 'transparent' }}>
                    
                    {/* Time cell */}
                    <td style={{ padding: '1rem', borderRight: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00264b' }}>{slot.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</div>
                    </td>

                    {/* Monday to Friday columns */}
                    {DAYS_OF_WEEK.map(day => {
                      // Filter entry for this slot + day + selected entity
                      const entry = entries.find(e => {
                        const matchesDay = e.day_of_week.toLowerCase() === day.toLowerCase()
                        const matchesSlot = e.slot_id === slot.id
                        if (!matchesDay || !matchesSlot) return false

                        if (viewType === 'class') {
                          return e.class_id === selectedClassId
                        } else if (viewType === 'teacher') {
                          return e.class_subjects?.teacher_id === selectedTeacherId
                        }
                        return true // Summary view matches everything
                      })

                      const conflictMsg = entry ? getConflictWarning(day, slot.id, entry) : null

                      return (
                        <td 
                          key={day}
                          onClick={() => viewType !== 'teacher' && openScheduler(day, slot)}
                          style={{
                            padding: '0.75rem',
                            textAlign: 'center',
                            cursor: viewType === 'teacher' ? 'default' : 'pointer',
                            borderRight: '1px solid var(--color-border)',
                            backgroundColor: entry ? 'rgba(30, 58, 138, 0.02)' : 'transparent',
                            transition: 'background-color 0.15s ease',
                            verticalAlign: 'middle'
                          }}
                          className="hover-grid-cell"
                        >
                          {entry ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', position: 'relative' }}>
                              
                              {/* Inline Conflict Warning Badge */}
                              {conflictMsg && (
                                <div 
                                  title={conflictMsg} 
                                  style={{ position: 'absolute', top: '-6px', right: '-4px', color: 'var(--color-error)' }}
                                >
                                  <ShieldAlert size={14} />
                                </div>
                              )}

                              {viewType === 'class' && (
                                <>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                    {entry.class_subjects?.subjects?.name || 'Lesson'}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    {entry.class_subjects?.profiles ? `${entry.class_subjects.profiles.first_name} ${entry.class_subjects.profiles.last_name}` : ''}
                                  </div>
                                </>
                              )}

                              {viewType === 'teacher' && (
                                <>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                    {entry.classes ? `${entry.classes.name} ${entry.classes.section || ''}`.trim() : 'Class'}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    {entry.class_subjects?.subjects?.name || ''}
                                  </div>
                                </>
                              )}

                              {viewType === 'summary' && (
                                <>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                    {entry.classes ? `${entry.classes.name} ${entry.classes.section || ''}`.trim() : 'Class'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {entry.class_subjects?.subjects?.name || ''}
                                  </div>
                                </>
                              )}

                              {entry.room && (
                                <div style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.04)', alignSelf: 'center', color: 'var(--color-text-muted)' }}>
                                  Room: {entry.room}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="add-indicator" style={{ display: 'none', color: 'var(--color-text-muted)' }}>
                              <Plus size={16} style={{ margin: 'auto' }} />
                            </div>
                          )}
                        </td>
                      )
                    })}

                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Schedule Allocation Modal */}
      {showScheduleModal && modalCell && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Schedule Period Cell Allocation
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Slot: <span style={{ fontWeight: 600 }}>{modalCell.slot.name} ({modalCell.slot.start_time.substring(0, 5)} - {modalCell.slot.end_time.substring(0, 5)})</span> on <span style={{ fontWeight: 600 }}>{modalCell.day}</span>
              </p>
            </div>

            {/* Conflict alert banner */}
            {conflictWarning && (
              <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--color-error)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--color-error)', fontWeight: 600, fontSize: '0.85rem' }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                  <span>Double Booking Alert</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text)', marginTop: '0.35rem' }}>
                  {conflictWarning}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleSaveEntry(true)}
                    className="btn"
                    style={{ backgroundColor: 'var(--color-error)', color: '#ffffff', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Force Overwrite
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictWarning(null)}
                    className="btn"
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                  {viewType === 'class' ? `Subject Allocation for ${currentClassName}` : 'All Subject Allocations'}
                </label>
                <select
                  value={selectedAllocId}
                  onChange={e => setSelectedAllocId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem' }}
                >
                  <option value="">Select subject allocation...</option>
                  {(viewType === 'class' ? classAllocations : allocations).map(alloc => {
                    const subj = alloc.subjects?.name || 'Homeroom'
                    const teacher = alloc.profiles ? `${alloc.profiles.first_name} ${alloc.profiles.last_name}` : ''
                    const cls = classes.find(c => c.id === alloc.class_id)
                    const classNameStr = cls ? ` [${cls.name} ${cls.section || ''}]` : ''
                    
                    return (
                      <option key={alloc.id} value={alloc.id}>
                        {subj} - {teacher} {classNameStr}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                  Room / Location (Optional)
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={roomText}
                  onChange={e => setRoomText(e.target.value)}
                  placeholder="e.g. Lab 2, Room 4"
                  style={{ width: '100%', padding: '0.65rem' }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', gap: '1rem' }}>
              <div>
                {/* Delete button if entry exists */}
                {(() => {
                  const currentEntry = entries.find(e => 
                    e.day_of_week.toLowerCase() === modalCell.day.toLowerCase() && 
                    e.slot_id === modalCell.slot.id &&
                    (viewType === 'class' ? e.class_id === selectedClassId : true)
                  )
                  if (currentEntry) {
                    return (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(currentEntry.id)}
                        className="btn"
                        style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: 0 }}
                      >
                        <Trash2 size={16} />
                        Clear Slot
                      </button>
                    )
                  }
                  return null
                })()}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn"
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--color-text)', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEntry(false)}
                  disabled={savingEntry || !selectedAllocId}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                >
                  {savingEntry && <Loader2 size={14} className="animate-spin" />}
                  Save Slot
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CSS overrides for cell hovering indicators */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hover-grid-cell:hover {
          background-color: rgba(30, 58, 138, 0.05) !important;
        }
        .hover-grid-cell:hover .add-indicator {
          display: block !important;
        }
      ` }} />

    </div>
  )
}
