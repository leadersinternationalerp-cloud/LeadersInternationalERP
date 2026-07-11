import { createClient } from '@/utils/supabase/server'
import ActivitiesClient, { ClassActivity } from '../../student/activities/ActivitiesClient'
import Link from 'next/link'

export default async function ParentActivitiesPage({
  searchParams
}: {
  searchParams: Promise<{ child_id?: string }>
}) {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!user || (!userRoles.includes('Parent') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const params = await searchParams
  let childId = params.child_id

  // Fetch all children linked to parent
  const { data: relations } = await supabase
    .from('student_parents')
    .select('student_id, students:student_id (id, student_id, grade_level, section, profiles:id (first_name, last_name))')
    .eq('parent_id', user.id)

  const children = relations?.map(r => r.students) || []

  if (!childId && children.length > 0) {
    childId = (children[0] as any).id
  }

  if (!childId) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Child Assigned</h2>
        <p>No child student profile links found for your parent account.</p>
      </div>
    )
  }

  const selectedChild = children.find(c => (c as any).id === childId) as any

  let activities: ClassActivity[] = []
  if (selectedChild) {
    // Find class matching child's grade_level & section
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('name', selectedChild.grade_level)
      .eq('section', selectedChild.section || '')
      .single()

    if (cls) {
      const { data: acts } = await supabase
        .from('class_activities')
        .select('*')
        .eq('class_id', cls.id)
        .order('date', { ascending: true })

      activities = acts as ClassActivity[] || []
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header and Child Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            School Activities
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            View upcoming events and class activities for your children.
          </p>
        </div>

        {children.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {children.map((child: any) => (
              <Link 
                key={child.id} 
                href={`?child_id=${child.id}`}
                className="btn"
                style={{
                  padding: '0.5rem 1rem',
                  textDecoration: 'none',
                  backgroundColor: child.id === childId ? 'var(--color-secondary)' : 'transparent',
                  color: child.id === childId ? '#fff' : 'var(--color-text)',
                  border: child.id === childId ? '1px solid var(--color-secondary)' : '1px solid var(--color-border)',
                }}
              >
                {child.profiles.first_name} {child.profiles.last_name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>
          Activities for: <span style={{ color: 'var(--color-secondary)' }}>{selectedChild?.profiles.first_name} {selectedChild?.profiles.last_name}</span>
        </h3>
      </div>

      <ActivitiesClient activities={activities} />
    </div>
  )
}
