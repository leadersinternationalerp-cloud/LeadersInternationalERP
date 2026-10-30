import { createServiceClient } from '@/utils/supabase/service'
import { route, ok } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/errors'

export const POST = route(
  async ({ user, req, requestId }) => {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const cronHeader = req.headers.get('x-cron-secret')

    const hasValidCronSecret = Boolean(
      cronSecret && (authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret)
    )

    const isSystemAdmin = user && (user.roles.includes('System Admin') || user.roles.includes('Director'))

    if (!hasValidCronSecret && !isSystemAdmin) {
      throw new ApiError('UNAUTHENTICATED', 'Sign in required or invalid cron secret')
    }

    const { searchParams } = new URL(req.url)
    const dryRun = searchParams.get('dryRun') !== 'false'

    const supabase = createServiceClient()

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoISO = oneYearAgo.toISOString()

    const { data: inactiveProfiles, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, roles')
      .eq('is_active', false)
      .lt('updated_at', oneYearAgoISO)

    if (fetchErr) {
      throw new ApiError('INTERNAL', 'Failed to fetch inactive profiles')
    }

    interface InactiveProfile {
      id: string
      first_name?: string
      last_name?: string
      role?: string
      roles?: string[]
    }

    const studentProfiles = (inactiveProfiles || []).filter((p: InactiveProfile) =>
      p.roles && Array.isArray(p.roles) ? p.roles.includes('Student') : p.role === 'Student'
    )

    if (dryRun) {
      return ok(
        {
          dryRun: true,
          count: studentProfiles.length,
          candidates: studentProfiles.map((p: InactiveProfile) => ({
            id: p.id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          })),
        },
        { requestId }
      )
    }

    let deleteCount = 0
    for (const prof of studentProfiles) {
      try {
        const { error: deleteErr } = await supabase.auth.admin.deleteUser(prof.id)
        if (!deleteErr) {
          deleteCount++
        }
      } catch {
        // Continue loop
      }
    }

    return ok(
      {
        dryRun: false,
        deleted: deleteCount,
      },
      { requestId }
    )
  },
  { requireAuth: false }
)
