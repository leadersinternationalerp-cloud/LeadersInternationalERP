'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import StudentPhotoManager from '@/components/StudentPhotoManager'
import { inferWing, matchesWingFilter, type SchoolWing, type WingFilterValue } from '@/lib/wing'
import { WingSegmentedBar, WingBadge, useWingFilter } from '@/components/WingFilterBar'
import {
  FileDown,
  Search,
  Loader2,
  CheckSquare,
  Square,
  MessageSquare,
  Send,
  Lock,
  CheckCircle2,
  X,
  SlidersHorizontal
} from 'lucide-react'

interface ClassOption {
  id: string
  class_name: string
  section?: string
  name?: string // fallback name
}

interface TermOption {
  id: string
  term_name: string
  academic_year: string
}

interface StudentRecord {
  id: string // UUID
  student_id: string // ADM No
  photo_url: string | null
  grade_level: string
  section?: string
  class_id?: string
  profiles?: {
    first_name: string
    last_name: string
    email?: string
  }
}

interface AssessmentConfigItem {
  type: string
  weight: number
  is_active: boolean
  display_order?: number
}

interface StudentCommentMeta {
  conductGrade: string
  conductRemark: string
  classTeacherComment: string
  principalComment: string
  isPublished?: boolean
}

interface ReportCardsGeneratorProps {
  classes: ClassOption[]
  terms: TermOption[]
  initialStudents: StudentRecord[]
  roleLabel: string
  initialWingFilter?: WingFilterValue
  lockedWing?: SchoolWing | null
}

const CONDUCT_PRESETS: Record<string, string> = {
  'A*': 'Exemplary conduct, leadership, and respect demonstrated across all school activities.',
  'A': 'Excellent conduct shown in all learning fields.',
  'B': 'Very good behavior and positive cooperation with peers and teachers.',
  'C': 'Satisfactory conduct; generally follows school rules with occasional reminders.',
  'D': 'Needs improvement in classroom focus and adherence to school expectations.',
  'E': 'Requires close behavioral guidance and regular follow-up.'
}

