import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const setupKey = req.headers.get('x-setup-key') || req.nextUrl.searchParams.get('key')
  if (setupKey !== '20271234') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get('email') || 'admissions@leaderinternationalschool.ac.tz'
  const password = req.nextUrl.searchParams.get('password') || '20271234'

  const supabase = createServiceClient()

  // Diagnostic 1: Query profiles with *
  const { data: profStar, error: errStar } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.eq.${email},email.eq.${email}`)
    .maybeSingle()

  // Diagnostic 2: Query profiles with exact loginAction query
  const { data: profExact, error: errExact } = await supabase
    .from('profiles')
    .select('id, email, role, roles, failed_attempts, locked_until, force_pin_change')
    .or(`username.eq.${email},email.eq.${email}`)
    .maybeSingle()

  // Diagnostic 3: Supabase Auth direct sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Diagnostic 4: List auth user details
  const { data: authUser, error: authUserErr } = await supabase.auth.admin.getUserById(profStar?.id || '')

  return NextResponse.json({
    email,
    profStar,
    errStar: errStar ? { message: errStar.message, code: errStar.code } : null,
    profExact,
    errExact: errExact ? { message: errExact.message, code: errExact.code } : null,
    authSuccess: !!authData?.user,
    authError: authError ? { message: authError.message, status: authError.status } : null,
    authUser: authUser?.user ? {
      id: authUser.user.id,
      email: authUser.user.email,
      confirmed_at: authUser.user.confirmed_at,
      email_confirmed_at: authUser.user.email_confirmed_at,
      banned_until: authUser.user.banned_until,
      user_metadata: authUser.user.user_metadata,
    } : null,
    authUserErr: authUserErr ? authUserErr.message : null,
  })
}

const OFFICIAL_STAFF = [
  {
    email: 'admissions@leaderinternationalschool.ac.tz',
    username: 'admissions',
    role: 'System Admin',
    roles: ['System Admin'],
    firstName: 'Admissions',
    lastName: 'Desk',
    department: 'Administration',
    jobTitle: 'Admissions Administrator',
  },
  {
    email: 'alishaame@leaderinternationalschool.ac.tz',
    username: 'alishaame',
    role: 'Director',
    roles: ['Director'],
    firstName: 'Ali',
    lastName: 'Shaame',
    department: 'Executive Leadership',
    jobTitle: 'School Director',
  },
  {
    email: 'head_of_cambridge@leaderinternationalschool.ac.tz',
    username: 'head_of_cambridge',
    role: 'Principal',
    roles: ['Principal'],
    firstName: 'Head of Cambridge',
    lastName: 'Section',
    department: 'Cambridge Wing',
    jobTitle: 'Principal / Head of Cambridge',
  },
  {
    email: 'head_of_nursery@leaderinternationalschool.ac.tz',
    username: 'head_of_nursery',
    role: 'Head of Section',
    roles: ['Head of Section'],
    firstName: 'Head of Nursery',
    lastName: 'Section',
    department: 'Early Years / Nursery',
    jobTitle: 'Head of Nursery & Early Years',
  },
  {
    email: 'head_of_primary@leaderinternationalschool.ac.tz',
    username: 'head_of_primary',
    role: 'Head of Section',
    roles: ['Head of Section'],
    firstName: 'Head of Primary',
    lastName: 'Section',
    department: 'Primary Section',
    jobTitle: 'Head of Primary Section',
  },
  {
    email: 'info@leaderinternationalschool.ac.tz',
    username: 'info',
    role: 'System Admin',
    roles: ['System Admin'],
    firstName: 'Info',
    lastName: 'Admin',
    department: 'IT & Administration',
    jobTitle: 'System Administrator',
  },
]

const DEFAULT_PASSWORD = 'Password: 20271234'.replace('Password: ', '') // '20271234'

export async function POST(req: NextRequest) {
  // Authorization check via key
  const setupKey = req.headers.get('x-setup-key') || req.nextUrl.searchParams.get('key')
  let bodyKey = ''
  try {
    const body = await req.json().catch(() => ({}))
    bodyKey = body.key || ''
  } catch {
    // empty
  }

  if (setupKey !== '20271234' && bodyKey !== '20271234') {
    return NextResponse.json({ error: 'Unauthorized: Invalid setup key' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const log: string[] = []

  try {
    // 1. Wipe Demo Transactional & Student Tables
    const tablesToClear = [
      { name: 'student_parents', col: 'student_id' },
      { name: 'student_classes', col: 'id' },
      { name: 'learning_area_progress', col: 'id' },
      { name: 'early_years_evidence', col: 'id' },
      { name: 'early_years_observations', col: 'id' },
      { name: 'marks', col: 'id' },
      { name: 'class_activity_attempts', col: 'id' },
      { name: 'class_activities', col: 'id' },
      { name: 'attendance_exceptions', col: 'id' },
      { name: 'attendance', col: 'id' },
      { name: 'homework_submissions', col: 'id' },
      { name: 'homework', col: 'id' },
      { name: 'discipline_records', col: 'id' },
      { name: 'report_card_constructive_comments', col: 'id' },
      { name: 'report_card_subject_grades', col: 'id' },
      { name: 'report_cards', col: 'id' },
      { name: 'payment_allocations', col: 'id' },
      { name: 'payments', col: 'id' },
      { name: 'invoices', col: 'id' },
      { name: 'fee_balances', col: 'id' },
      { name: 'payroll_items', col: 'id' },
      { name: 'advance_repayments', col: 'id' },
      { name: 'salary_advances', col: 'id' },
      { name: 'payslips', col: 'id' },
      { name: 'payrolls', col: 'id' },
      { name: 'leave_applications', col: 'id' },
      { name: 'lesson_plans', col: 'id' },
      { name: 'students', col: 'id' },
      { name: 'admission_applications', col: 'id' },
      { name: 'notifications', col: 'id' },
      { name: 'email_logs', col: 'id' },
    ]

    for (const t of tablesToClear) {
      try {
        const { error } = await supabase.from(t.name).delete().neq(t.col, '00000000-0000-0000-0000-000000000000')
        if (!error) {
          log.push(`Cleared table: ${t.name}`)
        } else {
          log.push(`Warning clearing ${t.name}: ${error.message}`)
        }
      } catch (err) {
        log.push(`Skip ${t.name}: ${(err as Error).message}`)
      }
    }

    // 2. Fetch all existing Auth Users
    const { data: userListData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    const existingUsers = userListData?.users || []
    const officialEmails = new Set(OFFICIAL_STAFF.map((s) => s.email.toLowerCase()))

    // 3. Remove old demo users from auth and profiles
    for (const u of existingUsers) {
      const email = (u.email || '').toLowerCase()
      if (email && !officialEmails.has(email)) {
        try {
          await supabase.from('staff').delete().eq('id', u.id)
          await supabase.from('profiles').delete().eq('id', u.id)
          await supabase.auth.admin.deleteUser(u.id)
          log.push(`Deleted demo user: ${email}`)
        } catch (delErr) {
          log.push(`Failed to delete demo user ${email}: ${(delErr as Error).message}`)
        }
      }
    }

    // 4. Create / Update the 6 Official Staff Accounts
    const createdUsers: Record<string, string> = {}

    for (let i = 0; i < OFFICIAL_STAFF.length; i++) {
      const staff = OFFICIAL_STAFF[i]
      let userId: string

      const existingAuth = existingUsers.find((u) => u.email?.toLowerCase() === staff.email.toLowerCase())

      if (existingAuth) {
        userId = existingAuth.id
        const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            first_name: staff.firstName,
            last_name: staff.lastName,
            role: staff.role,
          },
        })
        if (updateErr) {
          log.push(`Error updating auth for ${staff.email}: ${updateErr.message}`)
        } else {
          log.push(`Updated auth password & metadata: ${staff.email}`)
        }
      } else {
        const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
          email: staff.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            first_name: staff.firstName,
            last_name: staff.lastName,
            role: staff.role,
          },
        })

        if (createErr || !newAuth?.user) {
          log.push(`Error creating auth for ${staff.email}: ${createErr?.message}`)
          continue
        }
        userId = newAuth.user.id
        log.push(`Created auth user: ${staff.email} (${userId})`)
      }

      // Upsert profile with graceful degradation for missing columns
      let profilePayload: Record<string, unknown> = {
        id: userId,
        email: staff.email,
        username: staff.username,
        first_name: staff.firstName,
        last_name: staff.lastName,
        role: staff.role,
        roles: staff.roles,
        failed_attempts: 0,
        locked_until: null,
      }

      let profSuccess = false
      for (let attempt = 0; attempt < 4; attempt++) {
        const { error: profErr } = await supabase.from('profiles').upsert(profilePayload)
        if (!profErr) {
          profSuccess = true
          log.push(`Upserted profile: ${staff.email} [${staff.role}]`)
          break
        }

        // Check if error is due to a missing column
        const missingColMatch = profErr.message.match(/Could not find the '([^']+)' column/)
        if (missingColMatch && missingColMatch[1]) {
          const badCol = missingColMatch[1]
          delete profilePayload[badCol]
          continue
        }

        // If generic error on attempt 2, fall back to minimal core columns
        if (attempt === 1) {
          profilePayload = {
            id: userId,
            email: staff.email,
            first_name: staff.firstName,
            last_name: staff.lastName,
            role: staff.role,
          }
          continue
        }

        log.push(`Error upserting profile for ${staff.email}: ${profErr.message}`)
        break
      }

      // Upsert staff table with graceful degradation
      let staffPayload: Record<string, unknown> = {
        id: userId,
        employee_id: `LIS-EMP-${String(i + 1).padStart(3, '0')}`,
        job_title: staff.jobTitle,
        department: staff.department,
      }

      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: staffErr } = await supabase.from('staff').upsert(staffPayload)
        if (!staffErr) {
          log.push(`Upserted staff record: ${staff.email}`)
          break
        }

        const missingColMatch = staffErr.message.match(/Could not find the '([^']+)' column/)
        if (missingColMatch && missingColMatch[1]) {
          const badCol = missingColMatch[1]
          delete staffPayload[badCol]
          continue
        }

        log.push(`Note on staff table for ${staff.email}: ${staffErr.message}`)
        break
      }

      createdUsers[staff.email] = staff.role
    }

    // 5. Reset DB Sequence (student_code_seq & admission_application_seq)
    try {
      await supabase.rpc('execute_sql_internal', {
        query: `
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'student_code_seq') THEN
              ALTER SEQUENCE public.student_code_seq RESTART WITH 1;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'admission_application_seq') THEN
              ALTER SEQUENCE public.admission_application_seq RESTART WITH 1;
            END IF;
          END $$;
        `,
      })
      log.push('Reset sequences: student_code_seq and admission_application_seq')
    } catch {
      // Ignored if rpc is not present, covered by SQL migration
    }

    return NextResponse.json({
      success: true,
      message: 'Go-live database clean-up and official staff account provisioning completed.',
      configuredAccounts: createdUsers,
      passwordConfigured: DEFAULT_PASSWORD,
      auditLog: log,
    })
  } catch (err: unknown) {
    console.error('[go-live-setup] failed:', err)
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message,
        auditLog: log,
      },
      { status: 500 }
    )
  }
}
