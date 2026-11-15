import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getWingContext } from '@/lib/wingServer'
import { inferWing, matchesWingFilter } from '@/lib/wing'
import { syncClassReportCardRelease } from '@/lib/reportCardReleaseSync'

export default async function DeanMarksReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ class_id?: string; term?: string }>
}) {
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
  const wingContext = await getWingContext(user?.id, profile)

  const isAuthorized =
    userRoles.includes('Dean') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Director') ||
    userRoles.includes('System Admin')

  if (!isAuthorized) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all classes and scope by active wing filter / assigned wing
  const { data: classesRaw } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  const classes = (classesRaw || []).filter((c: any) =>
    matchesWingFilter(c, wingContext.activeWingFilter)
  )

  // Fetch terms dynamically
  const { data: dbTerms } = await supabase
    .from('terms')
    .select('id, name, term_name, academic_year, is_current')
    .order('is_current', { ascending: false })
    .order('created_at', { ascending: true })

  const termOptions: { id?: string; name: string; academic_year?: string; is_current?: boolean }[] = []
  ;(dbTerms || []).forEach((t: any) => {
    const tName = t.term_name || t.name
    if (tName && !termOptions.some((x) => x.name === tName)) {
      termOptions.push({
        id: t.id,
        name: tName,
        academic_year: t.academic_year,
        is_current: Boolean(t.is_current),
      })
    }
  })
  if (termOptions.length === 0) {
    termOptions.push({ name: 'Term 1', is_current: true }, { name: 'Term 2' }, { name: 'Term 3' })
  }

  const defaultTerm =
    termOptions.find((t) => t.is_current)?.name || termOptions[0]?.name || 'Term 1'

  const params = await searchParams
  const selectedClassId =
    params.class_id || (classes && classes.length > 0 ? classes[0].id : '')
  const selectedTerm = params.term || defaultTerm

  // Fetch marks count and status for this class & term
  let marksCount = 0
  let lockedCount = 0
  let releasedCount = 0

  interface SubjectAssessmentBreakdown {
    subjectId: string
    subjectName: string
    assessmentType: string
    totalEntries: number
    lockedEntries: number
    releasedEntries: number
  }
  const breakdownList: SubjectAssessmentBreakdown[] = []

  if (selectedClassId) {
    const { data: marks } = await supabase
      .from('marks')
      .select('subject_id, assessment_type, is_locked, is_released, subjects (name)')
      .eq('class_id', selectedClassId)
      .eq('term', selectedTerm)

    if (marks) {
      marksCount = marks.length
      lockedCount = marks.filter((m) => m.is_locked).length
      releasedCount = marks.filter((m) => m.is_released).length

      const groupMap = new Map<string, SubjectAssessmentBreakdown>()
      marks.forEach((m: any) => {
        const subj = Array.isArray(m.subjects) ? m.subjects[0] : m.subjects
        const subjName = subj?.name || 'Subject'
        const key = `${m.subject_id}__${m.assessment_type}`
        const existing = groupMap.get(key) || {
          subjectId: m.subject_id,
          subjectName: subjName,
          assessmentType: m.assessment_type || 'Test',
          totalEntries: 0,
          lockedEntries: 0,
          releasedEntries: 0,
        }
        existing.totalEntries++
        if (m.is_locked) existing.lockedEntries++
        if (m.is_released) existing.releasedEntries++
        groupMap.set(key, existing)
      })
      breakdownList.push(
        ...Array.from(groupMap.values()).sort((a, b) =>
          `${a.subjectName}_${a.assessmentType}`.localeCompare(
            `${b.subjectName}_${b.assessmentType}`
          )
        )
      )
    }
  }

  // Server Action to release or retract results + sync report cards
  async function handleReleaseResultsAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    const classId = formData.get('classId') as string
    const term = formData.get('term') as string
    const release = formData.get('release') === 'true'

    if (!classId || !term) return

    await syncClassReportCardRelease(supabase, {
      classId,
      termName: term,
      release,
      publishedBy: currentUser?.id,
    })

    revalidatePath('/dashboard/dean/marks')
    revalidatePath('/dashboard/dean/marks-overview')
    revalidatePath('/dashboard/principal/report-cards')
    revalidatePath('/dashboard/student/report-card')
    revalidatePath('/dashboard/student/results')
    revalidatePath('/dashboard/parent/report-card')
    revalidatePath('/dashboard/parent/academic-reports')
  }

  // Server Action to unlock or lock a specific subject-assessment sheet
  async function handleToggleSheetLockAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const classId = formData.get('classId') as string
    const subjectId = formData.get('subjectId') as string
    const assessmentType = formData.get('assessmentType') as string
    const term = formData.get('term') as string
    const lock = formData.get('lock') === 'true'

    if (!classId || !subjectId || !assessmentType || !term) return

    await supabase
      .from('marks')
      .update({
        is_locked: lock,
        is_released: lock ? undefined : false,
      })
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('assessment_type', assessmentType)
      .eq('term', term)

    revalidatePath('/dashboard/dean/marks')
    revalidatePath('/dashboard/teacher/marks')
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Grades Release &amp; Lock Control
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href="/dashboard/dean/marks-overview"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.85rem' }}
          >
            📊 Marks Overview
          </Link>
          <Link
            href="/dashboard/dean/report-cards"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.85rem' }}
          >
            📄 Report Cards Manager
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.6fr',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Release Control Panel */}
        <div
          className="glass-panel"
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}
        >
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>
            Select Class &amp; Term
          </h2>

          <form
            method="GET"
            action="/dashboard/dean/marks"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div className="form-group">
              <label className="form-label">Class</label>
              <select
                name="class_id"
                defaultValue={selectedClassId}
                className="input-field"
                required
              >
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(${c.section})` : ''} — {inferWing(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Term</label>
              <select
                name="term"
                defaultValue={selectedTerm}
                className="input-field"
                required
              >
                {termOptions.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} {t.academic_year ? `(${t.academic_year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.55rem' }}
            >
              Load Class &amp; Term Status
            </button>
          </form>

          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              margin: '1.5rem 0',
            }}
          ></div>

          <h3
            style={{ fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}
          >
            Status Summary
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Total Marks Entered:
              </span>
              <strong style={{ float: 'right' }}>{marksCount} Records</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Locked (Submitted by Teacher):
              </span>
              <strong
                style={{ float: 'right', color: 'var(--color-success)' }}
              >
                {lockedCount} Records
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Released to Students &amp; Parents:
              </span>
              <strong
                style={{
                  float: 'right',
                  color:
                    releasedCount > 0
                      ? 'var(--color-success)'
                      : 'var(--color-error)',
                }}
              >
                {releasedCount > 0 ? `YES (${releasedCount})` : 'NO'}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Release Action + Subject/Assessment Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            className="glass-panel"
            style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}
          >
            <h2
              style={{
                fontSize: '1.2rem',
                marginBottom: '0.75rem',
                color: 'var(--color-secondary)',
              }}
            >
              Release &amp; Portal Sync Operations
            </h2>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
                lineHeight: '1.5',
                marginBottom: '1.5rem',
              }}
            >
              Releasing results locks all entered marks for this class and term,
              publishes official Report Cards to Student &amp; Parent portals, and
              logs the release in the Principal&apos;s audit trail. You can retract
              or unlock individual sheets at any time.
            </p>

            <form
              action={handleReleaseResultsAction}
              style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
            >
              <input type="hidden" name="classId" value={selectedClassId} />
              <input type="hidden" name="term" value={selectedTerm} />

              {releasedCount === 0 ? (
                <button
                  type="submit"
                  name="release"
                  value="true"
                  className="btn btn-primary"
                  disabled={marksCount === 0}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  🚀 Lock &amp; Release Results + Publish Report Cards to Portals
                </button>
              ) : (
                <button
                  type="submit"
                  name="release"
                  value="false"
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-error)',
                    border: '1px solid var(--color-error)',
                  }}
                >
                  🔒 Retract Released Results (Hide from Portals)
                </button>
              )}
            </form>

            {marksCount === 0 && (
              <p
                style={{
                  color: 'var(--color-error)',
                  fontSize: '0.8rem',
                  marginTop: '0.75rem',
                  textAlign: 'center',
                }}
              >
                * No marks have been entered for this class and term yet.
              </p>
            )}
          </div>

          {/* Subject & Assessment Breakdown Table */}
          <div
            className="glass-panel"
            style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--color-border)',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              Submitted Subject &amp; Assessment Sheets ({breakdownList.length})
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assessment</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Students Graded</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdownList.map((row) => {
                  const isSheetLocked = row.lockedEntries > 0
                  const isSheetReleased = row.releasedEntries > 0
                  return (
                    <tr
                      key={`${row.subjectId}_${row.assessmentType}`}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        {row.subjectName}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {row.assessmentType}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {row.totalEntries}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isSheetReleased ? (
                          <span
                            style={{
                              color: 'var(--color-success)',
                              fontWeight: 600,
                            }}
                          >
                            🟢 Released
                          </span>
                        ) : isSheetLocked ? (
                          <span
                            style={{
                              color: 'var(--color-warning)',
                              fontWeight: 600,
                            }}
                          >
                            🔒 Locked
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            📝 Draft
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'right',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '0.5rem',
                        }}
                      >
                        <Link
                          href={`/dashboard/teacher/marks?class_id=${selectedClassId}&subject_id=${row.subjectId}&assessment_type=${encodeURIComponent(row.assessmentType)}&term=${encodeURIComponent(selectedTerm)}`}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                          }}
                        >
                          ✏️ View / Edit
                        </Link>
                        <form action={handleToggleSheetLockAction}>
                          <input
                            type="hidden"
                            name="classId"
                            value={selectedClassId}
                          />
                          <input
                            type="hidden"
                            name="subjectId"
                            value={row.subjectId}
                          />
                          <input
                            type="hidden"
                            name="assessmentType"
                            value={row.assessmentType}
                          />
                          <input
                            type="hidden"
                            name="term"
                            value={selectedTerm}
                          />
                          <input
                            type="hidden"
                            name="lock"
                            value={isSheetLocked ? 'false' : 'true'}
                          />
                          <button
                            type="submit"
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.75rem',
                            }}
                          >
                            {isSheetLocked ? '🔓 Unlock' : '🔒 Lock'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
                {breakdownList.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      No subject assessment sheets entered for this class and term
                      yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
