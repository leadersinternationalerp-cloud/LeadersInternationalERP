'use client'

import { useState, useMemo, useEffect } from 'react'
import StudentPhotoManager from '@/components/StudentPhotoManager'
import { FileDown, Search, Award, Info, Loader2, Sparkles } from 'lucide-react'

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

interface ReportCardsGeneratorProps {
  classes: ClassOption[]
  terms: TermOption[]
  initialStudents: StudentRecord[]
  roleLabel: string
}

export default function ReportCardsGenerator({
  classes,
  terms,
  initialStudents,
  roleLabel
}: ReportCardsGeneratorProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '')
  const [selectedTermId, setSelectedTermId] = useState<string>(terms[0]?.id || '')
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [search, setSearch] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  // Fetch students for class when selection changes
  const fetchStudentsForClass = async (classId: string) => {
    if (!classId) return
    setLoadingStudents(true)
    try {
      const res = await fetch(`/api/report-cards/students?class_id=${classId}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } catch (e) {
      console.error('Error fetching class students:', e)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value
    setSelectedClassId(classId)
    fetchStudentsForClass(classId)
  }

  // Get selected class details
  const currentClassDetails = useMemo(() => {
    return classes.find(c => c.id === selectedClassId)
  }, [classes, selectedClassId])

  // Memoized filter for students list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Double check class assignment (in case of API latency/fallback data)
      let matchesClass = true
      if (currentClassDetails) {
        if (s.class_id) {
          matchesClass = s.class_id === selectedClassId
        } else {
          matchesClass = s.grade_level === currentClassDetails.name && 
                         (s.section === currentClassDetails.section || (!s.section && !currentClassDetails.section))
        }
      }

      // 2. Search match
      if (!matchesClass) return false

      if (!search.trim()) return true
      const term = search.toLowerCase()
      const firstName = s.profiles?.first_name?.toLowerCase() || ''
      const lastName = s.profiles?.last_name?.toLowerCase() || ''
      const studentId = s.student_id?.toLowerCase() || ''

      return firstName.includes(term) || lastName.includes(term) || studentId.includes(term)
    })
  }, [students, selectedClassId, currentClassDetails, search])

  const handleGenerate = (studentId: string) => {
    window.open(`/api/report-cards/download?student_id=${studentId}&term_id=${selectedTermId}`, '_blank')
  }

  const handleBulkGenerate = () => {
    if (filteredStudents.length === 0) return
    const count = filteredStudents.length
    if (confirm(`Generate report cards for all ${count} students in this class? This will open ${count} new tab(s).`)) {
      filteredStudents.forEach((student, index) => {
        setTimeout(() => {
          window.open(`/api/report-cards/download?student_id=${student.id}&term_id=${selectedTermId}`, '_blank')
        }, index * 500)
      })
    }
  }

  // Update photo in local list state when uploaded
  const handlePhotoUpdated = (studentId: string, newUrl: string | null) => {
    setStudents(prev => 
      prev.map(s => s.id === studentId ? { ...s, photo_url: newUrl } : s)
    )
  }

  const selectedTermName = useMemo(() => {
    return terms.find(t => t.id === selectedTermId)?.term_name || 'Selected Term'
  }, [terms, selectedTermId])

  return (
    <div>
      {/* 1. Control Panel - Glassmorphic styling */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Academic Term</label>
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Class / Grade</label>
            <select 
              value={selectedClassId} 
              onChange={handleClassChange}
              className="input-field" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} {c.section ? `- ${c.section}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Search Student</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Name or ID..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: 'var(--radius-md)' }}
              />
              <Search size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            </div>
          </div>

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
              cursor: filteredStudents.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <FileDown size={18} />
            Bulk Download ({filteredStudents.length})
          </button>
        </div>
      </div>

      {/* 2. Info Banner */}
      <div 
        style={{ 
          padding: '1rem 1.5rem', 
          backgroundColor: 'rgba(14, 165, 233, 0.05)', 
          border: '1px solid rgba(14, 165, 233, 0.15)',
          borderRadius: 'var(--radius-md)', 
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}
      >
        <Info size={24} style={{ color: '#0284c7', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
          Logged in as: <strong style={{ color: 'var(--color-secondary)' }}>{roleLabel}</strong>. Showing <strong>{filteredStudents.length}</strong> student(s) for <strong>{currentClassDetails?.class_name || 'Grade'}</strong> in <strong>{selectedTermName}</strong>. 
          Upload passport-sized photos below to display them automatically in the official Cambridge Academic Report PDF.
        </div>
      </div>

      {/* 3. Students Directory Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '150px', position: 'relative' }}>
        {loadingStudents && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5
          }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-secondary)' }} />
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', width: '90px', fontWeight: 600 }}>Photo</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Admission No</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Student Name</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Class</th>
              <th style={{ padding: '1rem', width: '150px', textAlign: 'right', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <StudentPhotoManager 
                    studentId={s.id} 
                    currentPhotoUrl={s.photo_url} 
                    studentName={`${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`}
                    onUploaded={(url) => handlePhotoUpdated(s.id, url)}
                  />
                </td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{s.student_id}</td>
                <td style={{ padding: '1rem' }}>{s.profiles?.first_name} {s.profiles?.last_name}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '4px',
                    backgroundColor: 'rgba(59, 179, 195, 0.08)', color: 'var(--color-secondary)',
                    fontSize: '0.85rem', fontWeight: 500
                  }}>
                    {s.grade_level} {s.section ? `- ${s.section}` : ''}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleGenerate(s.id)}
                    className="btn btn-secondary"
                    style={{ 
                      backgroundColor: '#1e293b', 
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.45rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    Generate PDF
                  </button>
                </td>
              </tr>
            ))}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No students found matching the selected class/search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Legend Glass-Panel */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1.5rem', 
          borderRadius: 'var(--radius-lg)', 
          marginTop: '2rem',
          borderLeft: '4px solid #f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.02)'
        }}
      >
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#d97706', marginBottom: '0.75rem' }}>
          <Sparkles size={18} />
          Smartkidz Cambridge Progress Report Features
        </h4>
        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li><strong>Curriculum Standards:</strong> Output follows the official Smartkidz Cambridge Curriculum scale (A* to G).</li>
          <li><strong>Automated Rankings:</strong> Student ranks are computed dynamically by sorting student averages across the entire class.</li>
          <li><strong>Verified Signatures:</strong> Includes sections for Class Teacher, Dean of Studies, Principal, and Parent/Guardian.</li>
          <li><strong>Image Verification:</strong> Passport photo buffers are fetched and embedded directly inside the PDF layout.</li>
          <li><strong>Single Page Guarantee:</strong> The report layout uses compact rendering vectors to guarantee it fits exactly on 1 A4 page.</li>
        </ul>
      </div>
    </div>
  )
}
