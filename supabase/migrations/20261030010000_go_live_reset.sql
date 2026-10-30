-- Migration: 20261030010000_go_live_reset.sql
-- Description: Clears all demo student, finance, attendance, and academic records for Go-Live.
-- Preserves: Core catalog (classes, subjects, Cambridge syllabus, grading scales, chart of accounts).

BEGIN;

-- 1. Truncate all demo transactional tables (cascading child references)
TRUNCATE TABLE
  public.student_parents,
  public.student_classes,
  public.learning_area_progress,
  public.early_years_evidence,
  public.early_years_observations,
  public.marks,
  public.class_activity_attempts,
  public.class_activities,
  public.attendance_exceptions,
  public.attendance,
  public.homework_submissions,
  public.homework,
  public.discipline_records,
  public.report_card_constructive_comments,
  public.report_card_subject_grades,
  public.report_cards,
  public.payment_allocations,
  public.payments,
  public.invoices,
  public.fee_balances,
  public.payroll_items,
  public.advance_repayments,
  public.salary_advances,
  public.payslips,
  public.payrolls,
  public.leave_applications,
  public.lesson_plans,
  public.students,
  public.admission_applications,
  public.notifications,
  public.email_logs
CASCADE;

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
