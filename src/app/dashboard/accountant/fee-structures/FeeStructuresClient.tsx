'use client'

import { useState } from 'react'
import { Info, Printer, FileDown, MessageSquare, Pencil, RefreshCw, X } from 'lucide-react'
import { saveFeeStructureAction, updateFeeStructureAction, seed2027FeeStructuresAction } from '../actions'

interface FeeStructure {
  id: string
  academic_year: string
  term: string
  grade_level: string
  fee_type: string
  amount: number
  monthly_amount?: number | null
  annual_amount?: number | null
  wing?: string | null
  due_date?: string | null
  description?: string
  payable_once?: boolean
  payable_annually?: boolean
}

interface FeeStructuresClientProps {
  fees: FeeStructure[]
  systemGrades: string[]
  academicYears: string[]
  canWrite: boolean
  handleDeleteAction: (formData: FormData) => Promise<void>
}

export default function FeeStructuresClient({
  fees,
  systemGrades,
  academicYears,
  canWrite,
  handleDeleteAction,
}: FeeStructuresClientProps) {
  // Filter States
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterTerm, setFilterTerm] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterWing, setFilterWing] = useState<string>('all')

  // Modal State for WhatsApp
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  // Edit Modal State
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Seed 2027 State
  const [seeding, setSeeding] = useState(false)

  // Form State
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Filter logic
  const filteredFees = fees.filter((fee) => {
    const inferredWing =
      fee.wing || (fee.grade_level.toLowerCase().includes('cambridge') ? 'Cambridge' : 'NECTA')
    const matchYear = filterYear === 'all' || fee.academic_year === filterYear
    const matchTerm = filterTerm === 'all' || fee.term === filterTerm
    const matchGrade = filterGrade === 'all' || fee.grade_level === filterGrade
    const matchWing = filterWing === 'all' || inferredWing.toLowerCase() === filterWing.toLowerCase()
    return matchYear && matchTerm && matchGrade && matchWing
  })

  // Format currency helper
  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Print helper
  function handlePrint() {
    window.print()
  }

  // PDF Export helper
  function handleExportPDF(wingOverride?: string, yearOverride?: string) {
    const params = new URLSearchParams({
      academic_year: yearOverride || filterYear,
      term: filterTerm,
      grade_level: filterGrade,
    })
    const activeWing = wingOverride || (filterWing !== 'all' ? filterWing : '')
    if (activeWing) {
      params.set('wing', activeWing)
    }
    window.open(`/api/accountant/fee-structures/pdf?${params.toString()}`, '_blank')
  }

  async function handleSeed2027() {
    setSeeding(true)
    try {
      const res = await seed2027FeeStructuresAction()
      if (res.error) {
        alert(res.error)
      } else {
        alert(
          res.inserted && res.inserted > 0
            ? `Successfully ingested ${res.inserted} official 2027 Cambridge & NECTA fee items.`
            : 'All 2027 official Cambridge & NECTA fee structures are already ingested.'
        )
        window.location.reload()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to sync 2027 fee structures')
    } finally {
      setSeeding(false)
    }
  }

  // Send to WhatsApp handler
  function handleSendWhatsapp() {
    if (!whatsappNumber.trim()) {
      alert('Please enter a WhatsApp phone number')
      return
    }

    let cleanPhone = whatsappNumber.replace(/[+\s-]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '255' + cleanPhone.substring(1)
    }

    const headerStr = `*LEADERS INTERNATIONAL SCHOOL*\n*FEE STRUCTURE SUMMARY*\n\n`
    const filterInfo = `*Academic Year:* ${filterYear === 'all' ? 'All' : filterYear}\n*Term:* ${filterTerm === 'all' ? 'All' : filterTerm}\n*Grade / Class:* ${filterGrade === 'all' ? 'All' : filterGrade}\n\n`

    let itemsStr = `*Fee Items List:*\n`
    let total = 0
    filteredFees.forEach((fee) => {
      const freqLabel = fee.payable_once ? 'Once' : fee.payable_annually ? 'Annually' : 'Termly'
      const formattedVal = formatTZS(fee.amount).replace('TZS', 'TZS ')
      itemsStr += `- ${fee.fee_type} (${fee.grade_level} - ${freqLabel}): ${formattedVal}\n`
      total += Number(fee.amount)
    })

    const totalStr = `\n*Total Combined Fees:* ${formatTZS(total).replace('TZS', 'TZS ')}\n`
    const pdfUrl = `${window.location.origin}/api/accountant/fee-structures/pdf?academic_year=${filterYear}&term=${filterTerm}&grade_level=${filterGrade}${filterWing !== 'all' ? `&wing=${filterWing}` : ''}`
    const downloadStr = `\nDownload full PDF report here:\n${pdfUrl}`

    const finalMessage = encodeURIComponent(headerStr + filterInfo + itemsStr + totalStr + downloadStr)
    window.open(`https://wa.me/${cleanPhone}?text=${finalMessage}`, '_blank')
    setIsWhatsappModalOpen(false)
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await saveFeeStructureAction(formData)
      if (res.error) {
        setFormError(res.error)
      } else {
        e.currentTarget.reset()
        window.location.reload()
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingFee) return
    setEditSaving(true)
    setEditError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await updateFeeStructureAction(editingFee.id, formData)
      if (res.error) {
        setEditError(res.error)
      } else {
        setEditingFee(null)
        window.location.reload()
      }
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update fee item')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Read-only notification banner for Accountant */}
      {!canWrite && (
        <div
          className="glass-panel"
          style={{
            padding: '1rem',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            backgroundColor: 'rgba(59, 130, 246, 0.03)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: 'var(--color-text)',
          }}
        >
          <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span>
            Fee configurations are read-only for Accountant accounts. To request modifications, contact a Principal or
            Director.
          </span>
        </div>
      )}

      {/* Interactive Filters & Actions Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '130px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>WING</span>
            <select
              className="input-field"
              style={{ padding: '0.4rem' }}
              value={filterWing}
              onChange={(e) => setFilterWing(e.target.value)}
            >
              <option value="all">All Wings</option>
              <option value="Cambridge">Cambridge Wing</option>
              <option value="NECTA">NECTA Wing</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '140px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              ACADEMIC YEAR
            </span>
            <select
              className="input-field"
              style={{ padding: '0.4rem' }}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>TERM</span>
            <select
              className="input-field"
              style={{ padding: '0.4rem' }}
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
            >
              <option value="all">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '150px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              CLASS / GRADE
            </span>
            <select
              className="input-field"
              style={{ padding: '0.4rem' }}
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
            >
              <option value="all">All Classes</option>
              {systemGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleExportPDF('Cambridge', '2027')}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#00264b',
              borderColor: '#00264b',
            }}
            title="Download Official Colored Cambridge Wing 2027 Fee Structure PDF"
          >
            <FileDown size={15} />
            Cambridge 2027 PDF
          </button>

          <button
            type="button"
            onClick={() => handleExportPDF('NECTA', '2027')}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#0d9488',
              borderColor: '#0d9488',
            }}
            title="Download Official Colored NECTA Wing 2027 Fee Structure PDF"
          >
            <FileDown size={15} />
            NECTA 2027 PDF
          </button>

          <button
            type="button"
            onClick={() => handleExportPDF()}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <FileDown size={15} />
            Export Filtered PDF
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={handleSeed2027}
              disabled={seeding}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
              title="Ensure all 2027 Cambridge & NECTA official fee structure items are loaded in database"
            >
              <RefreshCw size={14} />
              {seeding ? 'Syncing...' : 'Sync 2027 Fees'}
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <Printer size={15} />
            Print
          </button>

          <button
            type="button"
            onClick={() => setIsWhatsappModalOpen(true)}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#25D366',
              color: '#ffffff',
              borderColor: '#25D366',
            }}
          >
            <MessageSquare size={15} />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Main Grid: Create form vs list table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: canWrite ? '1fr 2.3fr' : '1fr',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Create Fee Structure Form (Admin/Director/Principal only) */}
        {canWrite && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Create Fee Item</h2>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Wing</label>
                <select name="wing" className="input-field" required defaultValue="Cambridge">
                  <option value="Cambridge">Cambridge Wing</option>
                  <option value="NECTA">NECTA Wing</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select name="academic_year" className="input-field" required defaultValue="2027">
                  {academicYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Term / Instalment</label>
                <select name="term" className="input-field" required>
                  <option value="Term 1">Term 1 (1st Instalment)</option>
                  <option value="Term 2">Term 2 (2nd Instalment)</option>
                  <option value="Term 3">Term 3 (3rd Instalment)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Grade / Class Level</label>
                <select name="grade_level" className="input-field" required>
                  {systemGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Vote Head / Fee Type</label>
                <input
                  type="text"
                  name="fee_type"
                  className="input-field"
                  placeholder="e.g. Tuition, Stationery, Meals (Breakfast & Lunch), Admission Fee"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Term / Instalment Amount (TZS) *</label>
                <input type="number" name="amount" min="0" placeholder="e.g. 620000" className="input-field" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Monthly Equivalent (TZS)
                  </label>
                  <input type="number" name="monthly_amount" min="0" placeholder="e.g. 155000" className="input-field" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Annual Equivalent (TZS)
                  </label>
                  <input type="number" name="annual_amount" min="0" placeholder="e.g. 1860000" className="input-field" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date (Optional)</label>
                <input type="date" name="due_date" className="input-field" />
              </div>

              {/* Payment Frequency Checkboxes */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(0,0,0,0.01)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  PAYMENT FREQUENCY
                </span>

                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.25rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <input type="checkbox" name="payable_once" style={{ width: '15px', height: '15px' }} />
                    Payable Once
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <input type="checkbox" name="payable_annually" style={{ width: '15px', height: '15px' }} />
                    Payable Annually
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  name="description"
                  className="input-field"
                  style={{ minHeight: '65px', resize: 'vertical' }}
                />
              </div>

              {formError && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-error)',
                    fontSize: '0.85rem',
                  }}
                >
                  {formError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: '0.75rem', marginTop: '0.25rem' }}
              >
                {saving ? 'Saving...' : 'Save Fee Item'}
              </button>
            </form>
          </div>
        )}

        {/* Fee Structures Table */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.85rem' }}>Wing / Year</th>
                  <th style={{ padding: '0.85rem' }}>Term</th>
                  <th style={{ padding: '0.85rem' }}>Grade</th>
                  <th style={{ padding: '0.85rem' }}>Vote Head</th>
                  <th style={{ padding: '0.85rem' }}>Term Amount</th>
                  <th style={{ padding: '0.85rem' }}>Monthly / Annual</th>
                  {canWrite && <th style={{ padding: '0.85rem', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((fee) => {
                  const inferredWing =
                    fee.wing || (fee.grade_level.toLowerCase().includes('cambridge') ? 'Cambridge' : 'NECTA')
                  return (
                    <tr key={fee.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: inferredWing === 'Cambridge' ? '#00264b' : '#0d9488' }}>
                          {inferredWing}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{fee.academic_year}</div>
                      </td>
                      <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>
                        <div>{fee.term}</div>
                        {fee.due_date && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Due: {fee.due_date}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(59, 179, 195, 0.1)',
                            color: 'var(--color-secondary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {fee.grade_level}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', fontWeight: 500, fontSize: '0.85rem' }}>
                        <div>{fee.fee_type}</div>
                        {fee.payable_once && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              color: '#d97706',
                              fontWeight: 600,
                            }}
                          >
                            One-Time
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatTZS(fee.amount)}
                      </td>
                      <td style={{ padding: '0.85rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {Number(fee.monthly_amount || 0) > 0 && (
                          <div>Mo: {formatTZS(Number(fee.monthly_amount))}</div>
                        )}
                        {Number(fee.annual_amount || 0) > 0 && (
                          <div>Yr: {formatTZS(Number(fee.annual_amount))}</div>
                        )}
                      </td>
                      {canWrite && (
                        <td style={{ padding: '0.85rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFee(fee)
                                setEditError(null)
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                background: 'rgba(14, 165, 233, 0.1)',
                                border: 'none',
                                color: '#0284c7',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                              }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <form action={handleDeleteAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="id" value={fee.id} />
                              <button
                                type="submit"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-error)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                }}
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}

                {filteredFees.length === 0 && (
                  <tr>
                    <td
                      colSpan={canWrite ? 7 : 6}
                      style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}
                    >
                      No fee structures defined matching filters. Click <strong>Sync 2027 Fees</strong> to load the
                      official Cambridge & NECTA 2027 fee structures.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Fee Item Modal */}
      {editingFee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setEditingFee(null)}
        >
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'var(--color-surface)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                Edit Fee Item — {editingFee.grade_level}
              </h3>
              <button
                type="button"
                onClick={() => setEditingFee(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Wing</label>
                  <select
                    name="wing"
                    className="input-field"
                    defaultValue={
                      editingFee.wing ||
                      (editingFee.grade_level.toLowerCase().includes('cambridge') ? 'Cambridge' : 'NECTA')
                    }
                  >
                    <option value="Cambridge">Cambridge</option>
                    <option value="NECTA">NECTA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Year</label>
                  <input
                    type="text"
                    name="academic_year"
                    className="input-field"
                    required
                    defaultValue={editingFee.academic_year}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Term / Instalment</label>
                  <select name="term" className="input-field" defaultValue={editingFee.term}>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Grade / Class Level</label>
                  <input
                    type="text"
                    name="grade_level"
                    className="input-field"
                    required
                    defaultValue={editingFee.grade_level}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vote Head / Fee Type</label>
                <input
                  type="text"
                  name="fee_type"
                  className="input-field"
                  required
                  defaultValue={editingFee.fee_type}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Term Amount (TZS) *</label>
                  <input
                    type="number"
                    name="amount"
                    min="0"
                    className="input-field"
                    required
                    defaultValue={editingFee.amount}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly (TZS)</label>
                  <input
                    type="number"
                    name="monthly_amount"
                    min="0"
                    className="input-field"
                    defaultValue={editingFee.monthly_amount || 0}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Annual (TZS)</label>
                  <input
                    type="number"
                    name="annual_amount"
                    min="0"
                    className="input-field"
                    defaultValue={editingFee.annual_amount || 0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" name="due_date" className="input-field" defaultValue={editingFee.due_date || ''} />
              </div>

              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" name="payable_once" defaultChecked={Boolean(editingFee.payable_once)} />
                  Payable Once (One-Time)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    name="payable_annually"
                    defaultChecked={Boolean(editingFee.payable_annually)}
                  />
                  Payable Annually
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="input-field"
                  defaultValue={editingFee.description || ''}
                  style={{ minHeight: '60px' }}
                />
              </div>

              {editError && (
                <div style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{editError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingFee(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  {editSaving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Number Dialog Modal */}
      {isWhatsappModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="glass-panel"
            style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '90%' }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#00264b' }}>
              Send to WhatsApp
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Enter the recipient's phone number including country code (e.g. 255712345678 for Tanzania).
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 255712345678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsWhatsappModalOpen(false)}
                className="btn"
                style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsapp}
                className="btn btn-primary"
                style={{ backgroundColor: '#25D366', color: '#ffffff', borderColor: '#25D366' }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
