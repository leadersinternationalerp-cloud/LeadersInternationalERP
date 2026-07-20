'use client'

import { useState, useEffect } from 'react'
import { Camera, Trash, Eye, Sparkles, FileText, CheckCircle2 } from 'lucide-react'

interface Student {
  id: string
  student_id: string
  grade_level: string
  section?: string
  photo_url?: string
  dob?: string
  gender?: string
  medical_info?: string
  allergies?: string
  language_at_home?: string
  previous_school?: string
  emergency_contact?: string
  profiles?: {
    first_name: string
    last_name: string
    email?: string
  }
}

interface Observation {
  id: string
  learning_area: string
  achievement_level: string
  teacher_observation: string
  next_steps?: string
  age_band?: string
  characteristics?: string[]
  evidence_url?: string
  is_final?: boolean
  created_at: string
}

interface EarlyYearsClientProps {
  classes: any[]
  terms: any[]
  initialStudents: Student[]
}

const LEARNING_AREAS = [
  'Communication and Language',
  'Physical Development',
  'Personal, Social & Emotional Development',
  'Literacy',
  'Mathematics',
  'Understanding the World',
  'Expressive Arts & Design'
]

const AGE_BANDS = ['1-2y', '2-3y', '3-4y', '4-5y', '5-6y']

