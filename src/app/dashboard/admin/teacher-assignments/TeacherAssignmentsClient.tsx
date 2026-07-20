'use client'

import { useState } from 'react'

interface Teacher {
  id: string
  first_name: string
  last_name: string
}

interface ClassItem {
  id: string
  name: string
  class_name?: string
  section?: string
  is_early_years?: boolean
  class_teacher_id?: string
}

interface SubjectItem {
  id: string
  name?: string
  subject_name?: string
}

interface Allocation {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string | null
  created_at: string
  profiles?: {
    first_name: string
    last_name: string
  }
  classes?: {
    name: string
    class_name?: string
    section?: string
    is_early_years?: boolean
  }
  subjects?: {
    name?: string
    subject_name?: string
  }
}

interface TeacherAssignmentsClientProps {
  teachers: Teacher[]
  classes: ClassItem[]
  subjects: SubjectItem[]
  allocations: Allocation[]
  allocError: any
  assignTeacherAction: (formData: FormData) => Promise<void>
  removeAllocationAction: (formData: FormData) => Promise<void>
}

export default function TeacherAssignmentsClient({
  teachers,
  classes,
  subjects,
  allocations,
  allocError,
  assignTeacherAction,
  removeAllocationAction
}: TeacherAssignmentsClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  const selectedClass = classes.find(c => c.id === selectedClassId)
  
  const isEarlyYears = selectedClass ? (
    selectedClass.is_early_years ||
    ['baby', 'nursery', 'reception', 'kg', 'playgroup', 'pre-primary'].some(ey => 
      (selectedClass.name || selectedClass.class_name || '').toLowerCase().includes(ey)
    )
  ) : false

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Teacher Assignments Matrix</h1>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
          Assign Teacher to Class & Subject
        </h2>
        <form action={assignTeacherAction} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Teacher *</label>
            <select name="teacher_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <option value="">Select Teacher...</option>
              {(teachers || []).map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Class *</label>
            <select 
              name="class_id" 
              required 
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
            >
              <option value="">Select Class...</option>
              {(classes || []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name || c.class_name || 'Unknown'}{c.section ? ` (${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', opacity: isEarlyYears ? 0.7 : 1 }}>
              Subject {isEarlyYears ? '(Deactivated)' : '*'}
            </label>
            <select 
              name="subject_id" 
              required={!isEarlyYears} 
              disabled={isEarlyYears}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)', 
                border: isEarlyYears ? '1.5px dashed var(--color-border)' : '1px solid var(--color-border)',
                backgroundColor: isEarlyYears ? 'rgba(0, 0, 0, 0.05)' : 'var(--color-surface, #ffffff)',
                color: isEarlyYears ? 'var(--color-text-muted, #64748b)' : 'var(--color-text)',
                cursor: isEarlyYears ? 'not-allowed' : 'default',
                opacity: isEarlyYears ? 0.8 : 1
              }}
            >
              {isEarlyYears ? (
                <option value="">N/A - Early Years (Homeroom Teacher)</option>
              ) : (
                <>
                  <option value="">Select Subject...</option>
                  <option value="HOMEROOM" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    ★ Homeroom Teacher (Class Teacher)
                  </option>
                  <optgroup label="Subjects">
                    {(subjects || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.subject_name}</option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
            {isEarlyYears ? (
              <div style={{ fontSize: '0.72rem', color: '#db2777', marginTop: '0.35rem', fontWeight: 600 }}>
                Early Years class selected. Subject deactivated for Homeroom allocation.
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Select a subject OR select "Homeroom Teacher" to assign the main Class Teacher.
              </div>
            )}
          </div>
          
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', height: '45px' }}>
            Assign
          </button>
        </form>
      </div>

      {/* Allocations Matrix/List */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Current Assignments</h3>
        </div>
        
        {allocError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
            Error loading allocations: {allocError.message}. Make sure `class_subjects` table exists.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Teacher</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Class</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Subject</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(allocations || []).map((alloc: any) => {
                const isEyAlloc = alloc.classes?.is_early_years || 
                  ['baby', 'nursery', 'reception', 'kg', 'playgroup', 'pre-primary'].some(ey => 
                    (alloc.classes?.name || alloc.classes?.class_name || '').toLowerCase().includes(ey)
                  )

                return (
                  <tr key={alloc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {alloc.profiles?.first_name} {alloc.profiles?.last_name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {alloc.classes?.name || alloc.classes?.class_name || 'Unknown'}
                      {alloc.classes?.section ? ` (${alloc.classes.section})` : ''}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {alloc.subjects?.name || alloc.subjects?.subject_name ? (
                        alloc.subjects?.name || alloc.subjects?.subject_name
                      ) : isEyAlloc ? (
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '12px', 
                          backgroundColor: 'rgba(219, 39, 119, 0.1)', 
                          color: '#db2777', 
                          fontWeight: 600, 
                          fontSize: '0.75rem' 
                        }}>
                          Homeroom (Early Years)
                        </span>
                      ) : (
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '12px', 
                          backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                          color: '#0284c7', 
                          fontWeight: 600, 
                          fontSize: '0.75rem' 
                        }}>
                          Homeroom (Class Teacher)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <form action={removeAllocationAction}>
                        <input type="hidden" name="allocation_id" value={alloc.id} />
                        <button 
                          type="submit" 
                          className="btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'transparent', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {(!allocations || allocations.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No teacher assignments configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
