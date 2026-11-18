'use client'

import { useState } from 'react'
import { Clock, Plus, Trash2, Link2, Save, Sliders } from 'lucide-react'
import type {
  CardRelationType,
  CardRelationship,
  ClassConstraint,
  EngineClassroom,
  EngineGroup,
  EngineSlot,
  SubjectConstraint,
  TeacherConstraint,
  TimeOffMap,
} from '@/lib/timetableEngine'
import TimeOffMatrixModal from './TimeOffMatrixModal'

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
  color?: string | null
  profiles?: { first_name: string; last_name: string }
  subjects?: { name: string }
}

interface ConstraintsPanelProps {
  classes: ClassItem[]
  teachers: Teacher[]
  subjects: SubjectItem[]
  allocations: Allocation[]
  slots: EngineSlot[]
  days: string[]
  classrooms: EngineClassroom[]
  groups: EngineGroup[]
  teacherConstraints: TeacherConstraint[]
  classConstraints: ClassConstraint[]
  subjectConstraints: SubjectConstraint[]
  cardRelationships: CardRelationship[]
  onRefreshConfig: () => Promise<void>
  onUpdateAllocation: (allocs: Allocation[]) => Promise<void>
}

export default function ConstraintsPanel({
  classes,
  teachers,
  subjects,
  allocations,
  slots,
  days,
  classrooms,
  groups,
  teacherConstraints,
  classConstraints,
  subjectConstraints,
  cardRelationships,
  onRefreshConfig,
  onUpdateAllocation,
}: ConstraintsPanelProps) {
  const [subTab, setSubTab] = useState<'teachers' | 'classes' | 'subjects' | 'lessons' | 'relationships'>('teachers')
  const [saving, setSaving] = useState(false)

  // TimeOff modal target
  const [timeOffModal, setTimeOffModal] = useState<{
    title: string
    initial: TimeOffMap
    onSave: (next: TimeOffMap) => Promise<void>
  } | null>(null)

  // Relationship builder
  const [relType, setRelType] = useState<CardRelationType>('not_same_day')
  const [relImp, setRelImp] = useState<'strict' | 'normal' | 'relaxed'>('strict')
  const [relSubA, setRelSubA] = useState(subjects[0]?.id || '')
  const [relSubB, setRelSubB] = useState(subjects[1]?.id || subjects[0]?.id || '')
  const [relClassId, setRelClassId] = useState('')

  // Lesson filter
  const [lessonClassId, setLessonClassId] = useState(classes[0]?.id || '')

  const upsertConfig = async (entity: string, payload: Record<string, unknown>, id?: string, action = 'upsert') => {
    setSaving(true)
    try {
      await fetch('/api/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, action, id, payload }),
      })
      await onRefreshConfig()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {[
          { id: 'teachers', label: 'Teacher Constraints & Time-Off' },
          { id: 'classes', label: 'Class Constraints & Time-Off' },
          { id: 'subjects', label: 'Subject Constraints & Time-Off' },
          { id: 'lessons', label: 'Lesson Cards (Doubles, Groups, Rooms)' },
          { id: 'relationships', label: `Card Relationships (${cardRelationships.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as typeof subTab)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: subTab === t.id ? '#00264b' : '#e2e8f0',
              color: subTab === t.id ? '#fff' : '#1e293b',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. Teacher Constraints */}
      {subTab === 'teachers' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '820px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Teacher</th>
                <th style={{ padding: '0.5rem' }}>Max Windows/Day</th>
                <th style={{ padding: '0.5rem' }}>Max Consec.</th>
                <th style={{ padding: '0.5rem' }}>Max Periods/Day</th>
                <th style={{ padding: '0.5rem' }}>Max Days/Wk</th>
                <th style={{ padding: '0.5rem' }}>Can Sub?</th>
                <th style={{ padding: '0.5rem' }}>Color</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Time-Off</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => {
                const tc = teacherConstraints.find((x) => x.teacher_id === t.id) || { teacher_id: t.id, can_substitute: true }
                return (
                  <tr key={t.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{t.first_name} {t.last_name}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min={0}
                        defaultValue={tc.max_windows_per_day ?? ''}
                        placeholder="∞"
                        onBlur={(e) => upsertConfig('teacher_constraint', { ...tc, teacher_id: t.id, max_windows_per_day: e.target.value })}
                        style={{ width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        defaultValue={tc.max_consecutive_periods ?? ''}
                        placeholder="∞"
                        onBlur={(e) => upsertConfig('teacher_constraint', { ...tc, teacher_id: t.id, max_consecutive_periods: e.target.value })}
                        style={{ width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        defaultValue={tc.max_periods_per_day ?? ''}
                        placeholder="∞"
                        onBlur={(e) => upsertConfig('teacher_constraint', { ...tc, teacher_id: t.id, max_periods_per_day: e.target.value })}
                        style={{ width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        defaultValue={tc.max_days_per_week ?? ''}
                        placeholder="All"
                        onBlur={(e) => upsertConfig('teacher_constraint', { ...tc, teacher_id: t.id, max_days_per_week: e.target.value })}
                        style={{ width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={tc.can_substitute !== false}
                        onChange={(e) => upsertConfig('teacher_constraint', { ...tc, teacher_id: t.id, can_substitute: e.target.checked })}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="color"
                        value={tc.color || '#3b82f6'}
                        onChange={(e) => upsertConfig('teacher_constraint', { ...tc, teacher_id: t.id, color: e.target.value })}
                        style={{ width: '32px', height: '24px', border: 'none', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() =>
                          setTimeOffModal({
                            title: `Teacher: ${t.first_name} ${t.last_name}`,
                            initial: (tc.time_off || {}) as TimeOffMap,
                            onSave: async (next) => {
                              await upsertConfig('teacher_constraint', { ...tc, teacher_id: t.id, time_off: next })
                            },
                          })
                        }
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Clock size={12} /> Time-Off ({Object.keys(tc.time_off || {}).length})
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Class Constraints */}
      {subTab === 'classes' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '720px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Class</th>
                <th style={{ padding: '0.5rem' }}>Home Classroom</th>
                <th style={{ padding: '0.5rem' }}>Max Periods/Day</th>
                <th style={{ padding: '0.5rem' }}>Allow Gaps?</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Time-Off</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                const cc = classConstraints.find((x) => x.class_id === c.id) || { class_id: c.id, allow_gaps: false }
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{c.name} {c.section || ''}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        value={cc.home_classroom_id || ''}
                        onChange={(e) => upsertConfig('class_constraint', { ...cc, class_id: c.id, home_classroom_id: e.target.value || null })}
                        style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">None</option>
                        {classrooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        defaultValue={cc.max_periods_per_day ?? ''}
                        placeholder="All"
                        onBlur={(e) => upsertConfig('class_constraint', { ...cc, class_id: c.id, max_periods_per_day: e.target.value })}
                        style={{ width: '65px', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(cc.allow_gaps)}
                        onChange={(e) => upsertConfig('class_constraint', { ...cc, class_id: c.id, allow_gaps: e.target.checked })}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() =>
                          setTimeOffModal({
                            title: `Class: ${c.name} ${c.section || ''}`,
                            initial: (cc.time_off || {}) as TimeOffMap,
                            onSave: async (next) => {
                              await upsertConfig('class_constraint', { ...cc, class_id: c.id, time_off: next })
                            },
                          })
                        }
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Clock size={12} /> Time-Off ({Object.keys(cc.time_off || {}).length})
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Subject Constraints */}
      {subTab === 'subjects' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '720px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Subject</th>
                <th style={{ padding: '0.5rem' }}>Max Periods/Day</th>
                <th style={{ padding: '0.5rem' }}>Preferred Room</th>
                <th style={{ padding: '0.5rem' }}>Color</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Time-Off</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub) => {
                const sc = subjectConstraints.find((x) => x.subject_id === sub.id) || { subject_id: sub.id, max_per_day: 1 }
                return (
                  <tr key={sub.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{sub.name}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        defaultValue={sc.max_per_day ?? 1}
                        onBlur={(e) => upsertConfig('subject_constraint', { ...sc, subject_id: sub.id, max_per_day: Number(e.target.value || 1) })}
                        style={{ width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        value={sc.preferred_classroom_ids?.[0] || ''}
                        onChange={(e) => upsertConfig('subject_constraint', { ...sc, subject_id: sub.id, preferred_classroom_ids: e.target.value ? [e.target.value] : [] })}
                        style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">Any Room</option>
                        {classrooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="color"
                        value={sc.color || '#0ea5e9'}
                        onChange={(e) => upsertConfig('subject_constraint', { ...sc, subject_id: sub.id, color: e.target.value })}
                        style={{ width: '32px', height: '24px', border: 'none', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() =>
                          setTimeOffModal({
                            title: `Subject: ${sub.name}`,
                            initial: (sc.time_off || {}) as TimeOffMap,
                            onSave: async (next) => {
                              await upsertConfig('subject_constraint', { ...sc, subject_id: sub.id, time_off: next })
                            },
                          })
                        }
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Clock size={12} /> Time-Off ({Object.keys(sc.time_off || {}).length})
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Lesson Cards (periods_per_card, group, allowed_classroom_ids) */}
      {subTab === 'lessons' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={16} color="#00264b" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#00264b' }}>Lesson Properties for Class:</span>
              <select value={lessonClassId} onChange={(e) => setLessonClassId(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Subject</th>
                <th style={{ padding: '0.5rem' }}>Teacher</th>
                <th style={{ padding: '0.5rem' }}>Periods / Wk</th>
                <th style={{ padding: '0.5rem' }}>Card Length (Single/Double/Triple)</th>
                <th style={{ padding: '0.5rem' }}>Class Group</th>
                <th style={{ padding: '0.5rem' }}>Required Room</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Save</th>
              </tr>
            </thead>
            <tbody>
              {allocations
                .filter((a) => a.class_id === lessonClassId)
                .map((a) => {
                  const classGroups = groups.filter((g) => g.class_id === a.class_id)
                  return (
                    <tr key={a.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{a.subjects?.name || 'Subject'}</td>
                      <td style={{ padding: '0.5rem' }}>{a.profiles?.first_name} {a.profiles?.last_name}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          defaultValue={a.periods_per_week}
                          onChange={(e) => { a.periods_per_week = Number(e.target.value) }}
                          style={{ width: '55px', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select
                          defaultValue={a.periods_per_card || 1}
                          onChange={(e) => { a.periods_per_card = Number(e.target.value) }}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value={1}>1 (Single)</option>
                          <option value={2}>2 (Double)</option>
                          <option value={3}>3 (Triple)</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select
                          defaultValue={a.group_id || ''}
                          onChange={(e) => { a.group_id = e.target.value || null }}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="">Entire Class</option>
                          {classGroups.map((g) => <option key={g.id} value={g.id}>{g.division_name}: {g.group_name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select
                          defaultValue={a.allowed_classroom_ids?.[0] || ''}
                          onChange={(e) => { a.allowed_classroom_ids = e.target.value ? [e.target.value] : [] }}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="">Any / Home Room</option>
                          {classrooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <button
                          onClick={() => onUpdateAllocation([a])}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: '5px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Save size={12} /> Save
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Card Relationships */}
      {subTab === 'relationships' && (
        <div className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <select value={relType} onChange={(e) => setRelType(e.target.value as CardRelationType)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
              <option value="not_same_day">Cannot be on same day</option>
              <option value="cannot_follow">Cannot follow consecutively</option>
              <option value="must_be_same_day">Must be on same day</option>
              <option value="even_distribution">Distribute evenly across week</option>
            </select>
            <select value={relSubA} onChange={(e) => setRelSubA(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={relSubB} onChange={(e) => setRelSubB(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={relClassId} onChange={(e) => setRelClassId(e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
            </select>
            <select value={relImp} onChange={(e) => setRelImp(e.target.value as 'strict' | 'normal' | 'relaxed')} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
              <option value="strict">Strict (Hard)</option>
              <option value="normal">Normal (Soft)</option>
              <option value="relaxed">Relaxed</option>
            </select>
            <button
              disabled={saving || !relSubA}
              onClick={() =>
                upsertConfig('card_relationship', {
                  relation_type: relType,
                  importance: relImp,
                  subject_id_a: relSubA,
                  subject_id_b: relSubB,
                  class_id: relClassId || null,
                  is_enabled: true,
                })
              }
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none', backgroundColor: '#00264b', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <Plus size={15} /> Add Rule
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Rule</th>
                <th style={{ padding: '0.5rem' }}>Subject A</th>
                <th style={{ padding: '0.5rem' }}>Subject B</th>
                <th style={{ padding: '0.5rem' }}>Scope</th>
                <th style={{ padding: '0.5rem' }}>Importance</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {cardRelationships.map((r) => {
                const subA = subjects.find((s) => s.id === r.subject_id_a)?.name || '—'
                const subB = subjects.find((s) => s.id === r.subject_id_b)?.name || '—'
                const cls = r.class_id ? classes.find((c) => c.id === r.class_id) : null
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                      <Link2 size={13} style={{ display: 'inline', marginRight: '5px' }} />
                      {r.relation_type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{subA}</td>
                    <td style={{ padding: '0.5rem' }}>{subB}</td>
                    <td style={{ padding: '0.5rem' }}>{cls ? `${cls.name} ${cls.section || ''}` : 'All Classes'}</td>
                    <td style={{ padding: '0.5rem' }}>{r.importance}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button onClick={() => upsertConfig('card_relationship', {}, r.id, 'delete')} style={{ padding: '0.25rem 0.45rem', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {cardRelationships.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No card relationships defined yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {timeOffModal && (
        <TimeOffMatrixModal
          title={timeOffModal.title}
          days={days}
          slots={slots}
          initialTimeOff={timeOffModal.initial}
          onSave={timeOffModal.onSave}
          onClose={() => setTimeOffModal(null)}
        />
      )}
    </div>
  )
}