export default function EarlyYearsClient({ classes, terms, initialStudents }: EarlyYearsClientProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [selectedTermId, setSelectedTermId] = useState(terms[0]?.id || '')
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudents[0]?.id || '')
  
  const [search, setSearch] = useState('')
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [learningArea, setLearningArea] = useState(LEARNING_AREAS[0])
  const [achievementLevel, setAchievementLevel] = useState('Expected')
  const [ageBand, setAgeBand] = useState(classes[0]?.age_group || '3-4y')
  const [observationText, setObservationText] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [isFinal, setIsFinal] = useState(true)
  
  // Characteristics
  const [charPlaying, setCharPlaying] = useState(false)
  const [charActive, setCharActive] = useState(false)
  const [charCreating, setCharCreating] = useState(false)

  // Evidence File
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidencePreview, setEvidencePreview] = useState<string>('')

  // Load students for class
  useEffect(() => {
    if (!selectedClassId) return
    const loadClassStudents = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/early-years/students?class_id=${selectedClassId}`)
        const data = await res.json()
        if (data.students) {
          setStudents(data.students)
          if (data.students.length > 0) {
            setSelectedStudentId(data.students[0].id)
          } else {
            setSelectedStudentId('')
          }
        }
      } catch (e) {
        console.error('Error loading students:', e)
      }
      setLoading(false)
    }
    loadClassStudents()
  }, [selectedClassId])

  // Load observations when student or term changes
  const loadObservations = async () => {
    if (!selectedStudentId || !selectedTermId) {
      setObservations([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/early-years/observations?student_id=${selectedStudentId}&term_id=${selectedTermId}`)
      const resData = await res.json()
      if (resData.data) {
        setObservations(resData.data)
      }
    } catch (e) {
      console.error('Error fetching observations:', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadObservations()
  }, [selectedStudentId, selectedTermId])

  // Sync default age group when class changes
  useEffect(() => {
    const selectedClass = classes.find(c => c.id === selectedClassId)
    if (selectedClass?.age_group) {
      setAgeBand(selectedClass.age_group)
    }
  }, [selectedClassId, classes])

  // Filter students by search
  const filteredStudents = students.filter(s => {
    const fullName = `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.toLowerCase()
    return fullName.includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase())
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  // Calculate final summary counts out of 7 areas
  const finalCount = LEARNING_AREAS.filter(area => 
    observations.some(obs => obs.learning_area.toLowerCase() === area.toLowerCase() && obs.is_final)
  ).length
  const progressPercent = Math.round((finalCount / 7) * 100)

  // Handle evidence photo
  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('File size must be less than 8MB.')
      return
    }

    setError('')
    setEvidenceFile(file)
    setEvidencePreview(URL.createObjectURL(file))
  }

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId || !selectedTermId) {
      setError('Please select a student and academic term first.')
      return
    }
    if (!observationText.trim()) {
      setError('Observation notes cannot be empty.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      let uploadedUrl = ''
      
      // 1. Upload evidence photo if selected
      if (evidenceFile) {
        const uploadForm = new FormData()
        uploadForm.append('evidence', evidenceFile)
        uploadForm.append('student_id', selectedStudentId)
        uploadForm.append('learning_area', learningArea)

        const uploadRes = await fetch('/api/early-years/evidence', {
          method: 'POST',
          body: uploadForm
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload observation photo')
        }
        uploadedUrl = uploadData.url
      }

      // 2. Build characteristics array
      const characteristics: string[] = []
      if (charPlaying) characteristics.push('Playing & Exploring')
      if (charActive) characteristics.push('Active Learning')
      if (charCreating) characteristics.push('Creating & Critical Thinking')

      // 3. Save Observation
      const saveRes = await fetch('/api/early-years/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          term_id: selectedTermId,
          class_id: selectedClassId,
          learning_area: learningArea,
          achievement_level: achievementLevel,
          teacher_observation: observationText,
          next_steps: nextSteps,
          age_band: ageBand,
          characteristics,
          evidence_url: uploadedUrl || undefined,
          is_final: isFinal
        })
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to save observation')
      }

      setSuccess('Observation successfully recorded!')
      
      // Reset form
      setObservationText('')
      setNextSteps('')
      setCharPlaying(false)
      setCharActive(false)
      setCharCreating(false)
      setEvidenceFile(null)
      setEvidencePreview('')
      
      // Refetch
      await loadObservations()
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.')
    }
    setSaving(false)
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this observation?')) return
    try {
      const res = await fetch(`/api/early-years/observations?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('Observation deleted successfully!')
        await loadObservations()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete observation')
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header Filters Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Active Early Years Class</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field" style={{ minWidth: '180px', padding: '0.4rem 0.75rem' }}>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.age_group || 'N/A'})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Academic Term</label>
            <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} className="input-field" style={{ minWidth: '180px', padding: '0.4rem 0.75rem' }}>
              {terms.map(t => {
                const termName = t.term_name || t.name || 'Term'
                const yearName = t.academic_year || t.academic_years?.name || ''
                return (
                  <option key={t.id} value={t.id}>
                    {termName}{yearName ? ` (${yearName})` : ''}{t.is_current ? ' ★ Active' : ''}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search child name..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="input-field" 
            style={{ width: '220px', padding: '0.4rem 0.75rem' }} 
          />
        </div>
      </div>

      {/* 2. Progress Tracker Banner */}
      {selectedStudent && (
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem', border: '1px solid rgba(219, 39, 119, 0.2)', backgroundColor: 'rgba(219, 39, 119, 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'rgba(219, 39, 119, 0.1)', color: '#db2777', flexShrink: 0 }}>
            <Sparkles size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#db2777' }}>
                Report Progress for {selectedStudent.profiles?.first_name} {selectedStudent.profiles?.last_name}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {finalCount} of 7 Areas Completed ({progressPercent}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#db2777', transition: 'width 0.4s ease' }} />
            </div>
            {/* Progress Steps Indicators */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
              {LEARNING_AREAS.map(area => {
                const completed = observations.some(obs => obs.learning_area.toLowerCase() === area.toLowerCase() && obs.is_final)
                const shortName = area.split(' ')[0]
                return (
                  <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.03)', border: completed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--color-border)', borderRadius: '20px', color: completed ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {completed ? <CheckCircle2 size={10} /> : <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-text-muted)' }} />}
                    <span>{shortName}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <a 
              href={`/api/early-years/report?student_id=${selectedStudentId}&term_id=${selectedTermId}`} 
              target="_blank" 
              className="btn" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: finalCount === 7 ? '#db2777' : 'rgba(219, 39, 119, 0.1)', color: finalCount === 7 ? '#ffffff' : '#db2777', border: finalCount === 7 ? 'none' : '1px solid rgba(219, 39, 119, 0.2)', fontWeight: 600 }}
            >
              <FileText size={16} />
              Generate EYFS PDF
            </a>
          </div>
        </div>
      )}

      {/* 3. Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left column: Students list */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '680px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0.25rem 0.5rem 0.5rem 0.5rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Children Directory ({filteredStudents.length})
          </h3>
          {loading && filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading children list...</div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No student records found.</div>
          ) : (
            filteredStudents.map(student => {
              const active = student.id === selectedStudentId
              return (
                <div 
                  key={student.id} 
                  onClick={() => { setSelectedStudentId(student.id); setError(''); setSuccess('') }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    borderRadius: 'var(--radius-md)', 
                    cursor: 'pointer', 
                    backgroundColor: active ? 'rgba(219, 39, 119, 0.05)' : 'transparent',
                    border: active ? '1.5px solid rgba(219, 39, 119, 0.3)' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Thumbnail Photo */}
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: active ? '1.5px solid #db2777' : '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <img 
                      src={student.photo_url} 
                      alt="Student" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${student.profiles?.first_name}+${student.profiles?.last_name}&background=f3f4f6&color=475569`
                      }}
                    />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: active ? '#db2777' : 'var(--color-text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {student.profiles?.first_name} {student.profiles?.last_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      ID: {student.student_id} | Class: {student.grade_level} {student.section || ''}
                    </div>
                  </div>
                  {active && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#db2777' }} />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Right column: Observation recording form + Timeline history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Observation recording Form */}
          <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.75rem', position: 'relative' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#be185d', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={18} />
              Record Observation & Progress Summary
            </h2>

            {error && <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.8rem' }}>{error}</div>}
            {success && <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.8rem' }}>{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>EYFS Learning Area *</label>
                <select value={learningArea} onChange={e => setLearningArea(e.target.value)} className="input-field" required>
                  {LEARNING_AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Achievement Level *</label>
                <select value={achievementLevel} onChange={e => setAchievementLevel(e.target.value)} className="input-field" required>
                  <option value="Emerging">Emerging</option>
                  <option value="Expected">Expected</option>
                  <option value="Exceeding">Exceeding</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Development Age Band *</label>
                <select value={ageBand} onChange={e => setAgeBand(e.target.value)} className="input-field" required>
                  {AGE_BANDS.map(band => (
                    <option key={band} value={band}>{band}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Observation & Progress Notes *</label>
              <textarea 
                rows={3} 
                value={observationText} 
                onChange={e => setObservationText(e.target.value)} 
                className="input-field" 
                placeholder="Write specific narrative notes of the child's achievement, activity participation, or behaviors in this area..." 
                required 
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Next Steps for Development</label>
              <input 
                type="text" 
                value={nextSteps} 
                onChange={e => setNextSteps(e.target.value)} 
                className="input-field" 
                placeholder="e.g. Encourage independent letter formation during spelling games." 
              />
            </div>

            {/* Characteristics Checklist */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>Characteristics of Effective Learning demonstrated</label>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={charPlaying} onChange={e => setCharPlaying(e.target.checked)} style={{ width: '13px', height: '13px' }} />
                  <span>Playing and Exploring</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={charActive} onChange={e => setCharActive(e.target.checked)} style={{ width: '13px', height: '13px' }} />
                  <span>Active Learning</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={charCreating} onChange={e => setCharCreating(e.target.checked)} style={{ width: '13px', height: '13px' }} />
                  <span>Creating & Critical Thinking</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              {/* Evidence Upload */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '55px', height: '55px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.02)', flexShrink: 0, overflow: 'hidden' }}>
                  {evidencePreview ? (
                    <img src={evidencePreview} alt="Evidence Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={18} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.15rem' }}>Upload Evidence Photo (Optional)</label>
                  <input type="file" accept="image/*" onChange={handleEvidenceChange} style={{ fontSize: '0.75rem', width: '100%' }} />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer', marginBottom: '0.25rem' }}>
                  <input type="checkbox" checked={isFinal} onChange={e => setIsFinal(e.target.checked)} style={{ width: '14px', height: '14px' }} />
                  <span style={{ fontWeight: 600, color: '#db2777' }}>Register as Final Summary</span>
                </label>
                <button type="submit" disabled={saving || loading} className="btn" style={{ padding: '0.5rem 1.25rem', backgroundColor: '#db2777', color: '#ffffff', fontWeight: 600, fontSize: '0.8rem', width: '100%' }}>
                  {saving ? 'Saving...' : 'Save Observation'}
                </button>
              </div>
            </div>
          </form>

          {/* Observations Timeline History */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Observations Timeline & History
            </h3>
            
            {loading && observations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading observation timeline...</div>
            ) : observations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No observations recorded for this student in the current term.</div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Learning Area</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Level</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Observation Notes</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Evidence</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Final?</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map(obs => {
                      const badgeBg = obs.achievement_level === 'Exceeding' ? '#dcfce7' : obs.achievement_level === 'Expected' ? '#e0f2fe' : '#fef3c7'
                      const badgeText = obs.achievement_level === 'Exceeding' ? '#166534' : obs.achievement_level === 'Expected' ? '#075985' : '#854d0e'
                      return (
                        <tr key={obs.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#be185d', whiteSpace: 'nowrap' }}>
                            {obs.learning_area}
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: badgeBg, color: badgeText, fontWeight: 700, fontSize: '0.65rem' }}>
                              {obs.achievement_level}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', color: 'var(--color-text)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={obs.teacher_observation}>
                            {obs.teacher_observation}
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                            {obs.evidence_url ? (
                              <a href={obs.evidence_url} target="_blank" rel="noreferrer" style={{ color: '#db2777', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Eye size={14} />
                              </a>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>None</span>
                            )}
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                            {obs.is_final ? (
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} title="Final Summary" />
                            ) : (
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-border)' }} title="Observation" />
                            )}
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                            <button 
                              onClick={() => handleDelete(obs.id)} 
                              style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--color-error)', cursor: 'pointer', padding: '0.25rem' }}
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
