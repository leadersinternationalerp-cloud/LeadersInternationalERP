'use client'

import React, { useState, useMemo } from 'react'
import { formatDate } from '@/utils/date'

type StudentType = {
  id: string
  student_id: string
  grade_level: string
  section: string
  profiles: {
    first_name: string
    last_name: string
  }
  attendance: any[]
  marks: any[]
  discipline: any[]
}

export default function DeanStudentsClient({ students }: { students: StudentType[] }) {
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const classes = useMemo(() => {
    const cls = new Set<string>()
    students.forEach(s => cls.add(s.grade_level))
    return Array.from(cls).sort()
  }, [students])

  const filtered = students.filter(s => {
    const matchesSearch = 
      s.profiles.first_name.toLowerCase().includes(search.toLowerCase()) ||
      s.profiles.last_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase())
    
    const matchesClass = filterClass === 'All' || s.grade_level === filterClass
    return matchesSearch && matchesClass
  })

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            Search Student
          </label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Name or Student ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ width: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            Filter by Class
          </label>
          <select 
            className="input-field" 
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
          >
            <option value="All">All Classes</option>
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Student ID</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Class</th>
              <th style={{ padding: '1rem' }}>Section</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const isExpanded = expandedId === s.id
              const presentCount = s.attendance.filter(a => a.status === 'Present' || a.status === 'Late').length
              const attRate = s.attendance.length > 0 ? Math.round((presentCount / s.attendance.length) * 100) : 100
              
              const totalScore = s.marks.reduce((acc, curr) => acc + curr.score, 0)
              const avgScore = s.marks.length > 0 ? Math.round(totalScore / s.marks.length) : 0

              const openDiscipline = s.discipline.filter(d => d.status === 'Open').length

              return (
                <React.Fragment key={s.id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(0,0,0,0.01)' : 'transparent' }} onClick={() => toggleExpand(s.id)}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{s.student_id}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{s.profiles.first_name} {s.profiles.last_name}</td>
                    <td style={{ padding: '1rem' }}>{s.grade_level}</td>
                    <td style={{ padding: '1rem' }}>{s.section || '-'}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        {isExpanded ? 'Collapse ▲' : 'View Details ▼'}
                      </button>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                      <td colSpan={5} style={{ padding: '1.5rem', borderTop: '1px dashed var(--color-border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                          
                          {/* Attendance */}
                          <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Attendance</h4>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: attRate >= 90 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                              {attRate}%
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                              {s.attendance.length} Total Logs
                            </div>
                          </div>

                          {/* Marks */}
                          <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Academic Average</h4>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                              {avgScore}%
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                              Based on {s.marks.length} released marks
                            </div>
                          </div>

                          {/* Discipline */}
                          <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Discipline</h4>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: openDiscipline > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                              {openDiscipline} <span style={{ fontSize: '1rem', fontWeight: 500 }}>Open Cases</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                              {s.discipline.length} Total Logs
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No students found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
