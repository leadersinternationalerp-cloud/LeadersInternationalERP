'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import StudentPhotoManager from '@/components/StudentPhotoManager'
import { Search, UserPlus, FileSpreadsheet, Users } from 'lucide-react'
import { updateStudentAction, toggleStudentActiveAction } from './enroll/actions'

interface StudentRecord {
  id: string
  student_id: string
  photo_url: string | null
  grade_level: string
  section?: string
  parent_contact?: string
  class_id?: string
  is_active?: boolean
  profiles?: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
    is_active?: boolean
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

  // Edit modal state
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    grade_level: '',
    section: ''
  })
  const [saving, setSaving] = useState(false)

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

  const handleStartEdit = (student: StudentRecord) => {
    setEditingStudent(student)
    setEditForm({
      first_name: student.profiles?.first_name || '',
      last_name: student.profiles?.last_name || '',
      email: student.profiles?.email || '',
      phone: student.profiles?.phone || student.parent_contact || '',
      grade_level: student.grade_level || 'Grade 1',
      section: student.section || ''
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return

    setSaving(true)
    try {
      const res = await updateStudentAction(editingStudent.id, editForm)
      if (res.error) {
        alert(res.error)
      } else {
        alert('Student details successfully updated!')
        
        // Update local state state to reflect changes instantly
        setStudents(prev => 
          prev.map(s => s.id === editingStudent.id ? {
            ...s,
            grade_level: editForm.grade_level,
            section: editForm.section,
            parent_contact: editForm.phone || s.parent_contact,
            profiles: s.profiles ? {
              ...s.profiles,
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              email: editForm.email,
              phone: editForm.phone
            } : undefined
          } : s)
        )
        setEditingStudent(null)
      }
    } catch (err: any) {
      alert(`An error occurred: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (student: StudentRecord) => {
    const isCurrentlyActive = student.is_active !== false
    const actionText = isCurrentlyActive ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${actionText} ${student.profiles?.first_name || 'this student'}?`)) {
      return
    }

    try {
      const res = await toggleStudentActiveAction(student.id, isCurrentlyActive)
      if (res.error) {
        alert(res.error)
      } else {
        alert(`Student successfully ${res.is_active ? 'activated' : 'deactivated'}!`)
        // Update local state state to reflect status changes instantly
        setStudents(prev => 
          prev.map(s => s.id === student.id ? { ...s, is_active: res.is_active } : s)
        )
      }
    } catch (err: any) {
      alert(`An error occurred: ${err.message}`)
    }
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
              <th style={{ padding: '1rem', width: '340px', textAlign: 'right', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: s.is_active === false ? 0.6 : 1 }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <StudentPhotoManager 
                    studentId={s.id} 
                    currentPhotoUrl={s.photo_url} 
                    studentName={`${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`}
                    onUploaded={(url) => handlePhotoUpdated(s.id, url)}
                  />
                </td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{s.student_id}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>{s.profiles?.first_name} {s.profiles?.last_name}</span>
                    {s.is_active === false && (
                      <span style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                        fontSize: '0.7rem', fontWeight: 600
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>
                </td>
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
                  {s.parent_contact && s.parent_contact !== 'No phone' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                      Phone: {s.parent_contact}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {reportLink !== '#' && (
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
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <FileSpreadsheet size={14} />
                        Report Cards
                      </Link>
                    )}
                    {canEnroll && (
                      <>
                        <button
                          onClick={() => handleStartEdit(s)}
                          className="btn btn-primary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            border: 'none'
                          }}
                        >
                          ✏ Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(s)}
                          className="btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: s.is_active !== false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: s.is_active !== false ? 'var(--color-error)' : 'var(--color-success)'
                          }}
                        >
                          {s.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    )}
                  </div>
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

      {/* Edit Student Modal Overlay */}
      {editingStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '500px',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            backgroundColor: 'var(--color-bg-primary, #ffffff)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                Edit Student Details
              </h2>
              <button 
                onClick={() => setEditingStudent(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>First Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                    value={editForm.first_name}
                    onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>Last Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                    value={editForm.last_name}
                    onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  style={{ width: '100%' }}
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%' }}
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +255712345678"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>Grade Level *</label>
                  <select
                    className="input-field"
                    style={{ width: '100%', padding: '0.6rem' }}
                    required
                    value={editForm.grade_level}
                    onChange={e => setEditForm({ ...editForm, grade_level: e.target.value })}
                  >
                    <optgroup label="Early Years">
                      <option value="Baby Class">Baby Class</option>
                      <option value="Playgroup">Playgroup</option>
                      <option value="Nursery">Nursery</option>
                      <option value="Reception">Reception</option>
                      <option value="KG1">KG1</option>
                      <option value="KG2">KG2</option>
                      <option value="Pre-Primary">Pre-Primary</option>
                    </optgroup>
                    <optgroup label="Primary">
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                    </optgroup>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>Section</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%' }}
                    value={editForm.section}
                    onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                    placeholder="e.g. A"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingStudent(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
