-- Migration: 20261028000000_schema_drift_and_security_hardening.sql
-- Addresses:
-- 1. Missing tables (terms, staff, homework, homework_submissions, email_logs, email_outbox, otp_requests)
-- 2. Missing columns and compatibility views (discipline -> discipline_records, payroll -> payrolls, salaries -> salary_settings)
-- 3. RLS enablement on attendance and student_classes
-- 4. Scoped RLS on students and profiles
-- 5. Student ID sequence and force_pin_change column
-- 6. Storage buckets (logos, receipts)
-- 7. Performance indexes (pg_trgm and B-Tree indexes)

-- 1. Helper function for staff checks
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher')
      OR roles && ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher']
    )
  );
$$;

-- 2. Terms table
CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read on terms" ON public.terms;
CREATE POLICY "Authenticated read on terms" ON public.terms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manage terms" ON public.terms;
CREATE POLICY "Admin manage terms" ON public.terms FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));

-- 3. Staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  job_title text,
  department text,
  employment_status text DEFAULT 'Full-Time',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read on staff" ON public.staff;
CREATE POLICY "Authenticated read on staff" ON public.staff FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manage staff" ON public.staff;
CREATE POLICY "Admin manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- 4. Homework & Homework Submissions
CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  due_date date,
  file_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read homework" ON public.homework;
CREATE POLICY "Read homework" ON public.homework FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff manage homework" ON public.homework;
CREATE POLICY "Staff manage homework" ON public.homework FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean'));

CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  submission_text text,
  file_url text,
  submitted_at timestamp with time zone DEFAULT now(),
  grade text,
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Student manage own submission" ON public.homework_submissions;
CREATE POLICY "Student manage own submission" ON public.homework_submissions FOR ALL TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
  )
  WITH CHECK (
    student_id = auth.uid() OR
    public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
  );

-- 5. Compatibility Views & Missing Columns
CREATE OR REPLACE VIEW public.discipline AS SELECT * FROM public.discipline_records;
CREATE OR REPLACE VIEW public.payroll AS SELECT * FROM public.payrolls;
CREATE OR REPLACE VIEW public.salaries AS SELECT employee_id, basic_salary AS basic_pay, allowances, deductions, created_at, updated_at FROM public.salary_settings;

ALTER TABLE public.payrolls ADD COLUMN IF NOT EXISTS journal_entry_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_pin_change boolean DEFAULT false;

DROP POLICY IF EXISTS "Employees can view own salary settings" ON public.salary_settings;
CREATE POLICY "Employees can view own salary settings" ON public.salary_settings FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- 6. RLS Enablement & Scoped Policies on Attendance and Student Classes
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage attendance" ON public.attendance;
CREATE POLICY "Staff can manage attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance;
CREATE POLICY "Students can view own attendance" ON public.attendance FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents can view children attendance" ON public.attendance;
CREATE POLICY "Parents can view children attendance" ON public.attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.parent_id = auth.uid() AND sp.student_id = public.attendance.student_id
    )
  );

DROP POLICY IF EXISTS "Staff can manage student_classes" ON public.student_classes;
CREATE POLICY "Staff can manage student_classes" ON public.student_classes FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Students can view own student_classes" ON public.student_classes;
CREATE POLICY "Students can view own student_classes" ON public.student_classes FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents can view children student_classes" ON public.student_classes;
CREATE POLICY "Parents can view children student_classes" ON public.student_classes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.parent_id = auth.uid() AND sp.student_id = public.student_classes.student_id
    )
  );

-- 7. Scoped Reads on Sensitive Tables
DROP POLICY IF EXISTS "Allow authenticated read on students" ON public.students;
DROP POLICY IF EXISTS "Allow scoped read on students" ON public.students;
CREATE POLICY "Allow scoped read on students" ON public.students FOR SELECT TO authenticated
  USING (
    public.is_staff() OR
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.parent_id = auth.uid() AND sp.student_id = public.students.id
    )
  );

DROP POLICY IF EXISTS "Allow authenticated read on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow scoped read on profiles" ON public.profiles;
CREATE POLICY "Allow scoped read on profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_staff() OR
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.parent_id = auth.uid() AND sp.student_id = public.profiles.id
    ) OR
    EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.student_id = auth.uid() AND sp.parent_id = public.profiles.id
    )
  );

-- 8. Sequences
CREATE SEQUENCE IF NOT EXISTS public.student_code_seq START WITH 1000;

-- 9. Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access to logos" ON storage.objects;
CREATE POLICY "Public access to logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated insert to logos" ON storage.objects;
CREATE POLICY "Authenticated insert to logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated access to receipts" ON storage.objects;
CREATE POLICY "Authenticated access to receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Staff insert to receipts" ON storage.objects;
CREATE POLICY "Staff insert to receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');

-- 10. Email and OTP Tables
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "to" text NOT NULL,
  subject text NOT NULL,
  template text,
  status text NOT NULL,
  provider_message_id text,
  error text,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view email_logs" ON public.email_logs;
CREATE POLICY "Staff can view email_logs" ON public.email_logs FOR SELECT TO authenticated USING (public.is_staff());

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "to" text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  text text,
  reply_to text,
  headers jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view email_outbox" ON public.email_outbox;
CREATE POLICY "Staff can view email_outbox" ON public.email_outbox FOR SELECT TO authenticated USING (public.is_staff());

CREATE TABLE IF NOT EXISTS public.otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  otp_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  is_used boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- 11. Performance Indexes (§4.5)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_students_created_at      ON public.students (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_class           ON public.students (class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date  ON public.attendance (student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_marks_student_term       ON public.marks (student_id, term);
CREATE INDEX IF NOT EXISTS idx_invoices_student_status  ON public.invoices (student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_student_created ON public.payments (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_names_trgm
  ON public.profiles USING gin ((lower(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) gin_trgm_ops);

-- 12. Kitchen Display Kiosk public access
ALTER TABLE IF EXISTS public.kitchen_display_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active kitchen items" ON public.kitchen_display_items;
CREATE POLICY "Public can view active kitchen items" ON public.kitchen_display_items FOR SELECT USING (is_active = true);
