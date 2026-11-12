'use client'

import { useState } from 'react'
import { searchParentsAction, enrollStudentAction } from './actions'
import { Sparkles, Camera, Paperclip, FileCheck, X, Download } from 'lucide-react'

export default function EnrollmentClient({ isReceptionist = false }: { isReceptionist?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [enrolledInvoiceUrl, setEnrolledInvoiceUrl] = useState('')

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    nationality: 'Tanzanian',
    grade_level: 'Cambridge Year 1',
    section: 'A',
    parent_id: '',
    relationship: 'Parent',
    medical_info: '',
    allergies: '',
    language_at_home: 'English',
    previous_school: '',
    emergency_contact: '',
  })

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')

  // Supporting Documents state
  const [supportingDocs, setSupportingDocs] = useState<{ label: string; file: File }[]>([])
  const [customDocLabel, setCustomDocLabel] = useState('Supporting Document')

  // Parent search state
  const [parentSearch, setParentSearch] = useState('')
  const [parentResults, setParentResults] = useState<any[]>([])
  const [selectedParent, setSelectedParent] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [ageWarning, setAgeWarning] = useState('')

  const getAge = (dateString: string) => {
    if (!dateString) return 0
    const today = new Date()
    const birthDate = new Date(dateString)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const checkAge = (dobVal: string, gradeVal: string) => {
    if (!dobVal) {
      setAgeWarning('')
      return
    }
    const age = getAge(dobVal)
    const isEy = [
      'Baby Class',
      'Playgroup',
      'Nursery',
      'Reception',
      'KG1',
      'KG2',
      'Pre-Primary',
      'Cambridge Early Years 1',
      'Cambridge Early Years 2',
    ].includes(gradeVal)
    if (isEy && age >= 6) {
      setAgeWarning(
        `Warning: Child is ${age} years old, which is older than the standard Early Years range (under 6 years).`
      )
    } else if (!isEy && age < 6) {
      setAgeWarning(
        `Warning: Student is ${age} years old, which is younger than the standard Primary range (6+ years).`
      )
    } else {
      setAgeWarning('')
    }
  }

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const updatedForm = { ...formData, [name]: value }
    setFormData(updatedForm)
    if (name === 'dob' || name === 'grade_level') {
      checkAge(name === 'dob' ? value : formData.dob, name === 'grade_level' ? value : formData.grade_level)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.')
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSlotDocSelect = (label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSupportingDocs((prev) => [...prev.filter((d) => d.label !== label), { label, file }])
  }

  const handleAdditionalDocsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const labelBase = customDocLabel.trim() || 'Supporting Document'
    setSupportingDocs((prev) => [
      ...prev,
      ...files.map((file, idx) => ({
        label: files.length > 1 ? `${labelBase} (${idx + 1})` : labelBase,
        file,
      })),
    ])
    e.target.value = ''
  }

  const removeSupportingDoc = (index: number) => {
    setSupportingDocs((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setEnrolledInvoiceUrl('')

    const res = await enrollStudentAction(formData)

    if (res?.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    const generatedStudentId = res.student_id // e.g., STUD-0001
    let docsUploadedCount = 0

    // Upload photo & documents if selected
    if ((photoFile || supportingDocs.length > 0) && generatedStudentId) {
      try {
        // 1. Find the UUID of the student using find API
        const findRes = await fetch(`/api/students/find?code=${generatedStudentId}`)
        const findData = await findRes.json()

        if (!findRes.ok || !findData.student?.id) {
          throw new Error(findData.error || 'Failed to locate student UUID')
        }

        const studentUuid = findData.student.id

        // 2. Upload photo if present
        if (photoFile) {
          const uploadFormData = new FormData()
          uploadFormData.append('student_id', studentUuid)
          uploadFormData.append('photo', photoFile)

          const uploadRes = await fetch('/api/students/photo', {
            method: 'POST',
            body: uploadFormData,
          })
          const uploadData = await uploadRes.json()

          if (!uploadRes.ok) {
            throw new Error(uploadData.error || 'Failed to upload student photo')
          }
        }

        // 3. Upload supporting documents if present
        for (const docItem of supportingDocs) {
          const docFd = new FormData()
          docFd.append('student_id', studentUuid)
          docFd.append('label', docItem.label)
          docFd.append('file', docItem.file)
          const docRes = await fetch('/api/students/documents', {
            method: 'POST',
            body: docFd,
          })
          if (docRes.ok) docsUploadedCount++
        }
      } catch (err: any) {
        setError(`Student enrolled, but attachment upload had an issue: ${err.message}`)
        setLoading(false)
        return
      }
    }

    const invoiceUrl = res.invoice_id
      ? `/api/accountant/invoices/pdf?invoice_id=${encodeURIComponent(res.invoice_id)}&download=1`
      : res.student_user_id
      ? `/api/accountant/invoices/pdf?student_id=${encodeURIComponent(res.student_user_id)}&download=1`
      : ''

    if (res.invoice_id && invoiceUrl) {
      setEnrolledInvoiceUrl(invoiceUrl)
    }

    setSuccess(
      `Student enrolled successfully into ${formData.grade_level} (Stream ${formData.section || 'A'})! Generated ID: ${generatedStudentId}${
        res.invoice_total ? ` • Invoice Generated: TZS ${Number(res.invoice_total).toLocaleString()}` : ''
      }${docsUploadedCount > 0 ? ` • Uploaded ${docsUploadedCount} document(s)` : ''}${
        isReceptionist ? ' • Attributed to: WALK IN' : ''
      }`
    )

    // Reset Form
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      dob: '',
      gender: 'Male',
      nationality: 'Tanzanian',
      grade_level: 'Cambridge Year 1',
      section: 'A',
      parent_id: '',
      relationship: 'Parent',
      medical_info: '',
      allergies: '',
      language_at_home: 'English',
      previous_school: '',
      emergency_contact: '',
    })
    setPhotoFile(null)
    setPhotoPreview('')
    setSupportingDocs([])
    setSelectedParent(null)
    setAgeWarning('')
    setLoading(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      {/* Main Form */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
          Student Information, Class & Stream Placement
        </h2>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--color-success)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <span>{success}</span>
            {enrolledInvoiceUrl && (
              <a
                href={enrolledInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                }}
              >
                <Download size={14} />
                <span>Download Invoice (PDF)</span>
              </a>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="input-field"
              required
            />
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
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="input-field"
              required
            />
            {ageWarning && (
              <div style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500 }}>
                {ageWarning}
              </div>
            )}
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
            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Enrollment Class *</label>
            <select
              name="grade_level"
              value={formData.grade_level}
              onChange={handleChange}
              className="input-field"
              required
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
                <option value="Grade 8">Grade 8</option>
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Stream / Section *</label>
            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. A, B, Blue, Gold"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Language at Home</label>
            <input
              type="text"
              name="language_at_home"
              value={formData.language_at_home}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. English, Swahili"
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Previous School (If any)</label>
            <input
              type="text"
              name="previous_school"
              value={formData.previous_school}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. Kidz Academy"
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Emergency Contact Info (Name & Phone) *</label>
            <input
              type="text"
              name="emergency_contact"
              value={formData.emergency_contact}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. Jane Doe - +255 777 123 456"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Medical Conditions / Info</label>
            <input
              type="text"
              name="medical_info"
              value={formData.medical_info}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. Asthma, none"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Allergies</label>
            <input
              type="text"
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. Peanuts, none"
            />
          </div>

          {[
            'Baby Class',
            'Playgroup',
            'Nursery',
            'Reception',
            'KG1',
            'KG2',
            'Pre-Primary',
            'Cambridge Early Years 1',
            'Cambridge Early Years 2',
          ].includes(formData.grade_level) && (
            <div
              style={{
                gridColumn: 'span 2',
                padding: '1rem',
                backgroundColor: 'rgba(219, 39, 119, 0.05)',
                border: '1px solid rgba(219, 39, 119, 0.15)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ color: '#db2777', fontWeight: 700, fontSize: '0.85rem' }}>Early Years Enrollment Flow</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                This student will be enrolled in the Early Years Foundation Stage (EYFS). They will have access to
                observational recording, evidence uploads, and the custom EYFS progress report card.
              </div>
            </div>
          )}

          {/* Photo Upload Container */}
          <div
            className="form-group"
            style={{
              gridColumn: 'span 2',
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'center',
              padding: '1rem',
              border: '1.5px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255,255,255,0.01)',
              marginTop: '0.5rem',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '95px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.02)',
                flexShrink: 0,
              }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Camera size={18} />
                  <span style={{ fontSize: '0.7rem' }}>No Photo</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                Student Passport Photo
              </label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ fontSize: '0.85rem', width: '100%' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Optional. Max file size: 5MB. Format: JPG/PNG.
              </div>
            </div>
          </div>

          {/* Supporting Admission Documents Upload Container */}
          <div
            className="form-group"
            style={{
              gridColumn: 'span 2',
              padding: '1.25rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(0,0,0,0.015)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div>
              <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.15rem', display: 'block' }}>
                Supporting Admission Documents (Other Documents)
              </label>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Attach Birth Certificate / Passport Copy, Previous School Transfer / Report Card, Medical Card, or other documents.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {[
                'Birth Certificate / Passport',
                'Transfer / Previous Report Card',
                'Medical / Immunization Record',
              ].map((slotLabel) => {
                const attached = supportingDocs.find((d) => d.label === slotLabel)
                return (
                  <label
                    key={slotLabel}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: attached ? '1px solid var(--color-success)' : '1px dashed var(--color-border)',
                      backgroundColor: attached ? 'rgba(16, 185, 129, 0.06)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 600 }}>
                      <span>{slotLabel}</span>
                      {attached ? <FileCheck size={14} style={{ color: 'var(--color-success)' }} /> : <Paperclip size={13} />}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {attached ? attached.file.name : 'Click to attach PDF / Image'}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,image/*,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => handleSlotDocSelect(slotLabel, e)}
                    />
                  </label>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input-field"
                style={{ flex: 1, minWidth: '180px', fontSize: '0.8rem' }}
                placeholder="Custom document label (e.g. Parent ID, Visa)..."
                value={customDocLabel}
                onChange={(e) => setCustomDocLabel(e.target.value)}
              />
              <label
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Paperclip size={14} />
                <span>+ Attach Other Document(s)</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleAdditionalDocsSelect}
                />
              </label>
            </div>

            {supportingDocs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {supportingDocs.map((doc, idx) => (
                  <span
                    key={`${doc.label}-${idx}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <FileCheck size={12} />
                    <strong>{doc.label}:</strong> {doc.file.name}
                    <button
                      type="button"
                      onClick={() => removeSupportingDoc(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '0.25rem' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
            {loading ? 'Enrolling & Uploading...' : 'Complete Enrollment'}
          </button>
        </div>
      </form>

      {/* Right Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Parent Linking */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>Link Parent/Guardian</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Search for an existing parent in the system to link them to this student.
          </p>

          {selectedParent ? (
            <div
              style={{
                padding: '1rem',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>Linked Parent</div>
              <div>
                {selectedParent.first_name} {selectedParent.last_name}
              </div>
              <div style={{ fontSize: '0.85rem' }}>{selectedParent.email}</div>
              <button
                type="button"
                onClick={() => {
                  setSelectedParent(null)
                  setFormData({ ...formData, parent_id: '' })
                }}
                className="btn"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  border: '1px solid var(--color-error)',
                  color: 'var(--color-error)',
                }}
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
                  onChange={(e) => setParentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchParent()}
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSearchParent}
                  className="btn"
                  style={{ padding: '0.5rem' }}
                  disabled={searching}
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>

              {parentResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {parentResults.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                      }}
                      onClick={() => selectParent(p)}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Photo & Documents Info Banner */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: 'rgba(14, 165, 233, 0.05)',
            border: '1px solid rgba(14, 165, 233, 0.15)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              color: '#0284c7',
              fontSize: '0.85rem',
              marginBottom: '0.5rem',
            }}
          >
            <Sparkles size={16} />
            Passport Photo & Admission Documents
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
            Uploading a student passport photo and supporting documents (Birth Certificate, Transfer Letter, Medical
            Record) ensures complete admission records in the student bio-data profile.
          </div>
        </div>
      </div>
    </div>
  )
}
