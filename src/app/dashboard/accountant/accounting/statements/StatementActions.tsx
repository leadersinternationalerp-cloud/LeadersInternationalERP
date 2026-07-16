'use client'

export function StatementActions() {
  const exportExcel = () => {
    // Very basic CSV export logic grabbing all table data
    const tables = document.querySelectorAll('table')
    let csv: string[] = []
    
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr')
      rows.forEach(row => {
        let cols = row.querySelectorAll('td, th')
        let rowData: string[] = []
        cols.forEach(col => rowData.push('"' + (col.textContent || '').trim().replace(/"/g, '""') + '"'))
        csv.push(rowData.join(','))
      })
      csv.push('') // empty line between tables
    })

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Financial_Statements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const exportPDF = () => {
    window.print()
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button onClick={exportExcel} className="btn-secondary" style={{ textDecoration: 'none' }}>Export Excel</button>
      <button onClick={exportPDF} className="btn-primary" style={{ textDecoration: 'none' }}>Export PDF</button>
      
      {/* Hide navigation on print via injected CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          nav, aside, .sidebar { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          button, form, input, select { display: none !important; }
          .glass-panel { box-shadow: none !important; background: transparent !important; }
        }
      `}} />
    </div>
  )
}
