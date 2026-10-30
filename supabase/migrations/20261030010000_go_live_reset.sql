-- Migration: 20261030010000_go_live_reset.sql
-- Description: Clears all demo student, finance, attendance, and academic records for Go-Live.
-- Preserves: Core catalog (classes, subjects, Cambridge syllabus, grading scales, chart of accounts).

BEGIN;

-- 1. Safely Truncate existing demo transactional tables (cascading child references)
DO $$
DECLARE
  t text;
  target_tables text[] := ARRAY[
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
    'email_logs'
  ];
BEGIN
  FOREACH t IN ARRAY target_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('TRUNCATE TABLE public.%I CASCADE', t);
    END IF;
  END LOOP;
END $$;

-- 2. Delete demo staff and demo users from profiles
DELETE FROM public.staff 
WHERE id IN (
  SELECT id FROM public.profiles 
  WHERE email NOT IN (
    'admissions@leaderinternationalschool.ac.tz',
    'alishaame@leaderinternationalschool.ac.tz',
    'head_of_cambridge@leaderinternationalschool.ac.tz',
    'head_of_nursery@leaderinternationalschool.ac.tz',
    'head_of_primary@leaderinternationalschool.ac.tz',
    'info@leaderinternationalschool.ac.tz'
  )
);

DELETE FROM public.profiles 
WHERE email NOT IN (
  'admissions@leaderinternationalschool.ac.tz',
  'alishaame@leaderinternationalschool.ac.tz',
  'head_of_cambridge@leaderinternationalschool.ac.tz',
  'head_of_nursery@leaderinternationalschool.ac.tz',
  'head_of_primary@leaderinternationalschool.ac.tz',
  'info@leaderinternationalschool.ac.tz'
);

-- Also remove demo users from auth.users (if accessible via SQL editor)
DELETE FROM auth.users
WHERE email NOT IN (
  'admissions@leaderinternationalschool.ac.tz',
  'alishaame@leaderinternationalschool.ac.tz',
  'head_of_cambridge@leaderinternationalschool.ac.tz',
  'head_of_nursery@leaderinternationalschool.ac.tz',
  'head_of_primary@leaderinternationalschool.ac.tz',
  'info@leaderinternationalschool.ac.tz'
);

-- 3. Reset Sequences so new live records start from 1
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'student_code_seq') THEN
    ALTER SEQUENCE public.student_code_seq RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'admission_application_seq') THEN
    ALTER SEQUENCE public.admission_application_seq RESTART WITH 1;
  END IF;
END $$;

COMMIT;
