import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { getWingContext } from '@/lib/wingServer'
import { matchesWingFilter } from '@/lib/wing'
import HOSMarksClient from './HOSMarksClient'
import Link from 'next/link'

export default async function HOSMarksPage() {
  const supabase = await createClient()

  // Verify access
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  const userRoles = normalizeRoles(profile)
  const isAuthorized =
    userRoles.includes('Head of Section') ||
    userRoles.includes('Dean') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Director') ||
    userRoles.includes('System Admin')

  if (!user || !isAuthorized) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const wingContext = await getWingContext(user.id, profile)
  const lockedWing = wingContext.assignedWing !== 'Both' ? wingContext.assignedWing : null

  // Fetch marks with joins
  const { data: marksData, error } = await supabase
    .from('marks')
    .select(`
      id,
      class_id,
      subject_id,
      score,
      grading_scale,
      term,
      assessment_type,
      is_locked,
      is_released,
      subjects ( name ),
      classes ( name, section ),
      students (
        student_id,
        grade_level,
        profiles ( first_name, last_name )
      )
    `)
    .order('term', { ascending: false })

  if (error) {
    console.error('Error fetching marks:', error)
  }

  const scopedMarks = lockedWing
    ? ((marksData as any[]) || []).filter((m: any) =>
        matchesWingFilter(m.classes || m.students || {}, lockedWing)
      )
    : ((marksData as any[]) || [])

  // Fetch system settings for grading scale
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'grading_scale')
    .maybeSingle()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              color: 'var(--color-primary)',
              margin: 0,
            }}
          >
            Section Marks Overview
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              marginTop: '0.25rem',
            }}
          >
            Head of Section view of academic marks. Missing marks are highlighted in
            red, and Out-Of scales are automatically normalized.
          </p>
        </div>

        <Link
          href="/dashboard/teacher/marks"
          className="btn btn-secondary"
          style={{ textDecoration: 'none', fontSize: '0.85rem' }}
        >
          ✏️ Enter / Edit Marks
        </Link>
      </div>

      <HOSMarksClient
        marks={scopedMarks}
        initialGradingScale={settingData?.value}
        initialWingFilter={wingContext.activeWingFilter}
        lockedWing={lockedWing}
      />
    </div>
  )
}
