'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import StudentPhotoManager from '@/components/StudentPhotoManager'
import { Search, UserPlus, FileSpreadsheet, Users } from 'lucide-react'

interface StudentRecord {
  id: string
  student_id: string
  photo_url: string | null
  grade_level: string
  section?: string
  parent_contact?: string
  class_id?: string
  profiles?: {
    first_name: string
    last_name: string
    email?: string
  }
}

interface StudentsListClientProps {
  initialStudents: StudentRecord[]
  userRoles: string[]
  terms: any[]
  classes: any[]
}

export default function StudentsListClient({
  initialStudents,
  userRoles,
  terms,
  classes
}: StudentsListClientProps) {
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents)
  const [search, setSearch] = useState('')

  // 1. Calculate class statistics
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    students.forEach(s => {
      const gl = s.grade_level || 'Unassigned'
      counts[gl] = (counts[gl] || 0) + 1
    })
    return counts
  }, [students])

  // 2. Filter students list by search term
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const term = search.toLowerCase()
    return students.filter(s => {
      const fullName = `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.toLowerCase()
      const studentId = s.student_id?.toLowerCase() || ''
      const email = s.profiles?.email?.toLowerCase() || ''
      const parentContact = s.parent_contact?.toLowerCase() || ''

      return fullName.includes(term) || 
             studentId.includes(term) || 
             email.includes(term) || 
             parentContact.includes(term)
    })
  }, [students, search])

  // Determine report card generation link depending on role
  const getReportCardLink = () => {
    if (userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Director')) {
      return '/dashboard/principal/report-cards'
    }
    if (userRoles.includes('Dean')) {
      return '/dashboard/dean/report-cards'
    }
    if (userRoles.includes('Teacher')) {
      return '/dashboard/teacher/report-cards'
    }
    return '#'
  }

  const reportLink = getReportCardLink()

  const handlePhotoUpdated = (studentId: string, newUrl: string | null) => {
    setStudents(prev => 
      prev.map(s => s.id === studentId ? { ...s, photo_url: newUrl } : s)
    )
  }

  const canEnroll = userRoles.includes('System Admin') || 
                    userRoles.includes('Director') || 
                    userRoles.includes('Principal') || 
                    userRoles.includes('Dean')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Student Directory</h1>
        {canEnroll && (
          <Link href="/dashboard/students/enroll" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <UserPlus size={18} /> Enroll Student
          </Link>
        )}
      </div>

      {/* Analytics Grid */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} style={{ color: 'var(--color-secondary)' }} />
          Enrollment Count per Grade Level
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
          {Object.entries(gradeCounts).map(([grade, count]) => (
            <div key={grade} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{grade}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{count}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Students</div>
            </div>
          ))}
          {Object.keys(gradeCounts).length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No class enrollments found.</p>
          )}
        </div>
      </div>

      {/* Search Input Box */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text" 
            placeholder="Search by student name, admission number, email, parent contact..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1.25rem', borderRadius: 'var(--radius-md)' }}
          />
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', width: '90px', fontWeight: 600 }}>Photo</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Student ID</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Grade & Section</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Contact Details</th>
              <th style={{ padding: '1rem', width: '180px', textAlign: 'right', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
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
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{s.profiles?.email || 'No email'}</div>
                  {s.parent_contact && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                      Parent: {s.parent_contact}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {reportLink !== '#' ? (
                    <Link 
                      href={reportLink}
                      className="btn btn-secondary"
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: 'var(--color-secondary)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.45rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <FileSpreadsheet size={14} />
                      Report Cards
                    </Link>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No Action</span>
                  )}
                </td>
              </tr>
            ))}
            
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No students matching your search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
