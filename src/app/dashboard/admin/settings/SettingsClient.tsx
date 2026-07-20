'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { saveSystemSettingsAction, saveAcademicYearAction } from './actions'
import { formatDate } from '@/utils/date'
import {
  parseGradingLevels,
  validateGradingLevels,
  getGradeColor,
  GradeLevel
} from '@/utils/grading'

interface TermDetail {
  term_name: string
  start_date: string
  end_date: string
}

interface AcademicYear {
  id?: string
  name: string
  is_active: boolean
  term_details: TermDetail[]
}

interface SettingsClientProps {
  initialSettings: Record<string, any>
  initialAcademicYears: any[]
}

export default function SettingsClient({
  initialSettings,
  initialAcademicYears,
}: SettingsClientProps) {
  // General settings state
  const [schoolName, setSchoolName] = useState(initialSettings.school_name || '')
  const [schoolMotto, setSchoolMotto] = useState(initialSettings.school_motto || '')
  const [schoolAddress, setSchoolAddress] = useState(initialSettings.school_address || '')
  const [contactEmail, setContactEmail] = useState(initialSettings.contact_email || '')
  const [contactPhone, setContactPhone] = useState(initialSettings.contact_phone || '')
  const [schoolLogo, setSchoolLogo] = useState(initialSettings.school_logo || '')

  // Grading scale thresholds (7 levels Cambridge scale)
  const [levels, setLevels] = useState<GradeLevel[]>(() => {
    return parseGradingLevels(initialSettings.grading_scale)
  })

  const [savingScale, setSavingScale] = useState(false)
  const [scaleMessage, setScaleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Exam Types & Weights state
  const [examTypes, setExamTypes] = useState<any[]>(() => {
    return initialSettings.exam_types || [
      { id: 'test_1', name: 'Test 1', weight: 20 },
      { id: 'opener', name: 'Opener', weight: 20 },
      { id: 'terminal', name: 'Terminal', weight: 60 }
    ]
  })
  const [savingExamTypes, setSavingExamTypes] = useState(false)
  const [examTypesMessage, setExamTypesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeWeight, setNewTypeWeight] = useState(0)

  const handleAddExamType = () => {
    if (!newTypeName.trim()) return
    const id = newTypeName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    if (examTypes.some(t => t.id === id)) {
      alert('An exam type with this name already exists.')
      return
    }
    setExamTypes([...examTypes, { id, name: newTypeName, weight: Number(newTypeWeight) }])
    setNewTypeName('')
    setNewTypeWeight(0)
  }

  const handleRemoveExamType = (id: string) => {
    setExamTypes(examTypes.filter(t => t.id !== id))
  }

  const handleSaveExamTypes = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalWeight = examTypes.reduce((sum, t) => sum + Number(t.weight), 0)
    if (totalWeight !== 100) {
      setExamTypesMessage({ type: 'error', text: `Failed: Total weight must equal exactly 100% (currently ${totalWeight}%).` })
      return
    }

    setSavingExamTypes(true)
    setExamTypesMessage(null)
    try {
      const res = await saveSystemSettingsAction('exam_types', examTypes)
      if (res.error) {
        throw new Error(res.error)
      }
      setExamTypesMessage({ type: 'success', text: 'Exam types and weights saved successfully!' })
    } catch (err: any) {
      setExamTypesMessage({ type: 'error', text: err.message || 'Failed to save settings' })
    } finally {
      setSavingExamTypes(false)
    }
  }

  // Academic Year State
  const [academicYears, setAcademicYears] = useState<any[]>(initialAcademicYears)
  const [yearName, setYearName] = useState('')
  const [t1Start, setT1Start] = useState('')
  const [t1End, setT1End] = useState('')
  const [t2Start, setT2Start] = useState('')
  const [t2End, setT2End] = useState('')
  const [t3Start, setT3Start] = useState('')
  const [t3End, setT3End] = useState('')
  const [activeTerm, setActiveTerm] = useState<string>('Term 3')
  const [isYearActive, setIsYearActive] = useState(false)
  const [editingYearName, setEditingYearName] = useState<string | null>(null)

  const [savingYear, setSavingYear] = useState(false)
  const [yearMessage, setYearMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Handle Logo upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setSettingsMessage(null)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`

      // Create bucket if not exists, then upload
      let uploadResult = await supabase.storage.from('logos').upload(fileName, file)
      if (uploadResult.error && uploadResult.error.message.includes('not found')) {
        await supabase.storage.createBucket('logos', { public: true })
        uploadResult = await supabase.storage.from('logos').upload(fileName, file)
      }

      if (uploadResult.error) {
        throw uploadResult.error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      setSchoolLogo(publicUrl)
      setSettingsMessage({ type: 'success', text: 'School logo uploaded successfully! Click save settings to persist.' })
    } catch (err: any) {
      console.error(err)
      setSettingsMessage({ type: 'error', text: `Logo upload failed: ${err.message}` })
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle saving general settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsMessage(null)

    try {
      // Save settings key-value pairs
      const results = await Promise.all([
        saveSystemSettingsAction('school_name', schoolName),
        saveSystemSettingsAction('school_motto', schoolMotto),
        saveSystemSettingsAction('school_address', schoolAddress),
        saveSystemSettingsAction('contact_email', contactEmail),
        saveSystemSettingsAction('contact_phone', contactPhone),
        saveSystemSettingsAction('school_logo', schoolLogo),
      ])

      const failed = results.find((r) => r.error)
      if (failed) {
        throw new Error(failed.error)
      }

      setSettingsMessage({ type: 'success', text: 'General settings updated successfully!' })
    } catch (err: any) {
      console.error(err)
      setSettingsMessage({ type: 'error', text: `Failed to save settings: ${err.message}` })
    } finally {
      setSavingSettings(false)
    }
  }

  // Handle saving grading scale
  async function handleSaveScale(e: React.FormEvent) {
    e.preventDefault()
    setSavingScale(true)
    setScaleMessage(null)

    const validationError = validateGradingLevels(levels)
    if (validationError) {
      setScaleMessage({ type: 'error', text: validationError })
      setSavingScale(false)
      return
    }

    try {
      const result = await saveSystemSettingsAction('grading_scale', levels)
      if (result.error) {
        throw new Error(result.error)
      }

      setScaleMessage({ type: 'success', text: 'Grading scale settings updated successfully!' })
    } catch (err: any) {
      console.error(err)
      setScaleMessage({ type: 'error', text: `Failed to save grading scale: ${err.message}` })
    } finally {
      setSavingScale(false)
    }
  }

  // Edit an existing year
  function handleEditYear(year: any) {
    setEditingYearName(year.name)
    setYearName(year.name)
    setIsYearActive(year.is_active || false)

    const terms = year.term_details || []
    const t1 = terms.find((t: any) => t.term_name === 'Term 1') || {}
    const t2 = terms.find((t: any) => t.term_name === 'Term 2') || {}
    const t3 = terms.find((t: any) => t.term_name === 'Term 3') || {}

    setT1Start(t1.start_date || '')
    setT1End(t1.end_date || '')
    setT2Start(t2.start_date || '')
    setT2End(t2.end_date || '')
    setT3Start(t3.start_date || '')
    setT3End(t3.end_date || '')

    const currentT = terms.find((t: any) => t.is_current)?.term_name || 'Term 3'
    setActiveTerm(currentT)
    setYearMessage(null)
  }

  // Reset Year Form
  function resetYearForm() {
    setEditingYearName(null)
    setYearName('')
    setT1Start('')
    setT1End('')
    setT2Start('')
    setT2End('')
    setT3Start('')
    setT3End('')
    setActiveTerm('Term 3')
    setIsYearActive(false)
  }

  // Handle saving academic year
  async function handleSaveYear(e: React.FormEvent) {
    e.preventDefault()
    setSavingYear(true)
    setYearMessage(null)

    if (!yearName) {
      setYearMessage({ type: 'error', text: 'Academic Year name is required.' })
      setSavingYear(false)
      return
    }

    const term_details = [
      { term_name: 'Term 1', start_date: t1Start, end_date: t1End, is_current: activeTerm === 'Term 1' },
      { term_name: 'Term 2', start_date: t2Start, end_date: t2End, is_current: activeTerm === 'Term 2' },
      { term_name: 'Term 3', start_date: t3Start, end_date: t3End, is_current: activeTerm === 'Term 3' },
    ]

    try {
      const result = await saveAcademicYearAction(yearName, term_details, isYearActive, activeTerm)
      if (result.error) {
        throw new Error(result.error)
      }

      setYearMessage({
        type: 'success',
        text: `Academic Year "${yearName}" and Term dates saved & synchronized successfully!`,
      })

      // Update state local view
      const updatedYears = [...academicYears]
      const existingIdx = updatedYears.findIndex((y) => y.name === yearName)

      // If active, deactivate others in the local list
      let finalYears = updatedYears
      if (isYearActive) {
        finalYears = updatedYears.map((y) => ({ ...y, is_active: false }))
      }

      const newYearObj = {
        name: yearName,
        term_details,
        is_active: isYearActive,
      }

      if (existingIdx > -1) {
        finalYears[existingIdx] = newYearObj
      } else {
        finalYears.unshift(newYearObj)
      }

      setAcademicYears(finalYears)
      resetYearForm()
    } catch (err: any) {
      console.error(err)
      setYearMessage({ type: 'error', text: `Failed to save academic year: ${err.message}` })
    } finally {
      setSavingYear(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>School & System Settings</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Configure general school parameters, branding, and academic years schedule.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* General Info Panel */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>General Information & Branding</h2>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">School Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {schoolLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={schoolLogo} alt="School Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)' }}>🏫</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {uploadingLogo ? 'Uploading logo to storage...' : 'Recommended square PNG or JPG.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">School Name</label>
              <input
                type="text"
                className="input-field"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Leaders International School"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">School Motto</label>
              <input
                type="text"
                className="input-field"
                value={schoolMotto}
                onChange={(e) => setSchoolMotto(e.target.value)}
                placeholder="e.g. Excellence in Education"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Physical Address</label>
              <textarea
                className="input-field"
                rows={3}
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                placeholder="e.g. 123 Education St, Dar es Salaam"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@leaders.ac.tz"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="input-field"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+255 123 456 789"
                />
              </div>
            </div>

            {settingsMessage && (
              <div style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: settingsMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: settingsMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                fontSize: '0.875rem',
                borderLeft: `4px solid ${settingsMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`
              }}>
                {settingsMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingSettings || uploadingLogo}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}
            >
              {savingSettings ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Exam Types Configurations */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 600 }}>Report Card Exam Types & Weights</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Define the exam types (columns) to appear on the student report cards and set their weights for computing the overall average.
          </p>

          <form onSubmit={handleSaveExamTypes} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {examTypes.map((type, index) => (
                <div key={type.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 40px', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ padding: '0.4rem 0.75rem' }}
                    value={type.name}
                    onChange={(e) => {
                      const newTypes = [...examTypes]
                      newTypes[index] = { ...type, name: e.target.value }
                      setExamTypes(newTypes)
                    }}
                    required
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Weight:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="input-field"
                      style={{ padding: '0.4rem 0.5rem', width: '100%' }}
                      value={type.weight}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        const newTypes = [...examTypes]
                        newTypes[index] = { ...type, weight: isNaN(val) ? 0 : val }
                        setExamTypes(newTypes)
                      }}
                      required
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExamType(type.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 40px', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                <input
                  type="text"
                  placeholder="New exam type (e.g. Midterm)"
                  className="input-field"
                  style={{ padding: '0.4rem 0.75rem' }}
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Weight:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input-field"
                    style={{ padding: '0.4rem 0.5rem', width: '100%' }}
                    value={newTypeWeight}
                    onChange={(e) => setNewTypeWeight(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>%</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddExamType}
                  className="btn"
                  style={{
                    backgroundColor: 'rgba(59, 179, 195, 0.1)',
                    color: 'var(--color-secondary)',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  ➕
                </button>
              </div>
            </div>

            <div style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(0,0,0,0.02)',
              border: '1px solid var(--color-border)'
            }}>
              <span>Total Combined Weight:</span>
              <span style={{
                color: examTypes.reduce((sum, t) => sum + Number(t.weight), 0) === 100 ? 'var(--color-success)' : 'var(--color-error)'
              }}>
                {examTypes.reduce((sum, t) => sum + Number(t.weight), 0)}%
              </span>
            </div>

            {examTypesMessage && (
              <div style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: examTypesMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: examTypesMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                fontSize: '0.875rem',
                borderLeft: `4px solid ${examTypesMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`
              }}>
                {examTypesMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingExamTypes}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {savingExamTypes ? 'Saving scale...' : 'Save Exam Types & Weights'}
            </button>
          </form>
        </div>

        {/* Academic Calendar Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Year Form */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 600 }}>
              {editingYearName ? `Edit Academic Year: ${editingYearName}` : 'Add New Academic Year'}
            </h2>

            <form onSubmit={handleSaveYear} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Academic Year Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  placeholder="e.g. 2026 or 2026/2027"
                  disabled={!!editingYearName} // disable editing name directly to prevent conflict key change
                  required
                />
              </div>

              {/* Term Periods */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>Term Schedule</h3>

                {/* Term 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Term 1</span>
                  <input
                    type="date"
                    className="input-field"
                    style={{ padding: '0.5rem' }}
                    value={t1Start}
                    onChange={(e) => setT1Start(e.target.value)}
                  />
                  <input
                    type="date"
                    className="input-field"
                    style={{ padding: '0.5rem' }}
                    value={t1End}
                    onChange={(e) => setT1End(e.target.value)}
                  />
                </div>

                {/* Term 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Term 2</span>
                  <input
                    type="date"
                    className="input-field"
                    style={{ padding: '0.5rem' }}
                    value={t2Start}
                    onChange={(e) => setT2Start(e.target.value)}
                  />
                  <input
                    type="date"
                    className="input-field"
                    style={{ padding: '0.5rem' }}
                    value={t2End}
                    onChange={(e) => setT2End(e.target.value)}
                  />
                </div>

                {/* Term 3 */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Term 3</span>
                  <input
                    type="date"
                    className="input-field"
                    style={{ padding: '0.5rem' }}
                    value={t3Start}
                    onChange={(e) => setT3Start(e.target.value)}
                  />
                  <input
                    type="date"
                    className="input-field"
                    style={{ padding: '0.5rem' }}
                    value={t3End}
                    onChange={(e) => setT3End(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Active Operational Term *</label>
                <select 
                  className="input-field" 
                  value={activeTerm}
                  onChange={(e) => setActiveTerm(e.target.value)}
                  style={{ padding: '0.6rem', fontWeight: 600, color: 'var(--color-primary)' }}
                >
                  <option value="Term 1">Term 1 (Active Operational Term)</option>
                  <option value="Term 2">Term 2 (Active Operational Term)</option>
                  <option value="Term 3">Term 3 (Active Operational Term)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="is_active_check"
                  checked={isYearActive}
                  onChange={(e) => setIsYearActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="is_active_check" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Set as active academic year
                </label>
              </div>

              <div style={{
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                lineHeight: '1.4'
              }}>
                <strong style={{ color: '#2563eb', display: 'block', marginBottom: '0.2rem' }}>Operational Impact:</strong>
                Saving term start/end dates and marking the active term updates:
                <ul style={{ margin: '0.25rem 0 0 1.2rem', padding: 0 }}>
                  <li><strong>Marks Entry</strong> & assessment submission periods</li>
                  <li><strong>EYFS Progress Observations</strong> active logging period</li>
                  <li><strong>Fee Payment & Billing</strong> structure calculations</li>
                  <li><strong>Report Card Generations</strong> official header dates</li>
                </ul>
              </div>

              {yearMessage && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: yearMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: yearMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                  fontSize: '0.875rem',
                  borderLeft: `4px solid ${yearMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`
                }}>
                  {yearMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                {editingYearName && (
                  <button
                    type="button"
                    className="btn"
                    onClick={resetYearForm}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text)' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingYear}
                  style={{ flex: 2, padding: '0.75rem' }}
                >
                  {savingYear ? 'Saving...' : 'Save Year Schedule'}
                </button>
              </div>
            </form>
          </div>

          {/* Grading Scale Form */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 600 }}>Grading Scale Configurations</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Set the minimum and maximum scores required for each official grade letter.
            </p>

            <form onSubmit={handleSaveScale} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {levels.map((lvl, index) => (
                  <div key={lvl.grade} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontWeight: 600, color: getGradeColor(lvl.grade) }}>Grade {lvl.grade}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Min:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        className="input-field"
                        style={{ padding: '0.4rem', width: '100%' }}
                        value={lvl.min}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          const newLevels = [...levels]
                          newLevels[index] = { ...lvl, min: isNaN(val) ? 0 : val }
                          setLevels(newLevels)
                        }}
                        required
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Max:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        className="input-field"
                        style={{ padding: '0.4rem', width: '100%' }}
                        value={lvl.max}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          const newLevels = [...levels]
                          newLevels[index] = { ...lvl, max: isNaN(val) ? 0 : val }
                          setLevels(newLevels)
                        }}
                        required
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                backgroundColor: 'rgba(0,0,0,0.02)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                lineHeight: '1.4'
              }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Preview Bands:</strong>
                {levels.map((lvl) => (
                  <span key={lvl.grade} style={{ marginRight: '1rem', display: 'inline-block' }}>
                    <span style={{ fontWeight: 600, color: getGradeColor(lvl.grade) }}>{lvl.grade}</span>: {lvl.min}–{lvl.max}%
                  </span>
                ))}
              </div>

              {scaleMessage && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: scaleMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: scaleMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                  fontSize: '0.875rem',
                  borderLeft: `4px solid ${scaleMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`
                }}>
                  {scaleMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingScale}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {savingScale ? 'Saving scale...' : 'Save Grading Scale'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Academic Years List */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Academic Year Schedule List</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '1rem' }}>Academic Year</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Term 1 Period</th>
                <th style={{ padding: '1rem' }}>Term 2 Period</th>
                <th style={{ padding: '1rem' }}>Term 3 Period</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {academicYears.map((year) => {
                const terms = year.term_details || []
                const t1 = terms.find((t: any) => t.term_name === 'Term 1') || {}
                const t2 = terms.find((t: any) => t.term_name === 'Term 2') || {}
                const t3 = terms.find((t: any) => t.term_name === 'Term 3') || {}

                return (
                  <tr key={year.name} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 150ms' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{year.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                        {year.is_active ? (
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--color-success)'
                          }}>
                            Active Year
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            color: 'var(--color-text-muted)'
                          }}>
                            Inactive
                          </span>
                        )}
                        {year.is_active && (
                          <span style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            color: '#2563eb'
                          }}>
                            Current: {terms.find((t: any) => t.is_current)?.term_name || 'Term 3'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {t1.start_date ? `${formatDate(t1.start_date)} to ${formatDate(t1.end_date)}` : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {t2.start_date ? `${formatDate(t2.start_date)} to ${formatDate(t2.end_date)}` : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {t3.start_date ? `${formatDate(t3.start_date)} to ${formatDate(t3.end_date)}` : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleEditYear(year)}
                        className="btn"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          backgroundColor: 'rgba(59, 179, 195, 0.1)',
                          color: 'var(--color-secondary)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        Edit / Set Active
                      </button>
                    </td>
                  </tr>
                )
              })}

              {academicYears.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No academic years configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
