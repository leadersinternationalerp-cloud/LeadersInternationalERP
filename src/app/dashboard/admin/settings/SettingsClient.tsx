'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { saveSystemSettingsAction, saveAcademicYearAction, saveClassAction, deleteClassAction } from './actions'
import { formatDate } from '@/utils/date'
import { Info } from 'lucide-react'
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
  initialClasses: any[]
  teachers: any[]
}

export default function SettingsClient({
  initialSettings,
  initialAcademicYears,
  initialClasses,
  teachers,
}: SettingsClientProps) {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<'general' | 'calendar' | 'grading' | 'classes'>('general')

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

  // Class management state
  const [classesList, setClassesList] = useState<any[]>(initialClasses)
  const [classId, setClassId] = useState<string | null>(null)
  const [className, setClassName] = useState('')
  const [classSection, setClassSection] = useState('')
  const [isEarlyYears, setIsEarlyYears] = useState(false)
  const [ageGroup, setAgeGroup] = useState('')
  const [classTeacherId, setClassTeacherId] = useState('')

  const [savingClass, setSavingClass] = useState(false)
  const [classMessage, setClassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
        text: `Academic Year "${yearName}" saved & synchronized successfully!`,
      })

      const updatedYears = [...academicYears]
      const existingIdx = updatedYears.findIndex((y) => y.name === yearName)

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

  // Handle editing class
  function handleEditClass(cls: any) {
    setClassId(cls.id)
    setClassName(cls.name || '')
    setClassSection(cls.section || '')
    setIsEarlyYears(cls.is_early_years || false)
    setAgeGroup(cls.age_group || '')
    setClassTeacherId(cls.class_teacher_id || '')
    setClassMessage(null)
  }

  // Reset Class Form
  function resetClassForm() {
    setClassId(null)
    setClassName('')
    setClassSection('')
    setIsEarlyYears(false)
    setAgeGroup('')
    setClassTeacherId('')
  }

  // Handle saving class
  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault()
    setSavingClass(true)
    setClassMessage(null)

    if (!className.trim()) {
      setClassMessage({ type: 'error', text: 'Class name is required.' })
      setSavingClass(false)
      return
    }

    try {
      const res = await saveClassAction({
        id: classId || undefined,
        name: className,
        section: classSection,
        is_early_years: isEarlyYears,
        age_group: isEarlyYears ? ageGroup : undefined,
        class_teacher_id: classTeacherId || null
      })

      if (res.error) {
        throw new Error(res.error)
      }

      setClassMessage({
        type: 'success',
        text: `Class "${className}" saved successfully!`
      })

      const supabase = createClient()
      const { data: freshClasses } = await supabase
        .from('classes')
        .select(`
          *,
          class_teacher:class_teacher_id(id, first_name, last_name)
        `)
        .order('name', { ascending: true })

      if (freshClasses) {
        setClassesList(freshClasses)
      }

      resetClassForm()
    } catch (err: any) {
      console.error(err)
      setClassMessage({ type: 'error', text: err.message || 'Failed to save class' })
    } finally {
      setSavingClass(false)
    }
  }

  // Handle deleting class
  async function handleDeleteClass(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete class "${name}"? All associated data like timetables and assignments will be affected.`)) {
      return
    }

    try {
      const res = await deleteClassAction(id)
      if (res.error) {
        throw new Error(res.error)
      }

      setClassesList(classesList.filter(c => c.id !== id))
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const TABS = [
    { id: 'general', label: 'General Info & Branding' },
    { id: 'calendar', label: 'Academic Calendar' },
    { id: 'grading', label: 'Grading Scale' },
    { id: 'classes', label: 'Classes & Sections' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>School & System Settings</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Configure branding, term schedules, classes, and grading scale parameters.</p>
      </div>

      {/* Sub menu tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any)
              setClassMessage(null)
              setYearMessage(null)
              setScaleMessage(null)
              setSettingsMessage(null)
            }}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: activeTab === tab.id ? '#00264b' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--color-text-muted)',
              transition: 'all 150ms ease-in-out'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'general' && (
        <div style={{ maxWidth: '650px' }}>
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
        </div>
      )}

      {activeTab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
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
                  disabled={!!editingYearName}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>Term Schedule</h3>

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
      )}

      {activeTab === 'grading' && (
        <div style={{ maxWidth: '650px' }}>
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
      )}

      {activeTab === 'classes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Class Management Section */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>School Classes & Sections</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Manage available classrooms, assign class teachers, and set up early years specifications.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem', alignItems: 'start' }}>
              
              {/* Class Form */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.01)', border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                  {classId ? `Edit Class: ${className}` : 'Create New Class'}
                </h3>

                <form onSubmit={handleSaveClass} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Class Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="e.g. Grade 1 or Baby Class"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Section / Stream (Optional)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={classSection}
                      onChange={(e) => setClassSection(e.target.value)}
                      placeholder="e.g. A, B, North or South"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Class Teacher</label>
                    <select
                      className="input-field"
                      value={classTeacherId}
                      onChange={(e) => setClassTeacherId(e.target.value)}
                    >
                      <option value="">-- No class teacher assigned --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        id="is_ey_check"
                        checked={isEarlyYears}
                        onChange={(e) => setIsEarlyYears(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="is_ey_check" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        Is Early Years (EYFS)
                      </label>
                    </div>

                    {isEarlyYears && (
                      <div className="form-group" style={{ marginTop: '0.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Age Group</label>
                        <input
                          type="text"
                          className="input-field"
                          style={{ padding: '0.4rem 0.6rem' }}
                          value={ageGroup}
                          onChange={(e) => setAgeGroup(e.target.value)}
                          placeholder="e.g. 1-2y or 3-5y"
                          required={isEarlyYears}
                        />
                      </div>
                    )}
                  </div>

                  {classMessage && (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: classMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: classMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                      fontSize: '0.875rem',
                      borderLeft: `4px solid ${classMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`
                    }}>
                      {classMessage.text}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {classId && (
                      <button
                        type="button"
                        className="btn"
                        onClick={resetClassForm}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text)' }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingClass}
                      style={{ flex: 2, padding: '0.6rem' }}
                    >
                      {savingClass ? 'Saving...' : 'Save Class'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Classes Table List */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Class Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Section</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Age Group</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Class Teacher</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classesList.map((cls) => (
                      <tr key={cls.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 150ms' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{cls.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{cls.section || <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>-</span>}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {cls.is_early_years ? (
                            <span style={{
                              padding: '0.2rem 0.5rem', borderRadius: '4px',
                              backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)',
                              fontSize: '0.75rem', fontWeight: 700
                            }}>
                              Early Years
                            </span>
                          ) : (
                            <span style={{
                              padding: '0.2rem 0.5rem', borderRadius: '4px',
                              backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text-muted)',
                              fontSize: '0.75rem', fontWeight: 600
                            }}>
                              Primary / Regular
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{cls.age_group || <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>-</span>}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                          {cls.class_teacher ? (
                            `${cls.class_teacher.first_name} ${cls.class_teacher.last_name}`
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEditClass(cls)}
                              className="btn"
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.75rem',
                                backgroundColor: 'rgba(59, 179, 195, 0.1)',
                                color: 'var(--color-secondary)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClass(cls.id, `${cls.name} ${cls.section || ''}`.trim())}
                              className="btn"
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.75rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--color-error)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {classesList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          No classes configured in the system yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
