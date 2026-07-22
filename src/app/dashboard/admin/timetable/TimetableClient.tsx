'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, Users, FileDown, Plus, Trash2, ShieldAlert, Sparkles, CheckCircle2, Loader2, Info, Save, Settings, Edit3, X, ArrowRight } from 'lucide-react'

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
  periods_per_week: number
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
  allocations: initialAllocations
}: TimetableClientProps) {
  // Config state
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '')
  const [viewType, setViewType] = useState<'class' | 'teacher' | 'summary'>('class')

  // Slots & Entries state
  const [slots, setSlots] = useState<Slot[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>(initialAllocations)
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [savingSlots, setSavingSlots] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [updatingPeriods, setUpdatingPeriods] = useState(false)
  const [generatingTimetable, setGeneratingTimetable] = useState(false)

  // AI input state
  const [aiInput, setAiInput] = useState('8am start, 40min lessons, 10min break after 2nd, 20min after 4th, 1hr lunch after 6th')
  const [totalPeriods, setTotalPeriods] = useState(8)

  // Manual Slot Adjustment Panel state
  const [showSlotEditor, setShowSlotEditor] = useState(false)
  const [editingSlots, setEditingSlots] = useState<(Omit<Slot, 'id'> & { id?: string })[]>([])

  // Scheduling Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [modalCell, setModalCell] = useState<{ day: string; slot: Slot } | null>(null)
  const [selectedAllocId, setSelectedAllocId] = useState('')
  const [roomText, setRoomText] = useState('')
  
  // Conflict warning state
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Drag and Drop State
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null)
  const [dropConflict, setDropConflict] = useState<{
    entryId: string;
    day: string;
    slotId: string;
    message: string;
  } | null>(null)

  // Fetch Slots
  const fetchSlots = async () => {
    setLoading(true)
    try {
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
        alert('Period slots generated and saved successfully!')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingSlots(false)
    }
  }

  // Initialize slots editor with existing values
  const handleOpenSlotEditor = () => {
    setEditingSlots(slots.map(s => ({ ...s })))
    setShowSlotEditor(true)
  }

  // Save manually updated slots
  const handleSaveManualSlots = async () => {
    setSavingSlots(true)
    try {
      const res = await fetch('/api/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: viewType === 'class' ? selectedClassId : null,
          slots: editingSlots
        })
      })
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots || [])
        setShowSlotEditor(false)
        alert('Time slots adjustments saved successfully!')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingSlots(false)
    }
  }

  const handleAddCustomSlot = () => {
    const lastSlot = editingSlots[editingSlots.length - 1]
    const nextPeriodNum = lastSlot ? lastSlot.period_number + 1 : 1
    setEditingSlots([
      ...editingSlots,
      {
        period_number: nextPeriodNum,
        name: `Period ${nextPeriodNum}`,
        start_time: lastSlot ? lastSlot.end_time : '08:00',
        end_time: '09:00',
        is_break: false
      }
    ])
  }

  const handleUpdateEditingSlot = (idx: number, fields: Partial<Slot>) => {
    setEditingSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...fields } : s))
  }

  const handleRemoveEditingSlot = (idx: number) => {
    setEditingSlots(prev => prev.filter((_, i) => i !== idx))
  }

  // Filter allocations for selected class
  const classAllocations = useMemo(() => {
    return allocations.filter(a => a.class_id === selectedClassId)
  }, [allocations, selectedClassId])

  // Update locally changed periods_per_week
  const handlePeriodChange = (allocId: string, value: number) => {
    setAllocations(prev => 
      prev.map(a => a.id === allocId ? { ...a, periods_per_week: value } : a)
    )
  }

  // Save allocations config (PUT)
  const handleSavePeriodsConfig = async () => {
    setUpdatingPeriods(true)
    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: classAllocations.map(a => ({ id: a.id, periods_per_week: a.periods_per_week })) })
      })
      if (res.ok) {
        alert('Periods per subject config saved successfully!')
      } else {
        alert('Failed to save configuration')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingPeriods(false)
    }
  }

  // Generate timetable using auto-scheduler algorithm (POST action: generate)
  const handleAutoGenerateTimetable = async () => {
    if (!confirm('Generating a new timetable will overwrite all manual entries for this class. Proceed?')) return
    setGeneratingTimetable(true)
    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', class_id: selectedClassId })
      })

      const data = await res.json()
      if (res.ok) {
        await fetchEntries()
        alert(data.message || 'Timetable generated successfully!')
      } else {
        alert(data.error || 'Failed to auto-generate timetable')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingTimetable(false)
    }
  }

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

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    setDraggedEntryId(entryId)
    e.dataTransfer.setData('entryId', entryId)
  }

  const handleDrop = async (e: React.DragEvent, targetDay: string, targetSlotId: string, force = false) => {
    e.preventDefault()
    const entryId = e.dataTransfer.getData('entryId') || draggedEntryId
    if (!entryId) return

    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entryId,
          day_of_week: targetDay,
          slot_id: targetSlotId,
          force
        })
      })

      if (res.ok) {
        await fetchEntries()
        setDropConflict(null)
      } else if (res.status === 409) {
        const data = await res.json()
        setDropConflict({
          entryId,
          day: targetDay,
          slotId: targetSlotId,
          message: data.message
        })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to move lesson')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDraggedEntryId(null)
    }
  }

  // Check conflicts locally to show inline alert icons in UI
  const getConflictWarning = (day: string, slotId: string, entry: TimetableEntry) => {
    const cs = Array.isArray(entry.class_subjects) ? entry.class_subjects[0] : entry.class_subjects
    const teacherId = cs?.teacher_id
    const classId = entry.class_id
    
    const otherEntry = entries.find(e => 
      e.id !== entry.id &&
      e.day_of_week.toLowerCase() === day.toLowerCase() &&
      e.slot_id === slotId &&
      (
        (() => {
          const otherCs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
          return otherCs?.teacher_id === teacherId
        })() ||
        e.class_id === classId
      )
    )

    if (otherEntry) {
      const otherCs = Array.isArray(otherEntry.class_subjects) ? otherEntry.class_subjects[0] : otherEntry.class_subjects
      if (otherCs?.teacher_id === teacherId && otherEntry.class_id !== classId) {
        const otherCls = Array.isArray(otherEntry.classes) ? otherEntry.classes[0] : otherEntry.classes
        const otherClassName = otherCls ? `${otherCls.name} ${otherCls.section || ''}`.trim() : 'Another class'
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <Sparkles size={16} style={{ color: '#f59e0b' }} />
            AI-Assisted Time Slot Generator
          </h3>
          <button
            type="button"
            onClick={handleOpenSlotEditor}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            <Edit3 size={14} />
            Adjust Slots Manually
          </button>
        </div>

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
                placeholder="e.g. 8am start, 40min lessons, 10min break after 2nd, 20min after 4th, 1hr lunch after 6th"
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
            <span>This configures the default periods timeline. Generating new slots clears previous slots configuration.</span>
          </div>
        </div>
      </div>

      {/* 3. Class Subjects Allocation Config (Periods per subject count) */}
      {viewType === 'class' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Settings size={16} style={{ color: '#00264b' }} />
              Periods per Subject Configuration ({currentClassName})
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleSavePeriodsConfig}
                disabled={updatingPeriods}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 1rem', cursor: 'pointer' }}
              >
                {updatingPeriods ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />}
                Save Periods Config
              </button>
              <button
                type="button"
                onClick={handleAutoGenerateTimetable}
                disabled={generatingTimetable || slots.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 1rem', cursor: 'pointer', backgroundColor: '#0f766e', borderColor: '#0f766e' }}
              >
                {generatingTimetable ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={14} />}
                Auto-Generate Timetable
              </button>
            </div>
          </div>

          {classAllocations.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
              No subject allocations configured for this class yet. Go to Teacher Assignments to link teachers first.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {classAllocations.map(alloc => {
                const sub = Array.isArray(alloc.subjects) ? alloc.subjects[0] : alloc.subjects
                const prof = Array.isArray(alloc.profiles) ? alloc.profiles[0] : alloc.profiles
                const name = sub?.name || 'Homeroom'
                const tName = prof ? `${prof.first_name} ${prof.last_name}` : 'Teacher'

                return (
                  <div key={alloc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{tName}</span>
                    </div>
                    <div style={{ width: '65px' }}>
                      <input 
                        type="number"
                        min={0}
                        max={15}
                        className="input-field"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', textAlign: 'center' }}
                        value={alloc.periods_per_week}
                        onChange={e => handlePeriodChange(alloc.id, Number(e.target.value))}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Filter Toggle Options */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
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

      {/* 5. Weekly Grid Schedule Board (DAYS AS ROWS, PERIODS AS COLUMNS) */}
      <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)' }}>
        {slots.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No periods slots generated. Use the AI Shorthand Time Slot Generator panel above to configure period times.
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
                    // Filter entries for this slot + day + selected entity
                    const cellEntries = entries.filter(e => {
                      const matchesDay = e.day_of_week.toLowerCase() === day.toLowerCase()
                      const matchesSlot = e.slot_id === slot.id
                      if (!matchesDay || !matchesSlot) return false

                      if (viewType === 'class') {
                        return e.class_id === selectedClassId
                      } else if (viewType === 'teacher') {
                        const cs = Array.isArray(e.class_subjects) ? e.class_subjects[0] : e.class_subjects
                        return cs?.teacher_id === selectedTeacherId
                      }
                      return true // Summary matches all
                    })

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
                        onClick={() => viewType !== 'teacher' && openScheduler(day, slot)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => viewType !== 'teacher' && handleDrop(e, day, slot.id)}
                        style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          cursor: viewType === 'teacher' ? 'default' : 'pointer',
                          borderRight: '1px solid var(--color-border)',
                          backgroundColor: cellEntries.length > 0 ? 'rgba(30, 58, 138, 0.02)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                          verticalAlign: 'middle',
                          minHeight: '65px'
                        }}
                        className="hover-grid-cell"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {cellEntries.map(entry => {
                            const conflictMsg = getConflictWarning(day, slot.id, entry)
                            
                            return (
                              <div 
                                key={entry.id}
                                draggable={viewType !== 'teacher'}
                                onDragStart={e => handleDragStart(e, entry.id)}
                                onClick={ev => {
                                  // Stop click triggering cell schedule modal when clicking specific card
                                  ev.stopPropagation()
                                  if (viewType !== 'teacher') openScheduler(day, slot)
                                }}
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '0.1rem', 
                                  position: 'relative', 
                                  backgroundColor: 'var(--color-bg)', 
                                  padding: '0.4rem', 
                                  borderRadius: 'var(--radius-sm)', 
                                  border: '1px solid var(--color-border)',
                                  boxShadow: 'var(--shadow-sm)',
                                  cursor: viewType === 'teacher' ? 'default' : 'grab'
                                }}
                              >
                                
                                {conflictMsg && (
                                  <div 
                                    title={conflictMsg} 
                                    style={{ position: 'absolute', top: '-6px', right: '-4px', color: 'var(--color-error)' }}
                                  >
                                    <ShieldAlert size={12} />
                                  </div>
                                )}

                                {viewType === 'class' && (
                                  <>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                      {(() => {
                                        const cs = Array.isArray(entry.class_subjects) ? entry.class_subjects[0] : entry.class_subjects
                                        const sub = cs ? (Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects) : null
                                        return sub?.name || 'Lesson'
                                      })()}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                      {(() => {
                                        const cs = Array.isArray(entry.class_subjects) ? entry.class_subjects[0] : entry.class_subjects
                                        const prof = cs ? (Array.isArray(cs.profiles) ? cs.profiles[0] : cs.profiles) : null
                                        return prof ? `${prof.first_name} ${prof.last_name}` : ''
                                      })()}
                                    </div>
                                  </>
                                )}

                                {viewType === 'teacher' && (
                                  <>
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
                                  </>
                                )}

                                {viewType === 'summary' && (
                                  <>
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
                                  </>
                                )}

                                {entry.room && (
                                  <div style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.03)', alignSelf: 'center', color: 'var(--color-text-muted)' }}>
                                    {entry.room}
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {cellEntries.length === 0 && (
                            <div className="add-indicator" style={{ display: 'none', color: 'var(--color-text-muted)' }}>
                              <Plus size={16} style={{ margin: 'auto' }} />
                            </div>
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

      {/* 6. Manual Slots Configuration Modal */}
      {showSlotEditor && (
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
            maxWidth: '750px',
            maxHeight: '85vh',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                  Adjust Time Slots Configuration
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Define custom periods and breaks. Overwrites slots setup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotEditor(false)}
                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>No.</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name / Label</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Start Time</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>End Time</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem' }}>Is Break</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {editingSlots.map((slot, sIdx) => (
                    <tr key={sIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem', width: '60px' }}>
                        <input
                          type="number"
                          className="input-field"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={slot.period_number}
                          onChange={e => handleUpdateEditingSlot(sIdx, { period_number: Number(e.target.value) })}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="text"
                          className="input-field"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                          value={slot.name}
                          onChange={e => handleUpdateEditingSlot(sIdx, { name: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', width: '100px' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="HH:MM"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={slot.start_time.substring(0, 5)}
                          onChange={e => handleUpdateEditingSlot(sIdx, { start_time: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', width: '100px' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="HH:MM"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={slot.end_time.substring(0, 5)}
                          onChange={e => handleUpdateEditingSlot(sIdx, { end_time: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', width: '80px' }}>
                        <input
                          type="checkbox"
                          checked={slot.is_break}
                          onChange={e => handleUpdateEditingSlot(sIdx, { is_break: e.target.checked })}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditingSlot(sIdx)}
                          style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--color-error)', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <button
                type="button"
                onClick={handleAddCustomSlot}
                className="btn"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-text)' }}
              >
                <Plus size={14} />
                Add New Time Slot
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowSlotEditor(false)}
                className="btn"
                style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--color-text)', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveManualSlots}
                disabled={savingSlots}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
              >
                {savingSlots && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Drag-and-Drop Conflict Warning Dialog */}
      {dropConflict && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '450px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <ShieldAlert size={20} style={{ color: 'var(--color-error)' }} />
                Conflict detected on move
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginTop: '0.5rem' }}>
                {dropConflict.message}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDropConflict(null)}
                className="btn"
                style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--color-text)', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
              >
                Cancel Move
              </button>
              <button
                type="button"
                onClick={() => handleDrop(null as any, dropConflict.day, dropConflict.slotId, true)}
                className="btn"
                style={{ backgroundColor: 'var(--color-error)', color: '#ffffff', border: 'none', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
              >
                Force Move (Overwrite)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Schedule Allocation Modal */}
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
                    const sub = Array.isArray(alloc.subjects) ? alloc.subjects[0] : alloc.subjects
                    const prof = Array.isArray(alloc.profiles) ? alloc.profiles[0] : alloc.profiles
                    const name = sub?.name || 'Homeroom'
                    const tName = prof ? `${prof.first_name} ${prof.last_name}` : 'Teacher'
                    const cls = classes.find(c => c.id === alloc.class_id)
                    const classNameStr = cls ? ` [${cls.name} ${cls.section || ''}]` : ''
                    
                    return (
                      <option key={alloc.id} value={alloc.id}>
                        {name} - {tName} {classNameStr}
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
