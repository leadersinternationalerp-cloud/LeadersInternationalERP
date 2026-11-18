'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar, Users, FileDown, Plus, Trash2, ShieldAlert, Sparkles, CheckCircle2,
  Loader2, Info, Save, Settings, Edit3, X, Lock, Unlock, Undo2, Redo2,
  Building2, PlayCircle, AlertTriangle, ZoomIn, ZoomOut, Palette, History,
  UserCheck, Shield, Sliders, Download, DoorOpen
} from 'lucide-react'
import {
  evaluateSlotForLesson,
  type CardRelationship,
  type ClassConstraint,
  type DiagnosticItem,
  type EngineBuilding,
  type EngineClassroom,
  type EngineEntry,
  type EngineGroup,
  type EngineLesson,
  type EngineSettings,
  type SubjectConstraint,
  type TeacherConstraint,
  type TimetableContext,
  type UnplacedCard,
} from '@/lib/timetableEngine'
import ResourcesManagerModal from './components/ResourcesManagerModal'
import ConstraintsPanel from './components/ConstraintsPanel'
import SubstitutionsPanel from './components/SubstitutionsPanel'
import SupervisionsPanel from './components/SupervisionsPanel'

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

interface SubjectItem {
  id: string
  name: string
}

interface Allocation {
  id: string
  class_id: string
  teacher_id: string
  subject_id: string | null
  periods_per_week: number
  periods_per_card?: number
  group_id?: string | null
  allowed_classroom_ids?: string[]
  joint_class_ids?: string[]
  co_teacher_ids?: string[]
  color?: string | null
  profiles?: { first_name: string; last_name: string }
  subjects?: { name: string }
}

interface Slot {
  id: string
  period_number: number
  name: string
  start_time: string
  end_time: string
  is_break: boolean
}

interface TimetableEntry {
  id: string
  class_id: string
  class_subject_id: string
  day_of_week: string
  slot_id: string
  room?: string
  classroom_id?: string | null
  group_id?: string | null
  is_locked?: boolean
  week_code?: string
  card_group_id?: string | null
  class_subjects?: {
    id: string
    teacher_id: string
    subject_id?: string | null
    periods_per_card?: number
    color?: string | null
    profiles?: { first_name: string; last_name: string }
    subjects?: { name: string }
  }
  classes?: { name: string; section?: string }
  timetable_classrooms?: { id: string; name: string; short_name?: string | null } | null
  timetable_groups?: { id: string; division_name: string; group_name: string } | null
}

interface VersionItem {
  id: string
  name: string
  description?: string | null
  created_at: string
}

interface TimetableClientProps {
  classes: ClassItem[]
  teachers: Teacher[]
  allocations: Allocation[]
}

const DEFAULT_PALETTE = [
  '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#4f46e5', '#0d9488', '#ea580c',
]

function hashColor(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0
  }
  return DEFAULT_PALETTE[h % DEFAULT_PALETTE.length]
}

