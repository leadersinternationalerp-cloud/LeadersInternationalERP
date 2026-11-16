import { route, ok } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/errors'
import { createServiceClient } from '@/utils/supabase/service'
import { isSchoolDay, getHolidayForDate } from '@/lib/attendance/tanzaniaHolidays'
import { sendPushToUsers } from '@/lib/notifications/webPushServer'

const LEADERSHIP_ROLES = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section'] as const

async function processAttendanceReminders(req: Request, user: any, requestId: string) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')

  const hasValidCronSecret = Boolean(
    cronSecret && (authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret)
  )

  const isLeadership = user && user.roles.some((r: string) => (LEADERSHIP_ROLES as readonly string[]).includes(r))

  if (!hasValidCronSecret && !isLeadership) {
    throw new ApiError('UNAUTHENTICATED', 'Sign in required or invalid cron secret')
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const holiday = getHolidayForDate(todayStr)
  if (!isSchoolDay(todayStr)) {
    return ok(
      {
        skipped: true,
        reason: holiday ? `Public holiday: ${holiday.name}` : 'Weekend',
        pendingCount: 0,
        sent: 0,
      },
      { requestId }
    )
  }

  const serviceClient = createServiceClient()
  const { data: unmarked, error: rpcError } = await serviceClient.rpc(
    'get_unmarked_homeroom_teachers',
    { target_date: todayStr }
  )

  if (rpcError) {
    throw new ApiError('INTERNAL', `RPC error: ${rpcError.message}`)
  }

  const teachers = (unmarked || []) as Array<{
    user_id: string
    teacher_name: string
    teacher_email: string
    class_id: string
    class_name: string
  }>

  if (teachers.length === 0) {
    return ok(
      {
        message: 'All classes have marked attendance for today.',
        pendingCount: 0,
        sent: 0,
      },
      { requestId }
    )
  }

  let sent = 0
  let failed = 0
  let cleanedUp = 0

  for (const t of teachers) {
    const res = await sendPushToUsers(serviceClient, [t.user_id], {
      title: 'Attendance Reminder',
      body: `Good morning ${t.teacher_name || 'Teacher'}! Attendance for ${t.class_name} is still pending for ${todayStr}.`,
      url: `/dashboard/teacher/attendance?class_id=${t.class_id}&date=${todayStr}`,
      tag: `attendance-reminder-${todayStr}-${t.class_id}`,
    })
    sent += res.sent
    failed += res.failed
    cleanedUp += res.cleanedUp
  }

  return ok(
    {
      date: todayStr,
      pendingCount: teachers.length,
      unmarkedClasses: teachers.map(t => ({ class_id: t.class_id, class_name: t.class_name, teacher_name: t.teacher_name })),
      sent,
      failed,
      cleanedUp,
    },
    { requestId }
  )
}

export const GET = route(
  async ({ req, user, requestId }) => {
    return processAttendanceReminders(req, user, requestId)
  },
  { roles: LEADERSHIP_ROLES }
)

export const POST = route(
  async ({ req, user, requestId }) => {
    return processAttendanceReminders(req, user, requestId)
  },
  { roles: LEADERSHIP_ROLES }
)
