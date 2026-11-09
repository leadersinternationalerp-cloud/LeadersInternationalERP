'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import StudentPhotoManager from '@/components/StudentPhotoManager'
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  Users,
  Receipt,
  User,
  Sparkles,
  School,
  CheckCircle2,
  X,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'
import {
  updateStudentAction,
  toggleStudentActiveAction,
  generateSingleStudentInvoiceAction,
} from './enroll/actions'

interface StudentRecord {
  id: string
  student_id: string
  photo_url: string | null
  grade_level: string
  section?: string
  parent_contact?: string
  class_id?: string
  source?: string
  sales_agent_name?: string
  is_active?: boolean
  profiles?: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
    is_active?: boolean
  }
}

interface ClassRecord {
  id: string
  name: string
  class_name?: string
  section?: string
  grade_level?: string
}

interface StudentsListClientProps {
  initialStudents: StudentRecord[]
  userRoles: string[]
  terms: any[]
  classes: ClassRecord[]
}

export default function StudentsListClient({
  initialStudents,
  userRoles,
  terms,
  classes = [],
}: StudentsListClientProps) {
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents)
  const [search, setSearch] = useState('')

  // Edit modal state (Class placement & student info)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    grade_level: '',
    section: '',
    class_id: '',
  })
  const [saving, setSaving] = useState(false)

  // Invoice generator modal state (Requirement 3)
  const [invoicingStudent, setInvoicingStudent] = useState<StudentRecord | null>(null)
  const [invoiceTerm, setInvoiceTerm] = useState('Term 1')
  const [invoiceYear, setInvoiceYear] = useState('2026/2027')
  const [invoicing, setInvoicing] = useState(false)
  const [invoiceStatus, setInvoiceStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 1. Calculate class statistics
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    students.forEach((s) => {
      const gl = s.grade_level || 'Unassigned'
      counts[gl] = (counts[gl] || 0) + 1
    })
    return counts
  }, [students])

  // 2. Filter students list by search term
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const term = search.toLowerCase()
    return students.filter((s) => {
      const fullName = `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.toLowerCase()
      const studentId = s.student_id?.toLowerCase() || ''
      const email = s.profiles?.email?.toLowerCase() || ''
      const parentContact = s.parent_contact?.toLowerCase() || ''
      const sales = s.sales_agent_name?.toLowerCase() || ''
      const grade = s.grade_level?.toLowerCase() || ''

      return (
        fullName.includes(term) ||
        studentId.includes(term) ||
        email.includes(term) ||
        parentContact.includes(term) ||
        sales.includes(term) ||
        grade.includes(term)
      )
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
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, photo_url: newUrl } : s))
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
      section: student.section || '',
      class_id: student.class_id || '',
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
        alert('Student details and class placement successfully updated!')

        // Update local state to reflect changes instantly
        setStudents((prev) =>
          prev.map((s) =>
            s.id === editingStudent.id
              ? {
                  ...s,
                  grade_level: editForm.grade_level,
                  section: editForm.section,
                  class_id: editForm.class_id || s.class_id,
                  parent_contact: editForm.phone || s.parent_contact,
                  profiles: s.profiles
                    ? {
                        ...s.profiles,
                        first_name: editForm.first_name,
                        last_name: editForm.last_name,
                        email: editForm.email,
                        phone: editForm.phone,
                      }
                    : undefined,
                }
              : s
          )
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
        setStudents((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, is_active: res.is_active } : s))
        )
      }
    } catch (err: any) {
      alert(`An error occurred: ${err.message}`)
    }
  }

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoicingStudent) return

    setInvoicing(true)
    setInvoiceStatus(null)

    try {
      const res = await generateSingleStudentInvoiceAction(
        invoicingStudent.id,
        invoiceTerm,
        invoiceYear
      )

      if (res.error) {
        setInvoiceStatus({ text: res.error, type: 'error' })
      } else {
        setInvoiceStatus({
          text: `✓ Invoice successfully generated! Amount: ${new Intl.NumberFormat('en-TZ', {
            style: 'currency',
            currency: 'TZS',
            minimumFractionDigits: 0,
          }).format(res.total_amount || 0)} for ${invoiceTerm} (${invoiceYear})`,
          type: 'success',
        })
      }
    } catch (err: any) {
      setInvoiceStatus({ text: `Failed to generate invoice: ${err.message}`, type: 'error' })
    } finally {
      setInvoicing(false)
    }
  }

  const canEnroll =
    userRoles.includes('System Admin') ||
    userRoles.includes('Director') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Dean') ||
    userRoles.includes('Head of Section') ||
    userRoles.includes('Sales')

  const canInvoice =
    userRoles.includes('System Admin') ||
    userRoles.includes('Director') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Accountant')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>Student Directory</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Enrolled learners, class placement, fee billing, and learner attribution.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/dashboard/principal/admissions"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <School size={16} /> Admissions Desk
          </Link>

          {canEnroll && (
            <Link
              href="/dashboard/students/enroll"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <UserPlus size={18} /> Enroll Student
            </Link>
          )}
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} style={{ color: 'var(--color-secondary)' }} />
          Enrollment Count per Grade Level
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
          {Object.entries(gradeCounts).map(([grade, count]) => (
            <div
              key={grade}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-primary)' }}>{count}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{grade}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', width: '80px', fontWeight: 600 }}>Photo</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Student ID</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Class & Grade</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Attributed To</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Contact Details</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, minWidth: '320px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => {
              const matchedClass = classes.find((c) => c.id === s.class_id)
              const classNameDisplay = matchedClass
                ? `${matchedClass.name || matchedClass.class_name}${matchedClass.section ? ` (${matchedClass.section})` : ''}`
                : null

              const isSales = Boolean(s.sales_agent_name || s.source === 'sales')

              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    opacity: s.is_active === false ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StudentPhotoManager
                      studentId={s.id}
                      currentPhotoUrl={s.photo_url}
                      studentName={`${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`}
                      onUploaded={(url) => handlePhotoUpdated(s.id, url)}
                    />
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, fontFamily: 'monospace' }}>{s.student_id}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        {s.profiles?.first_name} {s.profiles?.last_name}
                      </span>
                      {s.is_active === false && (
                        <span
                          style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-error)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        >
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Class & Grade Placement */}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {classNameDisplay ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--color-success)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            width: 'fit-content',
                          }}
                        >
                          <School size={12} />
                          {classNameDisplay}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            color: '#b45309',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            width: 'fit-content',
                          }}
                        >
                          Unplaced in Class
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Grade: {s.grade_level} {s.section ? `- ${s.section}` : ''}
                      </span>
                    </div>
                  </td>

                  {/* Attribution Badge */}
                  <td style={{ padding: '1rem' }}>
                    {isSales ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          backgroundColor: '#eef2ff',
                          color: '#4338ca',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1px solid #c7d2fe',
                        }}
                        title={`Attributed to: ${s.sales_agent_name || 'Sales Agent'}`}
                      >
                        <User size={12} />
                        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.sales_agent_name || 'Sales Agent'}
                        </span>
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1px solid #a7f3d0',
                        }}
                        title="Direct Website Applicant"
                      >
                        <Sparkles size={12} />
                        <span>(website)</span>
                      </span>
                    )}
                  </td>

                  {/* Contact */}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{s.profiles?.email || 'No email'}</div>
                    {s.parent_contact && s.parent_contact !== 'No phone' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        Phone: {s.parent_contact}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {/* Generate Invoice Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setInvoicingStudent(s)
                          setInvoiceStatus(null)
                        }}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: 'var(--color-primary)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-md)',
                        }}
                        title="Generate Fee Invoice for Student"
                      >
                        <Receipt size={13} />
                        <span>Invoice</span>
                      </button>

                      {/* Edit / Class Placement Button */}
                      {canEnroll && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className="btn btn-primary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                          }}
                          title="Place in Class & Edit Details"
                        >
                          ✏ Edit
                        </button>
                      )}

                      {/* Report Cards */}
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
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <FileSpreadsheet size={13} />
                          <span>Reports</span>
                        </Link>
                      )}

                      {/* Activate / Deactivate */}
                      {canEnroll && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(s)}
                          className="btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: s.is_active !== false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: s.is_active !== false ? 'var(--color-error)' : 'var(--color-success)',
                          }}
                        >
                          {s.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No students matching your search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit & Class Placement Modal (Requirement 3) */}
      {editingStudent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setEditingStudent(null)}
        >
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              width: '100%',
              maxWidth: '650px',
              backgroundColor: 'var(--color-surface)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--color-primary)' }}>
                  Edit Student & Class Placement
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Student ID: <strong>{editingStudent.student_id}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Class Placement Dropdown */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <School size={16} /> Place in Class
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem' }}
                  value={editForm.class_id}
                  onChange={(e) => {
                    const selectedId = e.target.value
                    const matched = classes.find((c) => c.id === selectedId)
                    setEditForm({
                      ...editForm,
                      class_id: selectedId,
                      grade_level: matched?.grade_level || matched?.name || editForm.grade_level,
                      section: matched?.section || editForm.section,
                    })
                  }}
                >
                  <option value="">-- No Specific Class Assigned --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.class_name} {c.section ? `(${c.section})` : ''} - {c.grade_level || ''}
                    </option>
                  ))}
                </select>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#047857' }}>
                  Assigning a class places the student in the class register and links them to the teacher timetable.
                </p>
              </div>

              {/* Personal Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="input-field"
                  style={{ width: '100%' }}
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%' }}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +255712345678"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                    Grade Level *
                  </label>
                  <select
                    className="input-field"
                    style={{ width: '100%', padding: '0.6rem' }}
                    required
                    value={editForm.grade_level}
                    onChange={(e) => setEditForm({ ...editForm, grade_level: e.target.value })}
                  >
                    <optgroup label="Cambridge Curriculum">
                      <option value="Cambridge Early Years 1">Cambridge Early Years 1</option>
                      <option value="Cambridge Early Years 2">Cambridge Early Years 2</option>
                      <option value="Cambridge Year 1">Cambridge Year 1</option>
                      <option value="Cambridge Year 2">Cambridge Year 2</option>
                      <option value="Cambridge Year 3">Cambridge Year 3</option>
                      <option value="Cambridge Year 4">Cambridge Year 4</option>
                      <option value="Cambridge Year 5">Cambridge Year 5</option>
                      <option value="Cambridge Year 6">Cambridge Year 6</option>
                      <option value="Cambridge Year 7">Cambridge Year 7</option>
                      <option value="Cambridge Year 8">Cambridge Year 8</option>
                      <option value="Cambridge Year 9">Cambridge Year 9</option>
                    </optgroup>
                    <optgroup label="Early Years">
                      <option value="Baby Class">Baby Class</option>
                      <option value="Playgroup">Playgroup</option>
                      <option value="Nursery">Nursery</option>
                      <option value="Reception">Reception</option>
                      <option value="KG1">KG1</option>
                      <option value="KG2">KG2</option>
                      <option value="Pre-Primary">Pre-Primary</option>
                    </optgroup>
                    <optgroup label="Primary (NECTA)">
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                    </optgroup>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                    Section / Stream
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%' }}
                    value={editForm.section}
                    onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                    placeholder="e.g. A, Blue, Gold"
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
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Fee Invoice Generator Modal (Requirement 3) */}
      {invoicingStudent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setInvoicingStudent(null)}
        >
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              width: '100%',
              maxWidth: '520px',
              backgroundColor: 'var(--color-surface)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={20} /> Generate Fee Invoice
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Student: <strong>{invoicingStudent.profiles?.first_name} {invoicingStudent.profiles?.last_name}</strong> ({invoicingStudent.student_id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInvoicingStudent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            {invoiceStatus && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  backgroundColor: invoiceStatus.type === 'success' ? '#ecfdf5' : '#fff1f2',
                  color: invoiceStatus.type === 'success' ? '#065f46' : '#9f1239',
                  border: `1px solid ${invoiceStatus.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
                }}
              >
                {invoiceStatus.text}
              </div>
            )}

            <form onSubmit={handleGenerateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Academic Year
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%' }}
                  value={invoiceYear}
                  onChange={(e) => setInvoiceYear(e.target.value)}
                >
                  <option value="2026/2027">2026/2027</option>
                  <option value="2025/2026">2025/2026</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Term
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%' }}
                  value={invoiceTerm}
                  onChange={(e) => setInvoiceTerm(e.target.value)}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Grade Level: <strong>{invoicingStudent.grade_level}</strong>
                <br />
                Fee structure amounts configured for this grade level will be billed automatically.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <Link
                  href="/dashboard/accountant/invoices"
                  className="btn btn-secondary text-xs"
                  style={{ textDecoration: 'none' }}
                >
                  View All Invoices →
                </Link>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setInvoicingStudent(null)}
                    disabled={invoicing}
                  >
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={invoicing}>
                    {invoicing ? 'Generating...' : 'Generate Invoice'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
