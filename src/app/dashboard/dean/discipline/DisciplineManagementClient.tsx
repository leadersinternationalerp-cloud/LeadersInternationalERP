'use client'

import { useState } from 'react'
import { saveDisciplineRecordAction, DisciplineRecordInput } from './actions'

type StudentItem = {
  id: string
  student_id: string
  grade_level: string
  section?: string | null
  profiles?: {
    first_name: string
    last_name: string
    email: string
  } | null
}

type RecordItem = {
  id: string
  student_id: string
  incident_date: string
  category: 'Misconduct' | 'Absenteeism' | 'Academic Dishonesty' | 'Bullying' | 'Other'
  description: string
  action_taken: string
  follow_up_required: boolean
  follow_up_date: string | null
  parent_notified: boolean
  created_at: string
  students?: {
    student_id: string
    profiles?: {
      first_name: string
      last_name: string
    } | null
  } | null
  profiles?: {
    first_name: string
    last_name: string
  } | null // Dean profile creator
}

export default function DisciplineManagementClient({
  students,
  initialRecords
}: {
  students: StudentItem[]
  initialRecords: RecordItem[]
}) {
  // Form State
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<DisciplineRecordInput['category']>('Misconduct')
  const [description, setDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  
  // UI Interaction States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // List Search / Filter State
  const [listSearch, setListSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterFollowUp, setFilterFollowUp] = useState<string>('All')

  // Filter students dropdown
  const filteredStudents = studentSearch.trim() === '' 
    ? [] 
    : students.filter(s => {
        const fullName = `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.toLowerCase()
        const sid = (s.student_id || '').toLowerCase()
        return fullName.includes(studentSearch.toLowerCase()) || sid.includes(studentSearch.toLowerCase())
      }).slice(0, 5)

  // Filtered discipline logs
  const filteredRecords = initialRecords.filter(r => {
    const sName = `${r.students?.profiles?.first_name || ''} ${r.students?.profiles?.last_name || ''}`.toLowerCase()
    const sId = (r.students?.student_id || '').toLowerCase()
    const desc = r.description.toLowerCase()
    const act = r.action_taken.toLowerCase()
    const matchesSearch = sName.includes(listSearch.toLowerCase()) || 
                          sId.includes(listSearch.toLowerCase()) ||
                          desc.includes(listSearch.toLowerCase()) ||
                          act.includes(listSearch.toLowerCase())

    const matchesCategory = filterCategory === 'All' || r.category === filterCategory
    
    let matchesFollowUp = true
    if (filterFollowUp === 'Required') {
      matchesFollowUp = r.follow_up_required
    } else if (filterFollowUp === 'None') {
      matchesFollowUp = !r.follow_up_required
    }

    return matchesSearch && matchesCategory && matchesFollowUp
  })

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) {
      setErrorMsg('Please select a student.')
      return
    }
    
    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const payload: DisciplineRecordInput = {
      student_id: selectedStudent.id,
      incident_date: incidentDate,
      category,
      description,
      action_taken: actionTaken,
      follow_up_required: followUpRequired,
      follow_up_date: followUpRequired ? followUpDate : null
    }

    const res = await saveDisciplineRecordAction(payload)
    setIsSubmitting(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg('Discipline incident logged successfully and parents notified.')
      // Reset Form
      setSelectedStudent(null)
      setStudentSearch('')
      setIncidentDate(new Date().toISOString().split('T')[0])
      setCategory('Misconduct')
      setDescription('')
      setActionTaken('')
      setFollowUpRequired(false)
      setFollowUpDate('')
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(null), 5000)
    }
  }

  // Helper styling for category badges
  function getCategoryBadgeStyle(cat: string) {
    let bg = 'rgba(100, 116, 139, 0.1)'
    let fg = 'var(--color-text-muted)'
    if (cat === 'Misconduct') {
      bg = 'rgba(247, 178, 57, 0.15)'
      fg = 'var(--color-accent)'
    } else if (cat === 'Absenteeism') {
      bg = 'rgba(59, 179, 195, 0.15)'
      fg = 'var(--color-secondary)'
    } else if (cat === 'Academic Dishonesty') {
      bg = 'rgba(239, 68, 68, 0.15)'
      fg = 'var(--color-error)'
    } else if (cat === 'Bullying') {
      bg = 'rgba(220, 38, 38, 0.2)'
      fg = '#b91c1c'
    } else if (cat === 'Other') {
      bg = 'rgba(16, 185, 129, 0.15)'
      fg = 'var(--color-success)'
    }
    return {
      backgroundColor: bg,
      color: fg,
      padding: '0.25rem 0.6rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-block'
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Log Incident Form */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', position: 'sticky', top: '100px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          📝 Log Student Incident
        </h2>
        
        {successMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--color-success)',
            borderLeft: '4px solid var(--color-success)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            fontWeight: 500
          }}>
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-error)',
            borderLeft: '4px solid var(--color-error)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            fontWeight: 500
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Student Selector */}
          <div className="form-group">
            <label className="form-label">Select Student *</label>
            {selectedStudent ? (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(59, 179, 195, 0.05)',
                border: '1px dashed var(--color-secondary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedStudent.profiles?.first_name} {selectedStudent.profiles?.last_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    ID: {selectedStudent.student_id} | Class: {selectedStudent.grade_level}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="btn"
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-error)',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search by student name or ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="input-field"
                />
                
                {/* Search Results Dropdown */}
                {filteredStudents.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 10,
                    marginTop: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedStudent(s)
                          setStudentSearch('')
                        }}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: 500 }}>
                          {s.profiles?.first_name} {s.profiles?.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          ID: {s.student_id} | Class: {s.grade_level}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {studentSearch.trim() !== '' && filteredStudents.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    zIndex: 10,
                    marginTop: '4px',
                    boxShadow: 'var(--shadow-lg)'
                  }}>
                    No students found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Incident Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="incident_date">Incident Date *</label>
            <input
              type="date"
              id="incident_date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="category">Category *</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              <option value="Misconduct">Misconduct</option>
              <option value="Absenteeism">Absenteeism</option>
              <option value="Academic Dishonesty">Academic Dishonesty</option>
              <option value="Bullying">Bullying</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Incident Details / Description *</label>
            <textarea
              id="description"
              placeholder="Provide a detailed description of the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              style={{ minHeight: '100px', resize: 'vertical' }}
              required
            />
          </div>

          {/* Action Taken */}
          <div className="form-group">
            <label className="form-label" htmlFor="action_taken">Action Taken *</label>
            <input
              type="text"
              id="action_taken"
              placeholder="e.g., Parental Conference, Suspension, Counseling"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Follow-up Required Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
            <input
              type="checkbox"
              id="follow_up_required"
              checked={followUpRequired}
              onChange={(e) => setFollowUpRequired(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="follow_up_required" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
              Follow-up required?
            </label>
          </div>

          {/* Follow-up Date */}
          {followUpRequired && (
            <div className="form-group" style={{ animation: 'fadeUp 0.3s ease forwards' }}>
              <label className="form-label" htmlFor="follow_up_date">Follow-up Date *</label>
              <input
                type="date"
                id="follow_up_date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isSubmitting ? 'Saving...' : '💾 Save Discipline Log'}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Searchable History Logs List */}
      <div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>History Logs ({filteredRecords.length})</h3>
            
            {/* Filter Group */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1, justifySelf: 'flex-end', justifyContent: 'flex-end', minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search student or details..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="input-field"
                style={{ width: '200px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              />

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-field"
                style={{ width: '140px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <option value="All">All Categories</option>
                <option value="Misconduct">Misconduct</option>
                <option value="Absenteeism">Absenteeism</option>
                <option value="Academic Dishonesty">Academic Dishonesty</option>
                <option value="Bullying">Bullying</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={filterFollowUp}
                onChange={(e) => setFilterFollowUp(e.target.value)}
                className="input-field"
                style={{ width: '140px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <option value="All">All Follow-ups</option>
                <option value="Required">Follow-up Required</option>
                <option value="None">No Follow-up</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRecords.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              📭 No discipline logs found matching the filter criteria.
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                  borderLeft: `5px solid ${
                    record.category === 'Academic Dishonesty' || record.category === 'Bullying' 
                      ? 'var(--color-error)' 
                      : record.category === 'Misconduct' 
                        ? 'var(--color-accent)' 
                        : 'var(--color-secondary)'
                  }`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {record.students?.profiles?.first_name} {record.students?.profiles?.last_name}
                    </span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      ({record.students?.student_id})
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={getCategoryBadgeStyle(record.category)}>
                      {record.category}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: record.parent_notified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      color: record.parent_notified ? 'var(--color-success)' : 'var(--color-text-muted)',
                      fontWeight: 600
                    }}>
                      💬 Parent {record.parent_notified ? 'Notified' : 'No Link'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                  <div style={{ fontWeight: 500, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Incident Details
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{record.description}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Action Taken:</span>{' '}
                    <span style={{ fontWeight: 500 }}>{record.action_taken}</span>
                  </div>
                  
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Incident Date:</span>{' '}
                    <span>{new Date(record.incident_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                  </div>

                  {record.follow_up_required ? (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>⚠️ Follow-up:</span>{' '}
                      <span style={{ fontWeight: 500 }}>
                        {record.follow_up_date ? new Date(record.follow_up_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Pending'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Follow-up:</span>{' '}
                      <span style={{ color: 'var(--color-text-muted)' }}>Not required</span>
                    </div>
                  )}

                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Logged By:</span>{' '}
                    <span>{record.profiles ? `${record.profiles.first_name} ${record.profiles.last_name}` : 'Unknown'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
