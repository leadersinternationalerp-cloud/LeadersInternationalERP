import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export const runtime = 'nodejs'

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
      'student_parents',
      'student_classes',
      'learning_area_progress',
      'early_years_evidence',
      'early_years_observations',
      'marks',
      'class_activity_attempts',
      'class_activities',
      'attendance_exceptions',
      'attendance',
      'homework_submissions',
      'homework',
      'discipline_records',
      'report_card_constructive_comments',
      'report_card_subject_grades',
      'report_cards',
      'payment_allocations',
      'payments',
      'invoices',
      'fee_balances',
      'payroll_items',
      'advance_repayments',
      'salary_advances',
      'payslips',
      'payrolls',
      'leave_applications',
      'lesson_plans',
      'students',
      'admission_applications',
      'notifications',
      'email_logs',
    ]

    for (const table of tablesToClear) {
      try {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (!error) {
          log.push(`Cleared table: ${table}`)
        } else {
          log.push(`Warning clearing ${table}: ${error.message}`)
        }
      } catch (err) {
        log.push(`Skip ${table}: ${(err as Error).message}`)
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

      // Upsert profile
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        email: staff.email,
        username: staff.username,
        first_name: staff.firstName,
        last_name: staff.lastName,
        role: staff.role,
        roles: staff.roles,
        is_active: true,
        failed_attempts: 0,
        locked_until: null,
        force_pin_change: false,
      })

      if (profErr) {
        log.push(`Error upserting profile for ${staff.email}: ${profErr.message}`)
      } else {
        log.push(`Upserted profile: ${staff.email} [${staff.role}]`)
      }

      // Upsert staff table
      const { error: staffErr } = await supabase.from('staff').upsert({
        id: userId,
        employee_id: `LIS-EMP-${String(i + 1).padStart(3, '0')}`,
        job_title: staff.jobTitle,
        department: staff.department,
        employment_status: 'Full-Time',
      })

      if (staffErr) {
        log.push(`Error upserting staff for ${staff.email}: ${staffErr.message}`)
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
