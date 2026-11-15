import { getSessionUser } from '@/lib/auth/session'
import { getCachedGradingScale } from '@/lib/cache/referenceData'
import { getWingContext } from '@/lib/wingServer'
import { matchesWingFilter } from '@/lib/wing'
import DeanMarksClient from './DeanMarksClient'
import Link from 'next/link'

export default async function DeanMarksOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ term?: string; class_id?: string; subject_id?: string }>
}) {
  const { user, profile, roles: userRoles, supabase } = await getSessionUser()

  const isAuthorized =
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

  const params = searchParams ? await searchParams : {}

  // Fetch marks with joins and bounded limit
  let marksQuery = supabase
    .from('marks')
    .select(`
      id,
      class_id,
      subject_id,
      score,
      grading_scale,
      remarks,
      term,
      assessment_type,
      is_locked,
      is_released,
      graded_by,
      subjects ( name ),
      classes ( name, section ),
      students (
        student_id,
        grade_level,
        profiles ( first_name, last_name )
      )
    `)
    .order('term', { ascending: false })
    .limit(1000)

  if (params?.term) marksQuery = marksQuery.eq('term', params.term)
  if (params?.class_id) marksQuery = marksQuery.eq('class_id', params.class_id)
  if (params?.subject_id) marksQuery = marksQuery.eq('subject_id', params.subject_id)

  const [{ data: marksData, error }, gradingScaleValue] = await Promise.all([
    marksQuery,
    getCachedGradingScale(),
  ])

  if (error) {
    console.error('Error fetching marks:', error)
  }

  const scopedMarks = lockedWing
    ? ((marksData as any[]) || []).filter((m: any) =>
        matchesWingFilter(m.classes || m.students || {}, lockedWing)
      )
    : ((marksData as any[]) || [])

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
            School-Wide Marks Overview
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              marginTop: '0.25rem',
            }}
          >
            Dean&apos;s view of all academic marks entered by teachers. Both raw marks
            (Out Of) and normalized percentages are displayed.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href="/dashboard/dean/marks"
            className="btn btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.85rem' }}
          >
            🚀 Grades Release &amp; Lock Control
          </Link>
          <Link
            href="/dashboard/teacher/marks"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.85rem' }}
          >
            ✏️ Enter / Edit Marks
          </Link>
        </div>
      </div>

      <DeanMarksClient
        marks={scopedMarks}
        initialGradingScale={gradingScaleValue}
        initialWingFilter={wingContext.activeWingFilter}
        lockedWing={lockedWing}
      />
    </div>
  )
}
