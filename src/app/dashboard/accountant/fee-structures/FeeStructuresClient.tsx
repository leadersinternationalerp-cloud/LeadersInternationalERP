'use client'

import { useState } from 'react'
import { Info, Printer, FileDown, MessageSquare } from 'lucide-react'
import { saveFeeStructureAction } from '../actions'

interface FeeStructure {
  id: string
  academic_year: string
  term: string
  grade_level: string
  fee_type: string
  amount: number
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
  handleDeleteAction
}: FeeStructuresClientProps) {
  // Filter States
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterTerm, setFilterTerm] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')

  // Modal State for WhatsApp
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  // Form State
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Filter logic
  const filteredFees = fees.filter(fee => {
    const matchYear = filterYear === 'all' || fee.academic_year === filterYear
    const matchTerm = filterTerm === 'all' || fee.term === filterTerm
    const matchGrade = filterGrade === 'all' || fee.grade_level === filterGrade
    return matchYear && matchTerm && matchGrade
  })

  // Format currency helper
  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Print helper
  function handlePrint() {
    window.print()
  }

  // PDF Export helper
  function handleExportPDF() {
    const queryParams = new URLSearchParams({
      academic_year: filterYear,
      term: filterTerm,
      grade_level: filterGrade
    }).toString()
    
    window.open(`/api/accountant/fee-structures/pdf?${queryParams}`, '_blank')
  }

  // Send to WhatsApp handler
  function handleSendWhatsapp() {
    if (!whatsappNumber.trim()) {
      alert('Please enter a WhatsApp phone number')
      return
    }

    // Clean phone number (remove +, spaces, leading zeros if with country code)
    let cleanPhone = whatsappNumber.replace(/[+\s-]/g, '')
    if (cleanPhone.startsWith('0')) {
      // Assuming local Tanzania if starts with 0 and no country code
      cleanPhone = '255' + cleanPhone.substring(1)
    }

    // Compose message body
    const headerStr = `*LEADERS INTERNATIONAL SCHOOL*\n*FEE STRUCTURE SUMMARY*\n\n`
    const filterInfo = `*Academic Year:* ${filterYear === 'all' ? 'All' : filterYear}\n*Term:* ${filterTerm === 'all' ? 'All' : filterTerm}\n*Grade / Class:* ${filterGrade === 'all' ? 'All' : filterGrade}\n\n`
    
    let itemsStr = `*Fee Items List:*\n`
    let total = 0
    filteredFees.forEach(fee => {
      const freqLabel = fee.payable_once ? 'Once' : fee.payable_annually ? 'Annually' : 'Termly'
      const formattedVal = formatTZS(fee.amount).replace('TZS', 'TZS ')
      itemsStr += `- ${fee.fee_type} (${fee.grade_level} - ${freqLabel}): ${formattedVal}\n`
      total += Number(fee.amount)
    })

    const totalStr = `\n*Total Combined Fees:* ${formatTZS(total).replace('TZS', 'TZS ')}\n`
    
    // Add PDF download link
    const pdfUrl = `${window.location.origin}/api/accountant/fee-structures/pdf?academic_year=${filterYear}&term=${filterTerm}&grade_level=${filterGrade}`
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
        // Reset form
        e.currentTarget.reset()
        window.location.reload() // Refresh Server Component data cleanly
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Read-only notification banner for Accountant */}
      {!canWrite && (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)', backgroundColor: 'rgba(59, 130, 246, 0.03)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
          <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span>Fee configurations are read-only for Accountant accounts. To request modifications, contact a Principal or Director.</span>
        </div>
      )}

      {/* Interactive Filters & Actions Toolbar */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '150px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>ACADEMIC YEAR</span>
            <select className="input-field" style={{ padding: '0.4rem' }} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="all">All Academic Years</option>
              {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>TERM</span>
            <select className="input-field" style={{ padding: '0.4rem' }} value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
              <option value="all">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '150px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>CLASS / GRADE</span>
            <select className="input-field" style={{ padding: '0.4rem' }} value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
              <option value="all">All Classes</option>
              {systemGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <Printer size={15} />
            Print
          </button>
          <button onClick={handleExportPDF} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <FileDown size={15} />
            Export PDF
          </button>
          <button onClick={() => setIsWhatsappModalOpen(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, backgroundColor: '#25D366', color: '#ffffff', borderColor: '#25D366' }}>
            <MessageSquare size={15} />
            Send WhatsApp
          </button>
        </div>

      </div>

      {/* Main Grid: Create form vs list table */}
      <div style={{ display: 'grid', gridTemplateColumns: canWrite ? '1fr 2.2fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Create Fee Structure Form (Admin/Director/Principal only) */}
        {canWrite && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Create Fee Item</h2>
            
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select name="academic_year" className="input-field" required defaultValue="2025-2026">
                  {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Term</label>
                <select name="term" className="input-field" required>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Grade / Class Level</label>
                <select name="grade_level" className="input-field" required>
                  {systemGrades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fee Type</label>
                <select name="fee_type" className="input-field" required>
                  <option value="Tuition">Tuition</option>
                  <option value="Transport">Transport</option>
                  <option value="Uniform">Uniform</option>
                  <option value="Books">Books</option>
                  <option value="Activities">Activities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (TZS)</label>
                <input type="number" name="amount" min="0" placeholder="e.g. 150000" className="input-field" required />
              </div>

              {/* Payment Frequency Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>PAYMENT FREQUENCY</span>
                
                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                    <input type="checkbox" name="payable_once" style={{ width: '15px', height: '15px' }} />
                    Payable Once
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                    <input type="checkbox" name="payable_annually" style={{ width: '15px', height: '15px' }} />
                    Payable Annually
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea name="description" className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>

              {formError && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
                {saving ? 'Saving...' : 'Save Fee Item'}
              </button>
            </form>
          </div>
        )}

        {/* Fee Structures Table */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Academic Year</th>
                <th style={{ padding: '1rem' }}>Term</th>
                <th style={{ padding: '1rem' }}>Grade</th>
                <th style={{ padding: '1rem' }}>Fee Type</th>
                <th style={{ padding: '1rem' }}>Frequency</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                {canWrite && <th style={{ padding: '1rem' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredFees.map((fee) => (
                <tr key={fee.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>{fee.academic_year}</td>
                  <td style={{ padding: '1rem' }}>{fee.term}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem', borderRadius: '4px',
                      backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)',
                      fontSize: '0.8rem', fontWeight: 600
                    }}>
                      {fee.grade_level}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{fee.fee_type}</td>
                  
                  {/* Frequency display */}
                  <td style={{ padding: '1rem' }}>
                    {fee.payable_once ? (
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', fontWeight: 600 }}>Once</span>
                    ) : fee.payable_annually ? (
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', fontWeight: 600 }}>Annual</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.04)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Termly</span>
                    )}
                  </td>

                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{formatTZS(fee.amount)}</td>
                  {canWrite && (
                    <td style={{ padding: '1rem' }}>
                      <form action={handleDeleteAction}>
                        <input type="hidden" name="id" value={fee.id} />
                        <button type="submit" style={{
                          background: 'transparent', border: 'none', color: 'var(--color-error)',
                          fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
                        }}>
                          Delete
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}

              {filteredFees.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 7 : 6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No fee structures defined matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* WhatsApp Number Dialog Modal */}
      {isWhatsappModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '90%' }}>
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
