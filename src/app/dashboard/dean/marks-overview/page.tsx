import { createClient } from '@/utils/supabase/server'
import DeanMarksClient from './DeanMarksClient'

export default async function DeanMarksOverviewPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Dean') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch marks with joins
  const { data: marksData, error } = await supabase
    .from('marks')
    .select(`
      id,
      score,
      term,
      assessment_type,
      is_released,
      teacher_id,
      subjects ( name ),
      classes ( name, section ),
      students (
        student_id,
        profiles ( first_name, last_name )
      )
    `)
    .order('term', { ascending: false })

  if (error) {
    console.error('Error fetching marks:', error)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          School-Wide Marks Overview
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Dean's view of all academic marks entered by teachers. Use filters to locate specific assessments and flag for review if necessary.
        </p>
      </div>

      <DeanMarksClient marks={(marksData as any[]) || []} />
    </div>
  )
}
