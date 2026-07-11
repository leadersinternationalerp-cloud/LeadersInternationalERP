'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { saveSystemSettingsAction, saveAcademicYearAction } from './actions'
import { formatDate } from '@/utils/date'

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
      { term_name: 'Term 1', start_date: t1Start, end_date: t1End },
      { term_name: 'Term 2', start_date: t2Start, end_date: t2End },
      { term_name: 'Term 3', start_date: t3Start, end_date: t3End },
    ]

    try {
      const result = await saveAcademicYearAction(yearName, term_details, isYearActive)
      if (result.error) {
        throw new Error(result.error)
      }

      setYearMessage({
        type: 'success',
        text: `Academic Year "${yearName}" saved successfully!`,
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="is_active_check"
                  checked={isYearActive}
                  onChange={(e) => setIsYearActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="is_active_check" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
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
