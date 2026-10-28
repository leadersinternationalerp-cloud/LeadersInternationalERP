import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronHeader = request.headers.get('x-cron-secret')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && cronHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
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
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const studentProfiles = (inactiveProfiles || []).filter((p: any) =>
    p.roles && Array.isArray(p.roles) ? p.roles.includes('Student') : p.role === 'Student'
  )

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      count: studentProfiles.length,
      candidates: studentProfiles.map((p: any) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
      })),
    })
  }

  let deleteCount = 0
  for (const prof of studentProfiles) {
    try {
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(prof.id)
      if (!deleteErr) {
        deleteCount++
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    success: true,
    dryRun: false,
    deleted: deleteCount,
  })
}
