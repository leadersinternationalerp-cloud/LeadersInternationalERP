'use client'

import { useState, useEffect } from 'react'
import { Sparkles, FileText, CheckCircle2, AlertTriangle, Printer, Layers } from 'lucide-react'

interface Student {
  id: string
  student_id: string
  grade_level: string
  section?: string
  photo_url?: string
  dob?: string
  profiles?: {
    first_name: string
    last_name: string
    email?: string
  }
}

interface EarlyYearsReportGeneratorProps {
  classes: any[]
  terms: any[]
  initialStudents: Student[]
  roleLabel: string
}

export default function EarlyYearsReportGenerator({ classes, terms, initialStudents, roleLabel }: EarlyYearsReportGeneratorProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [selectedTermId, setSelectedTermId] = useState(terms[0]?.id || '')
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [finalCounts, setFinalCounts] = useState<Record<string, number>>({})

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
        }
      } catch (e) {
        console.error('Error loading students:', e)
      }
      setLoading(false)
    }
    loadClassStudents()
  }, [selectedClassId])

  // Load final observation counts for all students in the class
  const loadFinalCounts = async () => {
    if (!selectedClassId || !selectedTermId) return
    try {
      const res = await fetch(`/api/early-years/observations?class_id=${selectedClassId}&term_id=${selectedTermId}`)
      const data = await res.json()
      if (data.data) {
        // Map student_id to count of is_final observations
        const counts: Record<string, number> = {}
        const obsList: any[] = data.data
        
        obsList.forEach(obs => {
          if (obs.is_final) {
            const studentId = obs.student_id
            if (!counts[studentId]) {
              counts[studentId] = 0
            }
            counts[studentId]++
          }
        })
        setFinalCounts(counts)
      }
    } catch (e) {
      console.error('Error fetching final observation counts:', e)
    }
  }

  useEffect(() => {
    loadFinalCounts()
  }, [selectedClassId, selectedTermId, students])

  // Filter students
  const filteredStudents = students.filter(s => {
    const fullName = `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.toLowerCase()
    return fullName.includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase())
  })

  // Bulk PDF Generation (throttled window.open)
  const handleBulkGenerate = async () => {
    if (filteredStudents.length === 0) return
    if (!confirm(`Are you sure you want to generate reports for all ${filteredStudents.length} children in this class? This will open report PDFs in separate tabs.`)) return

    for (let i = 0; i < filteredStudents.length; i++) {
      const s = filteredStudents[i]
      const url = `/api/early-years/report?student_id=${s.id}&term_id=${selectedTermId}`
      window.open(url, '_blank')
      // Small delay between opens to prevent browser popup block
      await new Promise(r => setTimeout(r, 600))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Dashboard Context Info */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(219, 39, 119, 0.01)', border: '1px solid rgba(219, 39, 119, 0.15)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#be185d', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
            <Sparkles size={18} />
            Early Years Foundation Stage (EYFS) Reports Portal
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Authorized View: <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{roleLabel}</span>. Prepare, review, and print child developmental records.
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '30px', backgroundColor: 'rgba(219, 39, 119, 0.1)', color: '#db2777', fontWeight: 600 }}>
          EYFS System Active
        </div>
      </div>

      {/* 2. Filters Grid */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Select EYFS Class</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input-field" style={{ minWidth: '180px', padding: '0.4rem 0.75rem' }}>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.age_group || 'N/A'})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Select Assessment Term</label>
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
          <button 
            type="button" 
            onClick={handleBulkGenerate} 
            className="btn" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', fontSize: '0.85rem', backgroundColor: '#831843', color: '#ffffff', fontWeight: 600 }}
            disabled={filteredStudents.length === 0}
          >
            <Printer size={15} />
            Bulk Print Class
          </button>
        </div>
      </div>

      {/* 3. Students Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading class roster...</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No student records matching filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>Photo</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '130px' }}>Admission No</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Child Full Name</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '120px' }}>Class Level</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '160px', textAlign: 'center' }}>EYFS Progress (7 Areas)</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '160px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const finalObsCount = finalCounts[student.id] || 0
                  
                  // Progress styling
                  const badgeBg = finalObsCount === 7 ? 'rgba(16, 185, 129, 0.08)' : finalObsCount > 0 ? 'rgba(217, 119, 6, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                  const badgeBorder = finalObsCount === 7 ? '1px solid rgba(16, 185, 129, 0.2)' : finalObsCount > 0 ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                  const badgeColor = finalObsCount === 7 ? 'var(--color-success)' : finalObsCount > 0 ? '#d97706' : 'var(--color-error)'
                  const labelText = finalObsCount === 7 ? 'Ready (7/7)' : `${finalObsCount} / 7 Completed`

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                          <img 
                            src={student.photo_url} 
                            alt="Student thumbnail" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${student.profiles?.first_name}+${student.profiles?.last_name}&background=f3f4f6&color=475569`
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                        {student.student_id}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        {student.profiles?.first_name} {student.profiles?.last_name}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)' }}>
                        {student.grade_level} {student.section || ''}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: badgeBg, border: badgeBorder, color: badgeColor, fontSize: '0.75rem', fontWeight: 600 }}>
                          {finalObsCount === 7 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                          <span>{labelText}</span>
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <a 
                          href={`/api/early-years/report?student_id=${student.id}&term_id=${selectedTermId}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.85rem', fontSize: '0.8rem', border: '1px solid rgba(219, 39, 119, 0.25)', color: '#db2777', backgroundColor: 'transparent', fontWeight: 600 }}
                        >
                          <FileText size={14} />
                          Print Report
                        </a>
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
  )
}
