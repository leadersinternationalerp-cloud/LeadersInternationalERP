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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    setPreviewUrl(`/api/report-cards/download?student_id=${studentId}&term_id=${selectedTermId}`)
  }

  const handleBulkGenerate = () => {
    if (filteredStudents.length === 0) return
    const ids = filteredStudents.map(s => s.id).join(',')
    setPreviewUrl(`/api/report-cards/download?student_id=${ids}&term_id=${selectedTermId}`)
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

      {previewUrl && (
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
            maxWidth: '900px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            flexDirection: 'column',
            height: '90vh',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              backgroundColor: 'rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {previewUrl.includes(',') ? 'Bulk Report Cards Preview' : 'Report Card Preview'}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Send WhatsApp Placeholder */}
                <button
                  onClick={() => alert('WhatsApp Integration Placeholder: Report Card sent successfully to the parent contact.')}
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
                    boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.936 9.936 0 0 0 4.777 1.218h.004c5.505 0 9.989-4.478 9.99-9.983A9.996 9.996 0 0 0 12.012 2zm5.82 14.156c-.252.712-1.461 1.294-2.014 1.347-.503.048-1.155.076-3.435-.866-2.915-1.205-4.786-4.185-4.931-4.378-.146-.193-1.176-1.571-1.176-2.996 0-1.425.728-2.126 1.01-2.408.28-.282.613-.353.818-.353.204 0 .408.002.585.01.183.008.428-.072.67.51.252.608.86 2.1.934 2.25.075.15.125.326.025.524-.1.198-.15.322-.3.494-.15.172-.315.385-.45.517-.15.148-.308.309-.133.61.176.3.78 1.282 1.67 2.075.146.13.275.243.385.342.756.68 1.438.89 1.89 1.037.45.147.88.106 1.213-.242.333-.348 1.46-1.696 1.85-2.28.39-.583.78-.49 1.32-.292.54.198 3.436 1.622 3.636 1.722.202.1.337.15.387.235.05.085.05.495-.202 1.208z"/>
                  </svg>
                  Send WhatsApp
                </button>
                
                {/* Download Button */}
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
                
                {/* Close Button */}
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
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
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
