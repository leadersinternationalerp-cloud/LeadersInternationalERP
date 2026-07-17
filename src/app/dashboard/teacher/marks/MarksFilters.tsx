'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

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

export default function MarksFilters({
  classes,
  allocations,
  selectedClassId,
  selectedSubjectId,
  selectedAssessmentType,
  selectedTerm
}: {
  classes: ClassRecord[]
  allocations: Allocation[]
  selectedClassId: string
  selectedSubjectId: string
  selectedAssessmentType: string
  selectedTerm: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get subjects for selected class
  const classSubjects = allocations
    .filter(alloc => alloc.class_id === selectedClassId)
    .map(alloc => ({ id: alloc.subject_id, name: alloc.subject_name }))

  // Deduplicate
  const subjectsMap = new Map<string, { id: string; name: string }>()
  classSubjects.forEach(s => subjectsMap.set(s.id, s))
  const subjects = Array.from(subjectsMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const updateUrl = (updatedParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updatedParams).forEach(([name, value]) => {
      params.set(name, value)
    })
    // Remove legacy keys if present
    params.delete('class')
    params.delete('subject')
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleClassChange = (classId: string) => {
    // Find valid subjects for this new class
    const newSubjects = allocations
      .filter(alloc => alloc.class_id === classId)
      .map(alloc => ({ id: alloc.subject_id, name: alloc.subject_name }))
    
    // Deduplicate
    const newSubjectsMap = new Map<string, string>()
    newSubjects.forEach(s => newSubjectsMap.set(s.id, s.name))
    const firstSubjectId = newSubjects.length > 0 ? newSubjects[0].id : ''

    const isCurrentSubjectValid = newSubjectsMap.has(selectedSubjectId)
    const targetSubjectId = isCurrentSubjectValid ? selectedSubjectId : firstSubjectId

    updateUrl({
      class_id: classId,
      subject_id: targetSubjectId
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    updateUrl({ [name]: value })
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group">
          <label className="form-label">Class</label>
          <select
            name="class_id"
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="input-field"
            required
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
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
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Assessment</label>
          <select
            name="assessment_type"
            value={selectedAssessmentType}
            onChange={(e) => handleSelectChange('assessment_type', e.target.value)}
            className="input-field"
            required
          >
            <option value="Test 1">Test 1</option>
            <option value="Test 2">Test 2</option>
            <option value="Mid-Term">Mid-Term</option>
            <option value="Terminal">Terminal</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Term</label>
          <select
            name="term"
            value={selectedTerm}
            onChange={(e) => handleSelectChange('term', e.target.value)}
            className="input-field"
            required
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
          </select>
        </div>
      </form>
    </div>
  )
}
