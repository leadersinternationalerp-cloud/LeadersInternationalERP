'use client'

import { useState, useMemo } from 'react'

import { formatCurrency } from '@/utils/formatters'

export default function InvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [gradeFilter, setGradeFilter] = useState('All')

  const filteredInvoices = useMemo(() => {
    return initialInvoices.filter(inv => {
      const name = `${inv.students?.profiles?.first_name} ${inv.students?.profiles?.last_name}`.toLowerCase()
      const matchesSearch = name.includes(search.toLowerCase()) || inv.students?.student_id?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter
      const matchesGrade = gradeFilter === 'All' || inv.students?.grade_level === gradeFilter
      
      return matchesSearch && matchesStatus && matchesGrade
    })
  }, [initialInvoices, search, statusFilter, gradeFilter])

  return (
    <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      
      {/* Toolbar */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="Search by student name or ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ flex: 1 }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: '150px' }}>
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
          </select>
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="input-field" style={{ width: '150px' }}>
            <option value="All">All Grades</option>
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            Export PDF
          </button>
          <button className="btn" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: '1rem' }}>Student Name</th>
            <th style={{ padding: '1rem' }}>Class / Grade</th>
            <th style={{ padding: '1rem' }}>Term</th>
            <th style={{ padding: '1rem' }}>Amount Billed</th>
            <th style={{ padding: '1rem' }}>Total Paid</th>
            <th style={{ padding: '1rem' }}>Balance</th>
            <th style={{ padding: '1rem' }}>Status</th>
            <th style={{ padding: '1rem' }}>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.map((inv: any) => {
            const balance = Number(inv.net_amount) - Number(inv.total_paid || 0)
            const rowColor = balance === 0 ? 'rgba(16, 185, 129, 0.05)' : (Number(inv.total_paid) > 0 ? 'rgba(247, 178, 57, 0.05)' : 'rgba(239, 68, 68, 0.05)')
            
            return (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: rowColor }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {inv.students?.student_id}</div>
                </td>
                <td style={{ padding: '1rem' }}>{inv.students?.grade_level}</td>
                <td style={{ padding: '1rem' }}>{inv.term}</td>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                  {formatCurrency(inv.net_amount)}
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-success)' }}>
                  {formatCurrency(inv.total_paid || 0)}
                </td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>
                  {formatCurrency(balance)}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 
                      inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 
                      inv.status === 'Partially Paid' ? 'rgba(247, 178, 57, 0.1)' : 
                      'rgba(239, 68, 68, 0.1)',
                    color: 
                      inv.status === 'Paid' ? 'var(--color-success)' : 
                      inv.status === 'Partially Paid' ? 'var(--color-accent)' : 
                      'var(--color-error)'
                  }}>
                    {inv.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  {new Date(inv.due_date).toLocaleDateString()}
                </td>
              </tr>
            )
          })}

          {filteredInvoices.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No invoices found matching your criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
