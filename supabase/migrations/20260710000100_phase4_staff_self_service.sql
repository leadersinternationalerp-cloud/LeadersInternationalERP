-- Migration: Phase 4 Staff Self-Service
-- Creates tables: leave_applications, leave_balances, salary_advances, advance_repayments, payslips
-- Sets up RLS, indexes, and automated triggers.

-- 1. Create leave_applications table
CREATE TABLE IF NOT EXISTS public.leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('Annual Leave', 'Sick Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave', 'Study Leave', 'Unpaid Leave', 'Other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL CHECK (days > 0),
  reason text NOT NULL,
  supporting_document_url text,
  acting_staff_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
  reviewer_id uuid REFERENCES public.profiles(id),
  reviewer_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

-- Enable RLS on leave_applications
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;

-- 2. Create leave_balances table
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year text NOT NULL, -- e.g., '2025-2026'
  leave_type text NOT NULL,
  entitled_days integer NOT NULL CHECK (entitled_days >= 0),
  used_days integer NOT NULL DEFAULT 0 CHECK (used_days >= 0),
  remaining_days integer GENERATED ALWAYS AS (entitled_days - used_days) STORED,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (employee_id, academic_year, leave_type)
);

-- Enable RLS on leave_balances
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- 3. Create salary_advances table
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_requested numeric(12, 2) NOT NULL CHECK (amount_requested > 0),
  amount_approved numeric(12, 2) CHECK (amount_approved >= 0),
  repayment_period_months integer NOT NULL CHECK (repayment_period_months > 0),
  reason text NOT NULL,
  supporting_document_url text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined', 'Disbursed', 'Fully Repaid')),
  reviewer_id uuid REFERENCES public.profiles(id),
  reviewer_notes text,
  reviewed_at timestamp with time zone,
  disbursed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on salary_advances
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- 4. Create advance_repayments table
CREATE TABLE IF NOT EXISTS public.advance_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id uuid NOT NULL REFERENCES public.salary_advances(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  repayment_date timestamp with time zone DEFAULT now(),
  deducted_via_payroll boolean NOT NULL DEFAULT true
);

-- Enable RLS on advance_repayments
ALTER TABLE public.advance_repayments ENABLE ROW LEVEL SECURITY;

-- 5. Create payslips table
CREATE TABLE IF NOT EXISTS public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  basic_pay numeric(12, 2) NOT NULL CHECK (basic_pay >= 0),
  total_allowances numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_allowances >= 0),
  total_deductions numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_deductions >= 0),
  net_salary numeric(12, 2) NOT NULL CHECK (net_salary >= 0),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (employee_id, month, year)
);

-- Enable RLS on payslips
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;


-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_leave_apps_employee ON public.leave_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_apps_status ON public.leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_employee ON public.salary_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_status ON public.salary_advances(status);
CREATE INDEX IF NOT EXISTS idx_repayments_advance ON public.advance_repayments(advance_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON public.payslips(employee_id);


-- 7. RLS POLICIES

-- leave_applications policies
DROP POLICY IF EXISTS "Employees can view own leave applications" ON public.leave_applications;
CREATE POLICY "Employees can view own leave applications"
  ON public.leave_applications FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Reviewers can view all leave applications" ON public.leave_applications;
CREATE POLICY "Reviewers can view all leave applications"
  ON public.leave_applications FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));

DROP POLICY IF EXISTS "Employees can apply for leave" ON public.leave_applications;
CREATE POLICY "Employees can apply for leave"
  ON public.leave_applications FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Reviewers can update leave applications" ON public.leave_applications;
CREATE POLICY "Reviewers can update leave applications"
  ON public.leave_applications FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));

-- leave_balances policies
DROP POLICY IF EXISTS "Employees can view own leave balances" ON public.leave_balances;
CREATE POLICY "Employees can view own leave balances"
  ON public.leave_balances FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Reviewers and Accountants can view all leave balances" ON public.leave_balances;
CREATE POLICY "Reviewers and Accountants can view all leave balances"
  ON public.leave_balances FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

DROP POLICY IF EXISTS "Accountants and Admins can manage leave balances" ON public.leave_balances;
CREATE POLICY "Accountants and Admins can manage leave balances"
  ON public.leave_balances FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- salary_advances policies
DROP POLICY IF EXISTS "Employees can view own salary advances" ON public.salary_advances;
CREATE POLICY "Employees can view own salary advances"
  ON public.salary_advances FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Reviewers and Accountants can view all salary advances" ON public.salary_advances;
CREATE POLICY "Reviewers and Accountants can view all salary advances"
  ON public.salary_advances FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

DROP POLICY IF EXISTS "Employees can apply for salary advance" ON public.salary_advances;
CREATE POLICY "Employees can apply for salary advance"
  ON public.salary_advances FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Reviewers can update salary advances" ON public.salary_advances;
CREATE POLICY "Reviewers can update salary advances"
  ON public.salary_advances FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- advance_repayments policies
DROP POLICY IF EXISTS "Employees can view own repayments" ON public.advance_repayments;
CREATE POLICY "Employees can view own repayments"
  ON public.advance_repayments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_advances
      WHERE salary_advances.id = advance_repayments.advance_id
      AND salary_advances.employee_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Accountants can view and manage all repayments" ON public.advance_repayments;
CREATE POLICY "Accountants can view and manage all repayments"
  ON public.advance_repayments FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- payslips policies
DROP POLICY IF EXISTS "Employees can view own payslips" ON public.payslips;
CREATE POLICY "Employees can view own payslips"
  ON public.payslips FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Accountants and Reviewers can view all payslips" ON public.payslips;
CREATE POLICY "Accountants and Reviewers can view all payslips"
  ON public.payslips FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

DROP POLICY IF EXISTS "Accountants and Admins can manage payslips" ON public.payslips;
CREATE POLICY "Accountants and Admins can manage payslips"
  ON public.payslips FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));


-- 8. AUTOMATION TRIGGERS

-- Trigger to seed default annual leave balances (21 days) upon staff profile registration
CREATE OR REPLACE FUNCTION public.seed_leave_balances()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IN ('Director', 'Principal', 'Accountant', 'Head of Section', 'Dean', 'Teacher', 'Clinic', 'Transport') THEN
    -- Seed Annual Leave balance for the current academic year (2025-2026)
    INSERT INTO public.leave_balances (employee_id, academic_year, leave_type, entitled_days, used_days)
    VALUES (NEW.id, '2025-2026', 'Annual Leave', 21, 0)
    ON CONFLICT (employee_id, academic_year, leave_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_seed_leave_balances ON public.profiles;
CREATE TRIGGER tr_seed_leave_balances
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.seed_leave_balances();

-- Trigger to deduct remaining leave balances when leave is approved
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status <> 'Approved') THEN
    -- Update leave balance or insert if missing
    INSERT INTO public.leave_balances (employee_id, academic_year, leave_type, entitled_days, used_days)
    VALUES (NEW.employee_id, '2025-2026', NEW.leave_type, 21, NEW.days)
    ON CONFLICT (employee_id, academic_year, leave_type)
    DO UPDATE SET used_days = public.leave_balances.used_days + NEW.days;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_handle_leave_approval ON public.leave_applications;
CREATE TRIGGER tr_handle_leave_approval
AFTER UPDATE ON public.leave_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_leave_approval();
