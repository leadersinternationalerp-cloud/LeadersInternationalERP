'use client'

import { useState } from 'react'
import { searchParentsAction, enrollStudentAction } from './actions'

export default function EnrollmentClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    nationality: 'Tanzanian',
    grade_level: 'Grade 1',
    section: 'A',
    parent_id: '',
    relationship: 'Parent'
  })

  // Parent search state
  const [parentSearch, setParentSearch] = useState('')
  const [parentResults, setParentResults] = useState<any[]>([])
  const [selectedParent, setSelectedParent] = useState<any>(null)
  const [searching, setSearching] = useState(false)

  const handleSearchParent = async () => {
    if (!parentSearch.trim()) return
    setSearching(true)
    const res = await searchParentsAction(parentSearch)
    setSearching(false)
    if (res?.data) {
      setParentResults(res.data)
    }
  }

  const selectParent = (parent: any) => {
    setSelectedParent(parent)
    setFormData({ ...formData, parent_id: parent.id })
    setParentSearch('')
    setParentResults([])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await enrollStudentAction(formData)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess(`Student enrolled successfully! Generated ID: ${res.student_id}`)
      // Reset form if desired
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      
      {/* Main Form */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Student Information</h2>

        {error && <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{error}</div>}
        {success && <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="input-field" required />
          </div>

          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="input-field" required />
          </div>

          <div className="form-group">
            <label className="form-label">Email (Optional)</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" />
          </div>

          <div className="form-group">
            <label className="form-label">Phone (Optional)</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="input-field" />
          </div>

          <div className="form-group">
            <label className="form-label">Date of Birth *</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="input-field" required />
          </div>

          <div className="form-group">
            <label className="form-label">Gender *</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="input-field" required>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nationality *</label>
            <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="input-field" required />
          </div>

          <div className="form-group">
            <label className="form-label">Enrollment Class *</label>
            <select name="grade_level" value={formData.grade_level} onChange={handleChange} className="input-field" required>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Section</label>
            <input type="text" name="section" value={formData.section} onChange={handleChange} className="input-field" placeholder="e.g. A" />
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enrolling...' : 'Complete Enrollment'}
          </button>
        </div>
      </form>

      {/* Parent Sidebar */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>Link Parent/Guardian</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Search for an existing parent in the system to link them to this student.
        </p>

        {selectedParent ? (
          <div style={{ padding: '1rem', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>Linked Parent</div>
            <div>{selectedParent.first_name} {selectedParent.last_name}</div>
            <div style={{ fontSize: '0.85rem' }}>{selectedParent.email}</div>
            <button 
              type="button"
              onClick={() => { setSelectedParent(null); setFormData({...formData, parent_id: ''}) }}
              className="btn"
              style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
            >
              Remove Link
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Search name/email" 
                value={parentSearch}
                onChange={e => setParentSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchParent()}
                className="input-field"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={handleSearchParent} className="btn" style={{ padding: '0.5rem' }} disabled={searching}>
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {parentResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {parentResults.map(p => (
                  <div key={p.id} style={{ padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => selectParent(p)}>
                    <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.email}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
