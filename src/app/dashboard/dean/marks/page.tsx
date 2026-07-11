import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function DeanMarksReleasePage({
  searchParams
}: {
  searchParams: Promise<{ class_id?: string; term?: string }>
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

  if (!userRoles.includes('Dean') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  const params = await searchParams
  const selectedClassId = params.class_id || (classes && classes.length > 0 ? classes[0].id : '')
  const selectedTerm = params.term || 'Term 1'

  // Fetch marks count and status for this class & term
  let marksCount = 0
  let lockedCount = 0
  let releasedCount = 0

  if (selectedClassId) {
    const { data: marks } = await supabase
      .from('marks')
      .select('is_locked, is_released')
      .eq('class_id', selectedClassId)
      .eq('term', selectedTerm)

    if (marks) {
      marksCount = marks.length
      lockedCount = marks.filter(m => m.is_locked).length
      releasedCount = marks.filter(m => m.is_released).length
    }
  }

  // Server Action to release results
  async function handleReleaseResultsAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const classId = formData.get('classId') as string
    const term = formData.get('term') as string
    const release = formData.get('release') === 'true'

    if (!classId || !term) return

    const { error } = await supabase
      .from('marks')
      .update({ is_released: release })
      .eq('class_id', classId)
      .eq('term', term)

    if (error) {
      console.error('Error updating release status:', error.message)
    }

    revalidatePath('/dashboard/dean/marks')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Grades Release & Lock Control
        </h1>
        <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Release Control Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Select Class & Term</h2>
          
          <form method="GET" action="/dashboard/dean/marks" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class</label>
              <select name="class_id" defaultValue={selectedClassId} className="input-field" onChange={(e) => e.target.form?.submit()} required>
                {classes?.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Term</label>
              <select name="term" defaultValue={selectedTerm} className="input-field" onChange={(e) => e.target.form?.submit()} required>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
              </select>
            </div>
          </form>

          <div style={{ borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }}></div>

          <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}>Status Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Grades Entered:</span>
              <strong style={{ float: 'right' }}>{marksCount} Records</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Locked (Submitted by Teacher):</span>
              <strong style={{ float: 'right', color: 'var(--color-success)' }}>{lockedCount} Records</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Released to Students/Parents:</span>
              <strong style={{ float: 'right', color: releasedCount > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {releasedCount > 0 ? 'YES' : 'NO'}
              </strong>
            </div>
          </div>
        </div>

        {/* Release Action Panel */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-secondary)' }}>
            Release Operations
          </h2>

          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5', marginBottom: '2rem' }}>
            Releasing results allows students and their parents to view academic grades and report cards on their portal dashboards. You can retract results at any time.
          </p>

          <form action={handleReleaseResultsAction} style={{ display: 'flex', gap: '1rem' }}>
            <input type="hidden" name="classId" value={selectedClassId} />
            <input type="hidden" name="term" value={selectedTerm} />

            {releasedCount === 0 ? (
              <button 
                type="submit" 
                name="release" 
                value="true" 
                className="btn btn-primary"
                disabled={lockedCount === 0}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                🚀 Release Results to Portals
              </button>
            ) : (
              <button 
                type="submit" 
                name="release" 
                value="false" 
                className="btn"
                style={{ width: '100%', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
              >
                🔒 Retract Released Results (Hide)
              </button>
            )}
          </form>

          {lockedCount === 0 && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>
              * Cannot release results because no grades have been submitted & locked by teachers yet.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
