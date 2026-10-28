import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { normalizeRoles, type Role, hasAnyRole } from '@/lib/auth/roles'

export function withAuth(
  handler: (
    req: NextRequest,
    ctx: { user: any; profile: any; roles: Role[]; supabase: any; params?: any }
  ) => Promise<Response>,
  options?: { roles?: readonly (Role | string)[] }
) {
  return async (req: NextRequest, segmentData?: any) => {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, roles')
      .eq('id', user.id)
      .single()

    const roles = normalizeRoles(profile)

    if (options?.roles && !hasAnyRole(roles, options.roles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const params = segmentData?.params ? await segmentData.params : undefined
    return handler(req, { user, profile, roles, supabase, params })
  }
}