export default function TimetableClient({
  classes: initialClasses,
  teachers: initialTeachers,
  allocations: initialAllocations,
}: TimetableClientProps) {
  // Live ERP Classes & User-Management Teachers
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses)
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers)

  // Primary Views
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || '')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeachers[0]?.id || '')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [viewType, setViewType] = useState<
    'class' | 'teacher' | 'classroom' | 'summary' | 'constraints' | 'substitutions' | 'supervisions'
  >('class')

  // Core Data
  const [slots, setSlots] = useState<Slot[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>(initialAllocations)

  // aSc Extended Config State
  const [buildings, setBuildings] = useState<EngineBuilding[]>([])
  const [classrooms, setClassrooms] = useState<EngineClassroom[]>([])
  const [groups, setGroups] = useState<EngineGroup[]>([])
  const [teacherConstraints, setTeacherConstraints] = useState<TeacherConstraint[]>([])
  const [classConstraints, setClassConstraints] = useState<ClassConstraint[]>([])
  const [subjectConstraints, setSubjectConstraints] = useState<SubjectConstraint[]>([])
  const [cardRelationships, setCardRelationships] = useState<CardRelationship[]>([])
  const [settings, setSettings] = useState<EngineSettings>({
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    auto_relax_constraints: true,
  })
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [supervisions, setSupervisions] = useState<never[]>([])
  const [substitutions, setSubstitutions] = useState<never[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])

  // Loading & UI state
  const [loading, setLoading] = useState(false)
  const [savingSlots, setSavingSlots] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [updatingPeriods, setUpdatingPeriods] = useState(false)
  const [generatingTimetable, setGeneratingTimetable] = useState(false)
  const [testingTimetable, setTestingTimetable] = useState(false)

  // Visual UX (aSc style)
  const [colorBy, setColorBy] = useState<'subject' | 'teacher'>('subject')
  const [zoom, setZoom] = useState<number>(1)

  // Undo / Redo Stacks (snapshots of entries)
  const [undoStack, setUndoStack] = useState<TimetableEntry[][]>([])
  const [redoStack, setRedoStack] = useState<TimetableEntry[][]>([])

  // AI input & Manual Slot Editor
  const [aiInput, setAiInput] = useState('8am start, 40min lessons, 10min break after 2nd, 20min after 4th, 1hr lunch after 6th')
  const [totalPeriods, setTotalPeriods] = useState(8)
  const [showSlotEditor, setShowSlotEditor] = useState(false)
  const [editingSlots, setEditingSlots] = useState<(Omit<Slot, 'id'> & { id?: string })[]>([])

  // Modals
  const [showResourcesModal, setShowResourcesModal] = useState(false)
  const [showVersionsModal, setShowVersionsModal] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [modalCell, setModalCell] = useState<{ day: string; slot: Slot } | null>(null)
  const [selectedAllocId, setSelectedAllocId] = useState('')
  const [selectedRoomForEntry, setSelectedRoomForEntry] = useState('')
  const [roomText, setRoomText] = useState('')
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Diagnostics & Generation Report
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[] | null>(null)
  const [lastGenReport, setLastGenReport] = useState<{
    assigned: number
    unassigned: number
    unplacedCards: UnplacedCard[]
    relaxationsApplied: string[]
    stats: { totalTeacherWindows: number; maxTeacherWindows: number; teachersWithWindows: number; lockedPreserved: number }
  } | null>(null)

  // Card in Hand / Drag-and-Drop with aSc Green/Blue/Gray Slot Highlighting
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null)
  const [selectedUnplacedAllocId, setSelectedUnplacedAllocId] = useState<string | null>(null)
  const [dropConflict, setDropConflict] = useState<{
    entryId: string
    day: string
    slotId: string
    message: string
  } | null>(null)

  const daysOfWeek = settings.days_of_week?.length
    ? settings.days_of_week
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // Fetch Slots
  const fetchSlots = useCallback(async () => {
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
  }, [selectedClassId, viewType])

  // Fetch Entries
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable/entries')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Fetch aSc Config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable/config')
      if (res.ok) {
        const data = await res.json()
        setBuildings(data.buildings || [])
        const rooms = data.classrooms || []
        setClassrooms(rooms)
        if (!selectedRoomId && rooms.length > 0) setSelectedRoomId(rooms[0].id)
        setGroups(data.groups || [])
        setTeacherConstraints(data.teacherConstraints || [])
        setClassConstraints(data.classConstraints || [])
        setSubjectConstraints(data.subjectConstraints || [])
        setCardRelationships(data.cardRelationships || [])
        if (data.settings) setSettings(data.settings)
        setVersions(data.versions || [])
        setSupervisions(data.supervisions || [])
        setSubstitutions(data.substitutions || [])
        setSubjects(data.subjects || [])
        if (Array.isArray(data.classes) && data.classes.length > 0) setClasses(data.classes)
        if (Array.isArray(data.teachers) && data.teachers.length > 0) setTeachers(data.teachers)
      }
    } catch (e) {
      console.error(e)
    }
  }, [selectedRoomId])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  useEffect(() => {
    fetchEntries()
    fetchConfig()
  }, [fetchEntries, fetchConfig])

  // Push undo snapshot before mutating entries
  const pushUndoSnapshot = () => {
    setUndoStack((prev) => [...prev.slice(-24), entries])
    setRedoStack([])
  }

  const handleUndo = async () => {
    if (undoStack.length === 0) return
    const prevSnapshot = undoStack[undoStack.length - 1]
    setRedoStack((r) => [...r, entries])
    setUndoStack((u) => u.slice(0, -1))
    await fetch('/api/timetable/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_restore', entries: prevSnapshot }),
    })
    await fetchEntries()
  }

  const handleRedo = async () => {
    if (redoStack.length === 0) return
    const nextSnapshot = redoStack[redoStack.length - 1]
    setUndoStack((u) => [...u, entries])
    setRedoStack((r) => r.slice(0, -1))
    await fetch('/api/timetable/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_restore', entries: nextSnapshot }),
    })
    await fetchEntries()
  }

  // Build client-side TimetableContext for live aSc Green/Blue/Gray slot highlighting
  const engineContext: TimetableContext = useMemo(() => {
    const lessons: EngineLesson[] = allocations.map((a) => ({
      id: a.id,
      class_id: a.class_id,
      subject_id: a.subject_id,
      subject_name: a.subjects?.name || 'Subject',
      teacher_id: a.teacher_id,
      teacher_name: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}`.trim() : 'Teacher',
      periods_per_week: a.periods_per_week,
      periods_per_card: a.periods_per_card || 1,
      group_id: a.group_id || null,
      allowed_classroom_ids: a.allowed_classroom_ids || [],
      joint_class_ids: a.joint_class_ids || [],
      co_teacher_ids: a.co_teacher_ids || [],
      color: a.color || null,
    }))

    const tcMap: Record<string, TeacherConstraint> = {}
    teacherConstraints.forEach((t) => { tcMap[t.teacher_id] = t })
    const ccMap: Record<string, ClassConstraint> = {}
    classConstraints.forEach((c) => { ccMap[c.class_id] = c })
    const scMap: Record<string, SubjectConstraint> = {}
    subjectConstraints.forEach((s) => { scMap[s.subject_id] = s })

    const mappedEntries: EngineEntry[] = entries.map((e) => ({
      id: e.id,
      class_id: e.class_id,
      class_subject_id: e.class_subject_id,
      day_of_week: e.day_of_week,
      slot_id: e.slot_id,
      classroom_id: e.classroom_id,
      room: e.room,
      group_id: e.group_id,
      is_locked: e.is_locked,
      week_code: e.week_code,
      card_group_id: e.card_group_id,
    }))

    return {
      slots,
      lessons,
      existingEntries: mappedEntries,
      buildings,
      classrooms,
      groups,
      teacherConstraints: tcMap,
      classConstraints: ccMap,
      subjectConstraints: scMap,
      cardRelationships,
      settings,
    }
  }, [allocations, entries, slots, buildings, classrooms, groups, teacherConstraints, classConstraints, subjectConstraints, cardRelationships, settings])

  // Determine active card in hand (either dragged existing entry or clicked unplaced card)
  const activeHandLesson = useMemo(() => {
    if (draggedEntryId) {
      const ent = entries.find((e) => e.id === draggedEntryId)
      if (ent) return engineContext.lessons.find((l) => l.id === ent.class_subject_id) || null
    }
    if (selectedUnplacedAllocId) {
      return engineContext.lessons.find((l) => l.id === selectedUnplacedAllocId) || null
    }
    return null
  }, [draggedEntryId, selectedUnplacedAllocId, entries, engineContext.lessons])

  // Unplaced cards for current class (aSc bottom dock!)
  const classAllocations = useMemo(() => allocations.filter((a) => a.class_id === selectedClassId), [allocations, selectedClassId])

  const unplacedForClass = useMemo(() => {
    return classAllocations
      .map((a) => {
        const placedCount = entries.filter((e) => e.class_subject_id === a.id).length
        const remaining = Math.max(0, (a.periods_per_week || 0) - placedCount)
        return { alloc: a, placedCount, remaining }
      })
      .filter((x) => x.remaining > 0)
  }, [classAllocations, entries])

  // AI slot parser
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
          total_periods: totalPeriods,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots || [])
      }
    } finally {
      setSavingSlots(false)
    }
  }

  const handleOpenSlotEditor = () => {
    setEditingSlots(slots.map((s) => ({ ...s })))
    setShowSlotEditor(true)
  }

  const handleSaveManualSlots = async () => {
    setSavingSlots(true)
    try {
      const res = await fetch('/api/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: viewType === 'class' ? selectedClassId : null,
          slots: editingSlots,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots || [])
        setShowSlotEditor(false)
      }
    } finally {
      setSavingSlots(false)
    }
  }

  // Save allocations config (PUT)
  const handleSaveAllocations = async (list: Allocation[]) => {
    setUpdatingPeriods(true)
    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: list.map((a) => ({
            id: a.id,
            periods_per_week: a.periods_per_week,
            periods_per_card: a.periods_per_card || 1,
            group_id: a.group_id || null,
            allowed_classroom_ids: a.allowed_classroom_ids || [],
            joint_class_ids: a.joint_class_ids || [],
            co_teacher_ids: a.co_teacher_ids || [],
            color: a.color || null,
          })),
        }),
      })
      if (res.ok) {
        setAllocations((prev) =>
          prev.map((p) => list.find((u) => u.id === p.id) || p)
        )
      }
    } finally {
      setUpdatingPeriods(false)
    }
  }

  // Test Timetable Feasibility (aSc "Test" command)
  const handleTestTimetable = async (scope: 'class' | 'all') => {
    setTestingTimetable(true)
    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', scope, class_id: scope === 'class' ? selectedClassId : undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setDiagnostics(data.diagnostics || [])
      }
    } finally {
      setTestingTimetable(false)
    }
  }

  // Generate Timetable (Single Class or Whole School, preserving locked cards)
  const handleAutoGenerateTimetable = async (scope: 'class' | 'all') => {
    const label = scope === 'all' ? 'the ENTIRE SCHOOL' : 'this class'
    if (!confirm(`Generate timetable for ${label}? Locked cards will be preserved; unlocked cards will be re-optimized.`)) return
    pushUndoSnapshot()
    setGeneratingTimetable(true)
    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          scope,
          class_id: scope === 'class' ? selectedClassId : undefined,
          auto_relax: settings.auto_relax_constraints,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchEntries()
        setLastGenReport({
          assigned: data.assigned || 0,
          unassigned: data.unassigned || 0,
          unplacedCards: data.unplacedCards || [],
          relaxationsApplied: data.relaxationsApplied || [],
          stats: data.stats || { totalTeacherWindows: 0, maxTeacherWindows: 0, teachersWithWindows: 0, lockedPreserved: 0 },
        })
        if (data.diagnostics?.length) setDiagnostics(data.diagnostics)
      } else {
        alert(data.error || 'Failed to generate timetable')
      }
    } finally {
      setGeneratingTimetable(false)
    }
  }

  const handleToggleLock = async (entryId: string) => {
    const res = await fetch('/api/timetable/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_lock', entry_id: entryId }),
    })
    if (res.ok) await fetchEntries()
  }

  const handleSaveEntry = async (force: boolean = false) => {
    if (!modalCell || !selectedAllocId) return
    pushUndoSnapshot()
    setSavingEntry(true)
    try {
      const alloc = allocations.find((a) => a.id === selectedAllocId)
      const res = await fetch('/api/timetable/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: viewType === 'class' ? selectedClassId : alloc?.class_id,
          class_subject_id: selectedAllocId,
          day_of_week: modalCell.day,
          slot_id: modalCell.slot.id,
          classroom_id: selectedRoomForEntry || null,
          room: roomText || null,
          force,
        }),
      })
      if (res.ok) {
        await fetchEntries()
        setShowScheduleModal(false)
        setConflictWarning(null)
      } else {
        const data = await res.json()
        if (res.status === 409) setConflictWarning(data.error)
        else alert(data.error || 'Failed to save entry')
      }
    } finally {
      setSavingEntry(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    pushUndoSnapshot()
    const res = await fetch(`/api/timetable/entries?id=${entryId}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchEntries()
      setShowScheduleModal(false)
    }
  }

  const handleMoveEntry = async (entryId: string, targetDay: string, targetSlotId: string, force: boolean = false) => {
    pushUndoSnapshot()
    const res = await fetch('/api/timetable/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, day_of_week: targetDay, slot_id: targetSlotId, force }),
    })
    if (res.ok) {
      await fetchEntries()
      setDropConflict(null)
    } else {
      const data = await res.json()
      if (res.status === 409) {
        setDropConflict({ entryId, day: targetDay, slotId: targetSlotId, message: data.error })
      } else {
        alert(data.error || 'Failed to move entry')
      }
    }
  }

  const handlePlaceUnplacedCard = async (allocId: string, day: string, slotId: string) => {
    const alloc = allocations.find((a) => a.id === allocId)
    if (!alloc) return
    pushUndoSnapshot()
    const res = await fetch('/api/timetable/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: alloc.class_id,
        class_subject_id: alloc.id,
        day_of_week: day,
        slot_id: slotId,
      }),
    })
    if (res.ok) {
      setSelectedUnplacedAllocId(null)
      await fetchEntries()
    } else {
      const data = await res.json()
      alert(data.error || 'Cannot place card here')
    }
  }

  const getCardColor = (entry: TimetableEntry): string => {
    if (colorBy === 'teacher') {
      const tid = entry.class_subjects?.teacher_id || ''
      const tc = teacherConstraints.find((t) => t.teacher_id === tid)
      return tc?.color || hashColor(tid || 'teacher')
    }
    const sid = entry.class_subjects?.subject_id || ''
    const sc = subjectConstraints.find((s) => s.subject_id === sid)
    return entry.class_subjects?.color || sc?.color || hashColor(entry.class_subjects?.subjects?.name || sid || 'sub')
  }

  const currentClassName = useMemo(() => {
    const cls = classes.find((c) => c.id === selectedClassId)
    return cls ? `${cls.name} ${cls.section || ''}`.trim() : ''
  }, [classes, selectedClassId])

  const currentTeacherName = useMemo(() => {
    const t = teachers.find((teach) => teach.id === selectedTeacherId)
    return t ? `${t.first_name} ${t.last_name}` : ''
  }, [teachers, selectedTeacherId])

  const openScheduler = (day: string, slot: Slot) => {
    if (selectedUnplacedAllocId) {
      handlePlaceUnplacedCard(selectedUnplacedAllocId, day, slot.id)
      return
    }
    setModalCell({ day, slot })
    const targetEntry = entries.find(
      (e) =>
        e.day_of_week.toLowerCase() === day.toLowerCase() &&
        e.slot_id === slot.id &&
        (viewType === 'class' ? e.class_id === selectedClassId : true)
    )
    if (targetEntry) {
      setSelectedAllocId(targetEntry.class_subject_id)
      setSelectedRoomForEntry(targetEntry.classroom_id || '')
      setRoomText(targetEntry.room || '')
    } else {
      setSelectedAllocId(classAllocations[0]?.id || '')
      setSelectedRoomForEntry('')
      setRoomText('')
    }
    setConflictWarning(null)
    setShowScheduleModal(true)
  }

  const isGridView = viewType === 'class' || viewType === 'teacher' || viewType === 'classroom'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* 1. Top aSc-style Command Bar */}
      <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid rgba(30,58,138,0.15)', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* View Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'class', label: 'Class View', icon: <Calendar size={14} /> },
              { id: 'teacher', label: 'Teacher View', icon: <Users size={14} /> },
              { id: 'classroom', label: 'Room View', icon: <DoorOpen size={14} /> },
              { id: 'summary', label: 'Master Summary', icon: <Calendar size={14} /> },
              { id: 'constraints', label: 'Constraints & Time-Off', icon: <Sliders size={14} /> },
              { id: 'substitutions', label: 'Substitutions', icon: <UserCheck size={14} /> },
              { id: 'supervisions', label: 'Supervisions', icon: <Shield size={14} /> },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewType(v.id as typeof viewType)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewType === v.id ? '#00264b' : '#f1f5f9',
                  color: viewType === v.id ? '#fff' : '#334155',
                }}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>

          {/* Right Action Cluster: Undo/Redo, Zoom, Color, Resources, Versions */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={handleUndo} disabled={undoStack.length === 0} title="Undo" style={{ padding: '0.4rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: undoStack.length ? 'pointer' : 'not-allowed', opacity: undoStack.length ? 1 : 0.45 }}>
              <Undo2 size={15} />
            </button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo" style={{ padding: '0.4rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: redoStack.length ? 'pointer' : 'not-allowed', opacity: redoStack.length ? 1 : 0.45 }}>
              <Redo2 size={15} />
            </button>
            <button onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.1).toFixed(2)))} title="Zoom Out" style={{ padding: '0.4rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
              <ZoomOut size={15} />
            </button>
            <button onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))} title="Zoom In" style={{ padding: '0.4rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => setColorBy((c) => (c === 'subject' ? 'teacher' : 'subject'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Palette size={14} /> Color: {colorBy === 'subject' ? 'Subject' : 'Teacher'}
            </button>
            <button
              onClick={() => setShowResourcesModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #00264b', background: '#eff6ff', color: '#00264b', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Building2 size={14} /> Rooms, Groups &amp; Setup
            </button>
            <button
              onClick={() => setShowVersionsModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <History size={14} /> Versions ({versions.length})
            </button>
          </div>
        </div>

        {/* Selector + Test + Generate + Export Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {viewType === 'class' && (
              <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem' }}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
              </select>
            )}
            {viewType === 'teacher' && (
              <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem' }}>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            )}
            {viewType === 'classroom' && (
              <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem' }}>
                {classrooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}

            <button
              onClick={() => handleTestTimetable(viewType === 'class' ? 'class' : 'all')}
              disabled={testingTimetable}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {testingTimetable ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              Test Timetable
            </button>

            {viewType === 'class' && (
              <button
                onClick={() => handleAutoGenerateTimetable('class')}
                disabled={generatingTimetable}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', borderRadius: '6px', border: 'none', background: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {generatingTimetable ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate Class
              </button>
            )}

            <button
              onClick={() => handleAutoGenerateTimetable('all')}
              disabled={generatingTimetable}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', borderRadius: '6px', border: 'none', background: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {generatingTimetable ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Generate Whole School
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <a
              href={`/api/timetable/pdf?${viewType === 'teacher' ? `teacher_id=${selectedTeacherId}` : viewType === 'class' ? `class_id=${selectedClassId}` : ''}`}
              target="_blank"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.42rem 0.75rem', borderRadius: '6px', background: '#00264b', color: '#fff', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <FileDown size={14} /> PDF
            </a>
            <a
              href="/api/timetable/export?format=xml"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.42rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <Download size={14} /> aSc XML
            </a>
            <a
              href="/api/timetable/export?format=csv"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.42rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <Download size={14} /> Excel CSV
            </a>
          </div>
        </div>
      </div>

      {/* Diagnostics Banner */}
      {diagnostics && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', border: diagnostics.some((d) => d.severity === 'error') ? '1px solid #fca5a5' : '1px solid #86efac', backgroundColor: diagnostics.some((d) => d.severity === 'error') ? '#fef2f2' : '#f0fdf4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: diagnostics.length ? '0.5rem' : 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: diagnostics.some((d) => d.severity === 'error') ? '#991b1b' : '#166534' }}>
              {diagnostics.length === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {diagnostics.length === 0 ? 'Test Passed: Timetable constraints are feasible!' : `Test Found ${diagnostics.length} Diagnostic(s)`}
            </div>
            <button onClick={() => setDiagnostics(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={16} /></button>
          </div>
          {diagnostics.map((d, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: d.severity === 'error' ? '#b91c1c' : '#92400e', marginTop: '0.2rem' }}>
              • [{d.severity.toUpperCase()}] {d.message}
            </div>
          ))}
        </div>
      )}

      {/* Generation Quality & Unplaced Report */}
      {lastGenReport && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
              Generation Complete: {lastGenReport.assigned} period(s) placed, {lastGenReport.unassigned} unplaced • Teacher Windows: {lastGenReport.stats.totalTeacherWindows} (max {lastGenReport.stats.maxTeacherWindows}) • Locked Preserved: {lastGenReport.stats.lockedPreserved}
            </div>
            <button onClick={() => setLastGenReport(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={16} /></button>
          </div>
          {lastGenReport.relaxationsApplied.map((r, i) => (
            <div key={i} style={{ color: '#1d4ed8', marginTop: '0.25rem' }}>Note: {r}</div>
          ))}
          {lastGenReport.unplacedCards.length > 0 && (
            <div style={{ marginTop: '0.4rem', color: '#991b1b' }}>
              <strong>Unplaced Cards:</strong> {lastGenReport.unplacedCards.map((c) => `${c.subject_name} (${c.card_length}p: ${c.reasons[0] || 'conflict'})`).join(' | ')}
            </div>
          )}
        </div>
      )}

      {/* Sub-Views: Constraints / Substitutions / Supervisions */}
      {viewType === 'constraints' && (
        <ConstraintsPanel
          classes={classes}
          teachers={teachers}
          subjects={subjects}
          allocations={allocations}
          slots={slots}
          days={daysOfWeek}
          classrooms={classrooms}
          groups={groups}
          teacherConstraints={teacherConstraints}
          classConstraints={classConstraints}
          subjectConstraints={subjectConstraints}
          cardRelationships={cardRelationships}
          onRefreshConfig={fetchConfig}
          onUpdateAllocation={handleSaveAllocations}
        />
      )}

      {viewType === 'substitutions' && (
        <SubstitutionsPanel
          teachers={teachers}
          slots={slots}
          entries={entries}
          substitutions={substitutions}
          onRefreshConfig={fetchConfig}
        />
      )}

      {viewType === 'supervisions' && (
        <SupervisionsPanel
          days={daysOfWeek}
          slots={slots}
          teachers={teachers}
          supervisions={supervisions}
          onRefreshConfig={fetchConfig}
        />
      )}

      {/* Main Grid Views (Class / Teacher / Classroom) */}
      {isGridView && (
        <>
          {/* AI Bell Schedule Bar */}
          <div className="glass-panel" style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00264b' }}>Bell Schedule:</span>
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              style={{ flex: 1, minWidth: '260px', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
            />
            <input
              type="number"
              min={1}
              max={14}
              value={totalPeriods}
              onChange={(e) => setTotalPeriods(Number(e.target.value))}
              style={{ width: '58px', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
            />
            <button onClick={handleAiSlotParse} disabled={savingSlots} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: '#00264b', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {savingSlots ? 'Parsing...' : 'Generate Slots'}
            </button>
            <button onClick={handleOpenSlotEditor} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              <Edit3 size={13} /> Edit Slots
            </button>
          </div>

          {/* Unplaced Cards Dock (aSc "Hand" UX) */}
          {viewType === 'class' && unplacedForClass.length > 0 && (
            <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px dashed #3b82f6', backgroundColor: '#f8fafc', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e3a8a', marginRight: '0.25rem' }}>
                Unplaced Cards (Click to pick up &amp; see Green/Blue/Gray slots):
              </span>
              {unplacedForClass.map(({ alloc, remaining }) => {
                const isSelected = selectedUnplacedAllocId === alloc.id
                return (
                  <button
                    key={alloc.id}
                    onClick={() => setSelectedUnplacedAllocId(isSelected ? null : alloc.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      border: isSelected ? '2px solid #00264b' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#dbeafe' : '#fff',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{alloc.subjects?.name || 'Subject'}</span>
                    <span style={{ background: '#00264b', color: '#fff', borderRadius: '999px', padding: '0 6px', fontSize: '0.7rem' }}>
                      {remaining}
                    </span>
                  </button>
                )
              })}
              {selectedUnplacedAllocId && (
                <button onClick={() => setSelectedUnplacedAllocId(null)} style={{ marginLeft: 'auto', fontSize: '0.75rem', border: 'none', background: 'transparent', color: '#dc2646', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel Hand
                </button>
              )}
            </div>
          )}

          {/* Timetable Grid */}
          <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading timetable...</div>
            ) : slots.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No period slots configured yet. Use the Bell Schedule bar above to generate slots.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: `${0.82 * zoom}rem` }}>
                <thead>
                  <tr style={{ backgroundColor: '#00264b', color: '#fff' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', width: '105px' }}>
                      {viewType === 'class' ? currentClassName : viewType === 'teacher' ? currentTeacherName : 'Room'}
                    </th>
                    {slots.map((slot) => (
                      <th key={slot.id} style={{ padding: '0.6rem 0.4rem', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
                        <div style={{ fontWeight: 700 }}>{slot.name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day) => (
                    <tr key={day} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.7rem', fontWeight: 700, backgroundColor: '#f8fafc', color: '#0f172a' }}>{day}</td>
                      {slots.map((slot) => {
                        if (slot.is_break) {
                          return (
                            <td key={slot.id} style={{ backgroundColor: '#f1f5f9', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', borderLeft: '1px solid #e2e8f0' }}>
                              {slot.name.toUpperCase()}
                            </td>
                          )
                        }

                        const cellEntries = entries.filter((e) => {
                          if (e.day_of_week !== day || e.slot_id !== slot.id) return false
                          if (viewType === 'class') return e.class_id === selectedClassId
                          if (viewType === 'teacher') return e.class_subjects?.teacher_id === selectedTeacherId
                          return e.classroom_id === selectedRoomId
                        })

                        // Live aSc Green/Blue/Gray slot evaluation when a card is in hand!
                        let slotHighlightBg = 'transparent'
                        let slotHighlightTitle = ''
                        if (activeHandLesson) {
                          const evalRes = evaluateSlotForLesson(engineContext, activeHandLesson, day, slot.id, engineContext.existingEntries, {
                            ignoreEntryIds: draggedEntryId ? new Set([draggedEntryId]) : undefined,
                          })
                          if (evalRes.status === 'good') {
                            slotHighlightBg = 'rgba(34, 197, 94, 0.16)'
                            slotHighlightTitle = 'Good slot'
                          } else if (evalRes.status === 'questionable') {
                            slotHighlightBg = 'rgba(59, 130, 246, 0.16)'
                            slotHighlightTitle = evalRes.reasons.join('; ')
                          } else {
                            slotHighlightBg = 'rgba(148, 163, 184, 0.22)'
                            slotHighlightTitle = evalRes.reasons.join('; ')
                          }
                        }

                        return (
                          <td
                            key={slot.id}
                            title={slotHighlightTitle}
                            onClick={() => openScheduler(day, slot)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              const entryId = e.dataTransfer.getData('text/plain')
                              if (entryId) handleMoveEntry(entryId, day, slot.id)
                              setDraggedEntryId(null)
                            }}
                            style={{
                              padding: `${0.35 * zoom}rem`,
                              borderLeft: '1px solid #e2e8f0',
                              verticalAlign: 'top',
                              minHeight: `${68 * zoom}px`,
                              height: `${68 * zoom}px`,
                              cursor: 'pointer',
                              backgroundColor: slotHighlightBg,
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {cellEntries.map((ent) => {
                                const cardColor = getCardColor(ent)
                                const roomLabel = ent.timetable_classrooms?.short_name || ent.timetable_classrooms?.name || ent.room
                                return (
                                  <div
                                    key={ent.id}
                                    draggable={!ent.is_locked}
                                    onDragStart={(e) => {
                                      e.stopPropagation()
                                      setDraggedEntryId(ent.id)
                                      e.dataTransfer.setData('text/plain', ent.id)
                                    }}
                                    onDragEnd={() => setDraggedEntryId(null)}
                                    style={{
                                      padding: `${0.35 * zoom}rem`,
                                      borderRadius: '6px',
                                      backgroundColor: `${cardColor}18`,
                                      borderLeft: `4px solid ${cardColor}`,
                                      position: 'relative',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: `${0.76 * zoom}rem` }}>
                                        {ent.class_subjects?.subjects?.name || 'Subject'}
                                      </span>
                                      <button
                                        title={ent.is_locked ? 'Unlock card' : 'Lock card'}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleToggleLock(ent.id)
                                        }}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: ent.is_locked ? '#b45309' : '#94a3b8' }}
                                      >
                                        {ent.is_locked ? <Lock size={12} /> : <Unlock size={12} />}
                                      </button>
                                    </div>
                                    <div style={{ fontSize: `${0.68 * zoom}rem`, color: '#475569' }}>
                                      {viewType === 'teacher'
                                        ? `${ent.classes?.name || ''} ${ent.classes?.section || ''}`.trim()
                                        : `${ent.class_subjects?.profiles?.first_name || ''} ${ent.class_subjects?.profiles?.last_name || ''}`.trim()}
                                    </div>
                                    {(roomLabel || ent.timetable_groups) && (
                                      <div style={{ fontSize: `${0.64 * zoom}rem`, color: '#64748b', marginTop: '2px' }}>
                                        {ent.timetable_groups ? `[${ent.timetable_groups.group_name}] ` : ''}
                                        {roomLabel ? `Room: ${roomLabel}` : ''}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
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
        </>
      )}

      {/* Master Summary View */}
      {viewType === 'summary' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontWeight: 700, color: '#00264b' }}>Master School Timetable ({entries.length} scheduled lessons)</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#00264b', color: '#fff' }}>
                <th style={{ padding: '0.55rem', textAlign: 'left' }}>Class</th>
                {daysOfWeek.map((d) => <th key={d} style={{ padding: '0.55rem', textAlign: 'left' }}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.55rem', fontWeight: 700 }}>{c.name} {c.section || ''}</td>
                  {daysOfWeek.map((d) => {
                    const dayEntries = entries.filter((e) => e.class_id === c.id && e.day_of_week === d)
                    return (
                      <td key={d} style={{ padding: '0.45rem', verticalAlign: 'top' }}>
                        {dayEntries.map((e) => (
                          <div key={e.id} style={{ fontSize: '0.72rem', marginBottom: '2px' }}>
                            <strong>{slots.find((s) => s.id === e.slot_id)?.name}:</strong> {e.class_subjects?.subjects?.name}
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drop Conflict Override Toast */}
      {dropConflict && (
        <div style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 70, backgroundColor: '#fff', border: '2px solid #ef4444', borderRadius: '10px', padding: '0.9rem 1.1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxWidth: '380px' }}>
          <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <ShieldAlert size={15} style={{ display: 'inline', marginRight: '5px' }} /> Conflict Detected
          </div>
          <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '0.65rem' }}>{dropConflict.message}</div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setDropConflict(null)} style={{ padding: '0.35rem 0.7rem', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => handleMoveEntry(dropConflict.entryId, dropConflict.day, dropConflict.slotId, true)} style={{ padding: '0.35rem 0.7rem', borderRadius: '5px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Force Move</button>
          </div>
        </div>
      )}

      {/* Schedule Cell Modal */}
      {showScheduleModal && modalCell && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#00264b' }}>
                Schedule: {modalCell.day} — {modalCell.slot.name}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {conflictWarning && (
              <div style={{ padding: '0.65rem', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {conflictWarning}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>Subject &amp; Teacher</label>
                <select value={selectedAllocId} onChange={(e) => setSelectedAllocId(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}>
                  {(viewType === 'class' ? classAllocations : allocations).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.subjects?.name} ({a.profiles?.first_name} {a.profiles?.last_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>Classroom</label>
                <select value={selectedRoomForEntry} onChange={(e) => setSelectedRoomForEntry(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}>
                  <option value="">None / Custom</option>
                  {classrooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>Custom Room Note (optional)</label>
                <input value={roomText} onChange={(e) => setRoomText(e.target.value)} placeholder="e.g. Lab 2" style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', gap: '0.5rem' }}>
              {(() => {
                const existing = entries.find(
                  (e) => e.day_of_week === modalCell.day && e.slot_id === modalCell.slot.id && (viewType === 'class' ? e.class_id === selectedClassId : true)
                )
                return existing ? (
                  <button onClick={() => handleDeleteEntry(existing.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.75rem', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <Trash2 size={14} /> Remove
                  </button>
                ) : <div />
              })()}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {conflictWarning && (
                  <button onClick={() => handleSaveEntry(true)} disabled={savingEntry} style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Force Assign
                  </button>
                )}
                <button onClick={() => handleSaveEntry(false)} disabled={savingEntry} style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: 'none', background: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                  {savingEntry ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Slot Editor Modal */}
      {showSlotEditor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#00264b' }}>Edit Bell Schedule Slots</h3>
              <button onClick={() => setShowSlotEditor(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {editingSlots.map((s, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 90px 70px 36px', gap: '0.4rem', alignItems: 'center' }}>
                  <input type="number" value={s.period_number} onChange={(e) => setEditingSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, period_number: Number(e.target.value) } : x)))} style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <input value={s.name} onChange={(e) => setEditingSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <input type="time" value={s.start_time.slice(0, 5)} onChange={(e) => setEditingSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, start_time: e.target.value } : x)))} style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <input type="time" value={s.end_time.slice(0, 5)} onChange={(e) => setEditingSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, end_time: e.target.value } : x)))} style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <input type="checkbox" checked={s.is_break} onChange={(e) => setEditingSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, is_break: e.target.checked } : x)))} /> Break
                  </label>
                  <button onClick={() => setEditingSlots((prev) => prev.filter((_, i) => i !== idx))} style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer' }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button onClick={() => setEditingSlots((prev) => [...prev, { period_number: prev.length + 1, name: `Period ${prev.length + 1}`, start_time: '08:00', end_time: '08:40', is_break: false }])} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                + Add Slot
              </button>
              <button onClick={handleSaveManualSlots} disabled={savingSlots} style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: 'none', background: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                Save Slots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Versions Modal */}
      {showVersionsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#00264b' }}>Timetable Versions &amp; Snapshots</h3>
              <button onClick={() => setShowVersionsModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input placeholder="Version name (e.g. Term 1 Final)" value={newVersionName} onChange={(e) => setNewVersionName(e.target.value)} style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
              <button
                disabled={!newVersionName.trim()}
                onClick={async () => {
                  await fetch('/api/timetable/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entity: 'version', action: 'save_version', payload: { name: newVersionName } }),
                  })
                  setNewVersionName('')
                  await fetchConfig()
                }}
                style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none', background: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Save Snapshot
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {versions.map((v) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{v.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(v.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={async () => {
                        if (!confirm(`Restore "${v.name}"? This replaces the current timetable.`)) return
                        await fetch('/api/timetable/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ entity: 'version', action: 'restore_version', id: v.id }),
                        })
                        await fetchEntries()
                        setShowVersionsModal(false)
                      }}
                      style={{ padding: '0.3rem 0.65rem', borderRadius: '5px', border: 'none', background: '#059669', color: '#fff', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={async () => {
                        await fetch('/api/timetable/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ entity: 'version', action: 'delete', id: v.id }),
                        })
                        await fetchConfig()
                      }}
                      style={{ padding: '0.3rem 0.45rem', borderRadius: '5px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {versions.length === 0 && <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.82rem', padding: '1rem' }}>No saved versions yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Resources & Settings Modal */}
      {showResourcesModal && (
        <ResourcesManagerModal
          classes={classes}
          slots={slots}
          buildings={buildings}
          classrooms={classrooms}
          groups={groups}
          settings={settings}
          onRefreshConfig={fetchConfig}
          onClose={() => setShowResourcesModal(false)}
        />
      )}
    </div>
  )
}