export default function ReportCardsGenerator({
  classes,
  terms,
  initialStudents,
  roleLabel,
  initialWingFilter = 'all',
  lockedWing = null,
}: ReportCardsGeneratorProps) {
  const { wingFilter, setWingFilter } = useWingFilter(initialWingFilter, lockedWing)
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '')
  const [selectedTermId, setSelectedTermId] = useState<string>(terms[0]?.id || '')
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [search, setSearch] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showRank, setShowRank] = useState(false)
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false)

  const wingCounts = useMemo(() => {
    let cambridge = 0
    let necta = 0
    for (const c of classes) {
      if (inferWing(c) === 'Cambridge') cambridge++
      else necta++
    }
    return { all: classes.length, Cambridge: cambridge, NECTA: necta }
  }, [classes])

  const filteredClasses = useMemo(
    () => classes.filter((c) => matchesWingFilter(c, wingFilter)),
    [classes, wingFilter]
  )

  // Assessment selection & release metadata state
  const [assessmentConfigs, setAssessmentConfigs] = useState<AssessmentConfigItem[]>([
    { type: 'QUIZZES', weight: 20, is_active: true, display_order: 0 },
    { type: 'Test 1', weight: 20, is_active: true, display_order: 1 },
    { type: 'Test 2', weight: 20, is_active: true, display_order: 2 },
    { type: 'Mid-Term', weight: 20, is_active: true, display_order: 3 },
    { type: 'Terminal', weight: 40, is_active: true, display_order: 4 }
  ])
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([
    'QUIZZES',
    'Test 1',
    'Test 2',
    'Mid-Term',
    'Terminal'
  ])
  const [hasInitializedAssessments, setHasInitializedAssessments] = useState(false)
  const [isClassReleased, setIsClassReleased] = useState(false)
  const [togglingRelease, setTogglingRelease] = useState(false)
  const [studentComments, setStudentComments] = useState<Record<string, StudentCommentMeta>>({})

  // Student Remarks / Conduct Modal state
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [modalConductGrade, setModalConductGrade] = useState('A')
  const [modalConductRemark, setModalConductRemark] = useState(CONDUCT_PRESETS['A'])
  const [modalTeacherComment, setModalTeacherComment] = useState('')
  const [modalPrincipalComment, setModalPrincipalComment] = useState('')
  const [savingComments, setSavingComments] = useState(false)

  const canManageRelease = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section'].includes(roleLabel)

  // Fetch students for class when selection changes
  const fetchStudentsForClass = async (classId: string) => {
    if (!classId) return
    setLoadingStudents(true)
    try {
      const res = await fetch(`/api/report-cards/students?class_id=${classId}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.data || data.students || [])
      }
    } catch (e) {
      console.error('Error fetching class students:', e)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Fetch metadata (assessment weights, release state, custom comments)
  const fetchMetaForClassAndTerm = useCallback(async (classId: string, termId: string) => {
    if (!classId || !termId) return
    try {
      const res = await fetch(`/api/report-cards/meta?class_id=${classId}&term_id=${termId}`)
      if (res.ok) {
        const json = await res.json()
        const payload = json.data || json
        if (payload.assessmentConfigs && payload.assessmentConfigs.length > 0) {
          setAssessmentConfigs(payload.assessmentConfigs)
          if (!hasInitializedAssessments) {
            const activeTypes = payload.assessmentConfigs
              .filter((c: AssessmentConfigItem) => c.is_active !== false && Number(c.weight) > 0)
              .map((c: AssessmentConfigItem) => c.type)
            setSelectedAssessments(
              activeTypes.length > 0
                ? activeTypes
                : payload.assessmentConfigs.map((c: AssessmentConfigItem) => c.type)
            )
            setHasInitializedAssessments(true)
          }
        }
        setIsClassReleased(Boolean(payload.releaseInfo?.isReleased))
        setStudentComments(payload.studentComments || {})
      }
    } catch (e) {
      console.error('Error fetching report card meta:', e)
    }
  }, [hasInitializedAssessments])

  useEffect(() => {
    fetchMetaForClassAndTerm(selectedClassId, selectedTermId)
  }, [selectedClassId, selectedTermId, fetchMetaForClassAndTerm])

  useEffect(() => {
    if (
      filteredClasses.length > 0 &&
      !filteredClasses.some((c) => c.id === selectedClassId)
    ) {
      const nextId = filteredClasses[0].id
      setSelectedClassId(nextId)
      fetchStudentsForClass(nextId)
    }
  }, [filteredClasses, selectedClassId])

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value
    setSelectedClassId(classId)
    fetchStudentsForClass(classId)
  }

  const toggleAssessmentType = (type: string) => {
    setSelectedAssessments(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev // Keep at least 1 selected
        return prev.filter(t => t !== type)
      }
      return [...prev, type]
    })
  }

  const selectedWeightTotal = useMemo(() => {
    return assessmentConfigs
      .filter(c => selectedAssessments.includes(c.type))
      .reduce((sum, c) => sum + (Number(c.weight) || 20), 0)
  }, [assessmentConfigs, selectedAssessments])

  const handleToggleClassRelease = async () => {
    if (!selectedClassId || !selectedTermId) return
    const nextState = !isClassReleased
    setTogglingRelease(true)
    try {
      const res = await fetch('/api/report-cards/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_release',
          classId: selectedClassId,
          termId: selectedTermId,
          release: nextState
        })
      })
      const json = await res.json()
      if (!res.ok) {
        const errMsg = json.error?.message || json.error || 'Failed to update report card release status'
        alert(errMsg)
        return
      }
      setIsClassReleased(nextState)
    } catch (e: any) {
      alert(e.message || 'Error updating release status')
    } finally {
      setTogglingRelease(false)
    }
  }

  const openEditRemarksModal = (student: StudentRecord) => {
    const existing = studentComments[student.id]
    const grade = existing?.conductGrade || 'A'
    setEditingStudent(student)
    setModalConductGrade(grade)
    setModalConductRemark(existing?.conductRemark || CONDUCT_PRESETS[grade] || CONDUCT_PRESETS['A'])
    setModalTeacherComment(
      existing?.classTeacherComment ||
        'A hardworking student who shows keen focus in all classes.'
    )
    setModalPrincipalComment(existing?.principalComment || '')
  }

  const handleSaveRemarks = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent || !selectedClassId || !selectedTermId) return
    setSavingComments(true)
    try {
      const res = await fetch('/api/report-cards/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_comments',
          studentId: editingStudent.id,
          classId: selectedClassId,
          termId: selectedTermId,
          conductGrade: modalConductGrade,
          conductRemark: modalConductRemark,
          classTeacherComment: modalTeacherComment,
          principalComment: modalPrincipalComment
        })
      })
      const json = await res.json()
      if (!res.ok) {
        const errMsg = json.error?.message || json.error || 'Failed to save remarks'
        alert(errMsg)
        return
      }
      setStudentComments(prev => ({
        ...prev,
        [editingStudent.id]: {
          conductGrade: modalConductGrade,
          conductRemark: modalConductRemark,
          classTeacherComment: modalTeacherComment,
          principalComment: modalPrincipalComment,
          isPublished: prev[editingStudent.id]?.isPublished ?? isClassReleased
        }
      }))
      setEditingStudent(null)
    } catch (err: any) {
      alert(err.message || 'Error saving student remarks')
    } finally {
      setSavingComments(false)
    }
  }

  const handleSendWhatsapp = async () => {
    if (!previewUrl) return

    const urlObj = new URL(previewUrl, window.location.origin)
    const studentId = urlObj.searchParams.get('student_id')
    const termId = urlObj.searchParams.get('term_id')
    const urlShowRank = urlObj.searchParams.get('show_rank') || 'true'
    const urlAssessments = urlObj.searchParams.get('assessments') || ''

    if (!studentId || !termId) {
      alert('Invalid preview URL parameters.')
      return
    }

    setSendingWhatsapp(true)
    try {
      const res = await fetch('/api/whatsapp/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          termId,
          showRank: urlShowRank === 'true',
          assessments: urlAssessments,
          type: 'PRIMARY'
        })
      })

      const json = await res.json()
      const data = json.data || json
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || 'Failed to send report card WhatsApp')
      }

      if (data.failed > 0 && data.success === 0) {
        throw new Error((data.errors || []).join('\n'))
      }

      let msg = `Report card PDF successfully sent to the parent contact via WhatsApp!`
      if (data.total > 1) {
        msg = `Bulk report card delivery results:\n- Sent: ${data.success}\n- Failed: ${data.failed}\n- Skipped: ${data.skipped}`
        if (data.errors && data.errors.length > 0) {
          msg += `\n\nErrors:\n${data.errors.join('\n')}`
        }
      }
      alert(msg)
    } catch (err: any) {
      alert(err.message || 'An error occurred while sending the report card.')
    } finally {
      setSendingWhatsapp(false)
    }
  }

  const currentClassDetails = useMemo(() => {
    return classes.find(c => c.id === selectedClassId)
  }, [classes, selectedClassId])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      let matchesClass = true
      if (currentClassDetails) {
        if (s.class_id) {
          matchesClass = s.class_id === selectedClassId
        } else {
          matchesClass =
            s.grade_level === currentClassDetails.name &&
            (s.section === currentClassDetails.section || (!s.section && !currentClassDetails.section))
        }
      }

      if (!matchesClass) return false

      if (!search.trim()) return true
      const term = search.toLowerCase()
      const firstName = s.profiles?.first_name?.toLowerCase() || ''
      const lastName = s.profiles?.last_name?.toLowerCase() || ''
      const studentId = s.student_id?.toLowerCase() || ''

      return firstName.includes(term) || lastName.includes(term) || studentId.includes(term)
    })
  }, [students, selectedClassId, currentClassDetails, search])

  const buildDownloadUrl = (studentIdsParam: string) => {
    const assessmentsParam =
      selectedAssessments.length > 0
        ? `&assessments=${encodeURIComponent(selectedAssessments.join(','))}`
        : ''
    return `/api/report-cards/download?student_id=${studentIdsParam}&term_id=${selectedTermId}&show_rank=${showRank}${assessmentsParam}`
  }

  const handleGenerate = (studentId: string) => {
    setPreviewUrl(buildDownloadUrl(studentId))
  }

  const handleBulkGenerate = () => {
    if (filteredStudents.length === 0) return
    const ids = filteredStudents.map(s => s.id).join(',')
    setPreviewUrl(buildDownloadUrl(ids))
  }

  const handlePhotoUpdated = (studentId: string, newUrl: string | null) => {
    setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, photo_url: newUrl } : s)))
  }

  return (
    <div>
      {/* 1. Control Panel */}
      <div
        className="glass-panel"
        style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.15rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Filter Report Cards by School Wing
          </span>
          <WingSegmentedBar
            value={wingFilter}
            onChange={setWingFilter}
            lockedWing={lockedWing}
            counts={wingCounts}
            compact
          />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'end'
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--color-text)'
              }}
            >
              Academic Term
            </label>
            <select
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
              className="input-field"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.term_name} ({t.academic_year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--color-text)'
              }}
            >
              Class / Grade
            </label>
            <select
              value={selectedClassId}
              onChange={handleClassChange}
              className="input-field"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
            >
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} {c.section ? `- ${c.section}` : ''} ({inferWing(c)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--color-text)'
              }}
            >
              Search Student
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  borderRadius: 'var(--radius-md)'
                }}
              />
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
            <button
              type="button"
              onClick={handleBulkGenerate}
              disabled={filteredStudents.length === 0}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                fontWeight: 600,
                cursor: filteredStudents.length === 0 ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              <FileDown size={18} />
              Bulk Preview & Download ({filteredStudents.length})
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
              <input
                type="checkbox"
                id="show_rank_check"
                checked={showRank}
                onChange={e => setShowRank(e.target.checked)}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <label
                htmlFor="show_rank_check"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  userSelect: 'none'
                }}
              >
                Show Class Rank on Report Cards
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Assessment Selection & Portal Release Control Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.15rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          border: '1px solid var(--color-border)'
        }}
      >
        <div style={{ flex: '1 1 480px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              flexWrap: 'wrap'
            }}
          >
            <SlidersHorizontal size={15} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Included Assessments / Tests on Report Card:
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(11, 87, 208, 0.08)',
                color: '#0b57d0',
                fontWeight: 600
              }}
            >
              Total Weight Denominator: {selectedWeightTotal}% (missing scores = 0%)
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {assessmentConfigs.map(cfg => {
              const isChecked = selectedAssessments.includes(cfg.type)
              return (
                <button
                  key={cfg.type}
                  type="button"
                  onClick={() => toggleAssessmentType(cfg.type)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isChecked
                      ? '1px solid var(--color-primary)'
                      : '1px solid var(--color-border)',
                    backgroundColor: isChecked ? 'rgba(11, 87, 208, 0.08)' : 'transparent',
                    color: isChecked ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>{cfg.type}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>({cfg.weight || 0}%)</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Portal Release Status & Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingLeft: '1rem',
            borderLeft: '1px solid var(--color-border)'
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              PORTAL VISIBILITY
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: isClassReleased ? '#15803d' : '#b45309'
              }}
            >
              {isClassReleased ? (
                <>
                  <CheckCircle2 size={14} /> Published to Portals
                </>
              ) : (
                <>
                  <Lock size={14} /> Hidden from Portals
                </>
              )}
            </div>
          </div>

          {canManageRelease && (
            <button
              type="button"
              onClick={handleToggleClassRelease}
              disabled={togglingRelease || filteredStudents.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: isClassReleased ? '1px solid #fca5a5' : 'none',
                backgroundColor: isClassReleased ? '#fef2f2' : '#059669',
                color: isClassReleased ? '#b91c1c' : '#ffffff',
                cursor: togglingRelease || filteredStudents.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {togglingRelease ? (
                <Loader2 size={15} className="animate-spin" />
              ) : isClassReleased ? (
                <Lock size={15} />
              ) : (
                <Send size={15} />
              )}
              {isClassReleased ? 'Retract Release' : 'Publish to Portals'}
            </button>
          )}
        </div>
      </div>

      {/* 3. Students Directory Table */}
      <div
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          minHeight: '150px',
          position: 'relative'
        }}
      >
        {loadingStudents && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5
            }}
          >
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-secondary)' }} />
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'rgba(0,0,0,0.03)',
                borderBottom: '1px solid var(--color-border)'
              }}
            >
              <th style={{ padding: '1rem', width: '90px', fontWeight: 600 }}>Photo</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Admission No</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Student Name</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Class</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Conduct & Remarks</th>
              <th style={{ padding: '1rem', width: '250px', textAlign: 'right', fontWeight: 600 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(s => {
              const meta = studentComments[s.id]
              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StudentPhotoManager
                      studentId={s.id}
                      currentPhotoUrl={s.photo_url}
                      studentName={`${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`}
                      onUploaded={url => handlePhotoUpdated(s.id, url)}
                    />
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{s.student_id}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {s.profiles?.first_name} {s.profiles?.last_name}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(59, 179, 195, 0.08)',
                          color: 'var(--color-secondary)',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        {s.grade_level} {s.section ? `- ${s.section}` : ''}
                      </span>
                      <WingBadge wing={inferWing(s)} />
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {meta ? (
                      <div style={{ fontSize: '0.8rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            fontWeight: 700,
                            marginRight: '0.4rem'
                          }}
                        >
                          Conduct: {meta.conductGrade}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {meta.classTeacherComment
                            ? `${meta.classTeacherComment.slice(0, 38)}${
                                meta.classTeacherComment.length > 38 ? '...' : ''
                              }`
                            : 'Customized'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Default (Conduct: A)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => openEditRemarksModal(s)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          cursor: 'pointer'
                        }}
                      >
                        <MessageSquare size={14} />
                        Remarks
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerate(s.id)}
                        className="btn btn-secondary"
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.45rem 0.9rem',
                          fontSize: '0.82rem',
                          fontWeight: 600
                        }}
                      >
                        Generate PDF
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}
                >
                  No students found matching the selected class/search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Student Conduct & Remarks Editor Modal */}
      {editingStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1.15rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  Report Card Conduct & Remarks
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {editingStudent.profiles?.first_name} {editingStudent.profiles?.last_name} ({editingStudent.student_id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRemarks} style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.4rem'
                    }}
                  >
                    Conduct Grade
                  </label>
                  <select
                    value={modalConductGrade}
                    onChange={e => {
                      const g = e.target.value
                      setModalConductGrade(g)
                      if (CONDUCT_PRESETS[g]) {
                        setModalConductRemark(CONDUCT_PRESETS[g])
                      }
                    }}
                    className="input-field"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}
                  >
                    {['A*', 'A', 'B', 'C', 'D', 'E'].map(g => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.4rem'
                    }}
                  >
                    Conduct Description
                  </label>
                  <input
                    type="text"
                    value={modalConductRemark}
                    onChange={e => setModalConductRemark(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}
                    placeholder="e.g. Excellent conduct shown in all learning fields."
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '0.4rem'
                  }}
                >
                  Class Teacher Comment
                </label>
                <textarea
                  rows={3}
                  value={modalTeacherComment}
                  onChange={e => setModalTeacherComment(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
                  placeholder="Enter class teacher comment for this student..."
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '0.4rem'
                  }}
                >
                  Principal Comment Override{' '}
                  <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>
                    (Leave blank to auto-select by overall grade)
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={modalPrincipalComment}
                  onChange={e => setModalPrincipalComment(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}
                  placeholder="Optional custom principal remark..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 1.1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingComments}
                  className="btn btn-primary"
                  style={{
                    padding: '0.55rem 1.25rem',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    cursor: savingComments ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingComments ? 'Saving...' : 'Save Remarks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. PDF Preview Modal */}
      {previewUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '900px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              height: '90vh',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                backgroundColor: 'rgba(0,0,0,0.02)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                  {previewUrl.includes('student_id=') &&
                  previewUrl.split('student_id=')[1]?.split('&')[0]?.includes(',')
                    ? 'Bulk Report Cards Preview'
                    : 'Report Card Preview'}
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Included Tests: {selectedAssessments.join(', ')} (Denominator: {selectedWeightTotal}%)
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={handleSendWhatsapp}
                  disabled={sendingWhatsapp}
                  style={{
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)',
                    opacity: sendingWhatsapp ? 0.7 : 1
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.936 9.936 0 0 0 4.777 1.218h.004c5.505 0 9.989-4.478 9.99-9.983A9.996 9.996 0 0 0 12.012 2zm5.82 14.156c-.252.712-1.461 1.294-2.014 1.347-.503.048-1.155.076-3.435-.866-2.915-1.205-4.786-4.185-4.931-4.378-.146-.193-1.176-1.571-1.176-2.996 0-1.425.728-2.126 1.01-2.408.28-.282.613-.353.818-.353.204 0 .408.002.585.01.183.008.428-.072.67.51.252.608.86 2.1.934 2.25.075.15.125.326.025.524-.1.198-.15.322-.3.494-.15.172-.315.385-.45.517-.15.148-.308.309-.133.61.176.3.78 1.282 1.67 2.075.146.13.275.243.385.342.756.68 1.438.89 1.89 1.037.45.147.88.106 1.213-.242.333-.348 1.46-1.696 1.85-2.28.39-.583.78-.49 1.32-.292.54.198 3.436 1.622 3.636 1.722.202.1.337.15.387.235.05.085.05.495-.202 1.208z" />
                  </svg>
                  {sendingWhatsapp ? 'Sending...' : 'Send WhatsApp'}
                </button>

                <a
                  href={`${previewUrl}&download=true`}
                  className="btn btn-secondary"
                  style={{
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none'
                  }}
                >
                  <FileDown size={16} />
                  Download PDF
                </a>

                <button
                  onClick={() => setPreviewUrl(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'background-color 0.15s'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', position: 'relative' }}>
              <iframe
                src={previewUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
