import { createClient } from '@/utils/supabase/server'
import DeanSubmissionsClient from './DeanSubmissionsClient'

export default async function DeanSubmissionsPage() {
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

  // Fetch all lesson plans with joins
  const { data: lessonPlans, error } = await supabase
    .from('lesson_plans')
    .select(`
      id,
      week_number,
      term,
      academic_year,
      file_url,
      status,
      created_at,
      dean_comment,
      teacher_id,
      profiles ( first_name, last_name ),
      classes ( name, section ),
      subjects ( name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching lesson plans:', error)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Teacher Submissions Review
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Review lesson plans and documents submitted by teachers school-wide. Approve or return with comments.
        </p>
      </div>

      <DeanSubmissionsClient submissions={(lessonPlans as any[]) || []} />
    </div>
  )
}
