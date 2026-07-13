import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function ParentStudentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Find relationships
  const { data: relationships } = await supabase
    .from('student_parents')
    .select(`
      student:student_id(
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url
      ),
      relationship_type
    `)
    .eq('parent_id', user?.id)

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>My Children</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {(relationships || []).map((rel) => {
          const student: any = Array.isArray(rel.student) ? rel.student[0] : rel.student
          if (!student) return null
          
          return (
            <div key={student.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {student.avatar_url ? (
                <img src={student.avatar_url} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', border: '2px solid var(--color-primary)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600, marginBottom: '1rem' }}>
                  {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                </div>
              )}
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--color-text)' }}>{student.first_name} {student.last_name}</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Relationship: {rel.relationship_type}</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <Link href="/dashboard/parent/academic-reports" className="btn-secondary" style={{ flex: 1, textAlign: 'center', padding: '0.5rem', textDecoration: 'none', fontSize: '0.85rem' }}>
                  Academics
                </Link>
                <Link href="/dashboard/parent/fees" className="btn-primary" style={{ flex: 1, textAlign: 'center', padding: '0.5rem', textDecoration: 'none', fontSize: '0.85rem' }}>
                  Fees
                </Link>
              </div>
            </div>
          )
        })}
        {(!relationships || relationships.length === 0) && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
            No children connected to your account yet. Please contact the administration.
          </div>
        )}
      </div>
    </div>
  )
}
