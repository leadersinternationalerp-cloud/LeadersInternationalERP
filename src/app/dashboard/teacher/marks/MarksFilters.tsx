'use client'

import { useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { inferWing, matchesWingFilter, type SchoolWing, type WingFilterValue } from '@/lib/wing'
import { WingSegmentedBar, useWingFilter } from '@/components/WingFilterBar'

export interface Allocation {
  class_id: string
  subject_id: string
  subject_name: string
}

interface ClassRecord {
  id: string
  name: string
  section?: string
}

export interface AssessmentTypeOption {
  name: string
  weight?: number
  is_active?: boolean
}

export interface TermOptionItem {
  name: string
  academic_year?: string
  is_current?: boolean
}

export default function MarksFilters({
  classes,
  allocations,
  selectedClassId,
  selectedSubjectId,
  selectedAssessmentType,
  selectedTerm,
  assessmentTypes = [
    { name: 'Test 1' },
    { name: 'Test 2' },
    { name: 'Mid-Term' },
    { name: 'Terminal' },
  ],
  terms = [
    { name: 'Term 1' },
    { name: 'Term 2' },
    { name: 'Term 3' },
  ],
  initialWingFilter = 'all',
  lockedWing = null,
}: {
  classes: ClassRecord[]
  allocations: Allocation[]
  selectedClassId: string
  selectedSubjectId: string
  selectedAssessmentType: string
  selectedTerm: string
  assessmentTypes?: AssessmentTypeOption[]
  terms?: TermOptionItem[]
  initialWingFilter?: WingFilterValue
  lockedWing?: SchoolWing | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { wingFilter, setWingFilter } = useWingFilter(initialWingFilter, lockedWing)

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

  // Get subjects for selected class
  const classSubjects = allocations
    .filter((alloc) => alloc.class_id === selectedClassId)
    .map((alloc) => ({ id: alloc.subject_id, name: alloc.subject_name }))

  // Deduplicate
  const subjectsMap = new Map<string, { id: string; name: string }>()
  classSubjects.forEach((s) => subjectsMap.set(s.id, s))
  const subjects = Array.from(subjectsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const updateUrl = (updatedParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updatedParams).forEach(([name, value]) => {
      params.set(name, value)
    })
    params.delete('class')
    params.delete('subject')
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleClassChange = (classId: string) => {
    const newSubjects = allocations
      .filter((alloc) => alloc.class_id === classId)
      .map((alloc) => ({ id: alloc.subject_id, name: alloc.subject_name }))

    const newSubjectsMap = new Map<string, string>()
    newSubjects.forEach((s) => newSubjectsMap.set(s.id, s.name))
    const firstSubjectId = newSubjects.length > 0 ? newSubjects[0].id : ''

    const isCurrentSubjectValid = newSubjectsMap.has(selectedSubjectId)
    const targetSubjectId = isCurrentSubjectValid ? selectedSubjectId : firstSubjectId

    updateUrl({
      class_id: classId,
      subject_id: targetSubjectId,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    updateUrl({ [name]: value })
  }

  const handleWingFilterChange = (nextWing: WingFilterValue) => {
    setWingFilter(nextWing)
    const nextClasses = classes.filter((c) => matchesWingFilter(c, nextWing))
    if (nextClasses.length > 0 && !nextClasses.some((c) => c.id === selectedClassId)) {
      handleClassChange(nextClasses[0].id)
    }
  }

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid var(--color-border)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Filter Classes by School Wing
        </span>
        <WingSegmentedBar
          value={wingFilter}
          onChange={handleWingFilterChange}
          lockedWing={lockedWing}
          counts={wingCounts}
          compact
        />
      </div>
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        <div className="form-group">
          <label className="form-label">Class</label>
          <select
            name="class_id"
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="input-field"
            required
          >
            {filteredClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section ? `(${c.section})` : ''} — {inferWing(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Subject</label>
          <select
            name="subject_id"
            value={selectedSubjectId}
            onChange={(e) => handleSelectChange('subject_id', e.target.value)}
            className="input-field"
            required
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Assessment / Exam</label>
          <select
            name="assessment_type"
            value={selectedAssessmentType}
            onChange={(e) => handleSelectChange('assessment_type', e.target.value)}
            className="input-field"
            required
          >
            {assessmentTypes.map((at) => (
              <option key={at.name} value={at.name}>
                {at.name}
                {typeof at.weight === 'number' && at.weight > 0
                  ? ` (Weight: ${at.weight}%)`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Academic Term</label>
          <select
            name="term"
            value={selectedTerm}
            onChange={(e) => handleSelectChange('term', e.target.value)}
            className="input-field"
            required
          >
            {terms.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
                {t.academic_year ? ` (${t.academic_year})` : ''}
                {t.is_current ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  )
}
