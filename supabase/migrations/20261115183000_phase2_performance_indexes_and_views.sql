-- =============================================================================
-- Leaders International School ERP — Phase 2 Performance, Indexing & Background Jobs
-- Migration: 20261115183000_phase2_performance_indexes_and_views.sql
--
-- Principles:
-- 1. Strictly additive and idempotent (IF NOT EXISTS / CREATE OR REPLACE).
-- 2. Single-institution architecture preserved (Cambridge & NECTA wings).
-- 3. Exact NUMERIC(14,2) financial aggregations in PostgreSQL.
-- 4. Row-Level Security (RLS) preserved on all new objects.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Composite & Partial Indexes for Growth-Sensitive Tables
--    Note: For zero-downtime execution outside transaction blocks on large live
--    tables, these same definitions can also be run with CREATE INDEX CONCURRENTLY.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_marks_class_subject_term_assessment
  ON public.marks (class_id, subject_id, term, assessment_type);

CREATE INDEX IF NOT EXISTS idx_marks_student_term_released
  ON public.marks (student_id, term, is_released);

CREATE INDEX IF NOT EXISTS idx_invoices_student_year_term_status
  ON public.invoices (student_id, academic_year, term, status);

CREATE INDEX IF NOT EXISTS idx_invoices_unpaid_due_date
  ON public.invoices (status, due_date)
  WHERE status <> 'Paid';

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON public.payments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date_desc
  ON public.payments (payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
  ON public.attendance (class_id, date);

CREATE INDEX IF NOT EXISTS idx_students_class_grade
  ON public.students (class_id, grade_level);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc
  ON public.audit_logs (created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. Database-Side Financial Aggregation View & RPC (Exact NUMERIC Precision)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_invoice_balances_and_aging
WITH (security_invoker = true) AS
SELECT
  i.id AS invoice_id,
  i.student_id,
  s.student_id AS admission_number,
  s.grade_level,
  CASE
    WHEN LOWER(COALESCE(s.grade_level, '')) LIKE '%cambridge%'
      OR LOWER(COALESCE(s.grade_level, '')) LIKE '%year%'
      OR LOWER(COALESCE(s.grade_level, '')) LIKE '%igcse%'
    THEN 'Cambridge'
    ELSE 'NECTA'
  END AS wing,
  i.academic_year,
  i.term,
  i.status,
  i.due_date,
  CAST(COALESCE(i.total_amount, 0) AS NUMERIC(14, 2)) AS total_amount,
  CAST(COALESCE(i.discount_amount, 0) AS NUMERIC(14, 2)) AS discount_amount,
  CAST(COALESCE(i.net_amount, COALESCE(i.total_amount, 0) - COALESCE(i.discount_amount, 0)) AS NUMERIC(14, 2)) AS net_amount,
  CAST(COALESCE(p.total_paid, 0) AS NUMERIC(14, 2)) AS total_paid,
  GREATEST(
    CAST(0 AS NUMERIC(14, 2)),
    CAST(COALESCE(i.net_amount, COALESCE(i.total_amount, 0) - COALESCE(i.discount_amount, 0)) - COALESCE(p.total_paid, 0) AS NUMERIC(14, 2))
  ) AS balance_due,
  GREATEST(0, (CURRENT_DATE - COALESCE(i.due_date::date, CURRENT_DATE))):: integer AS days_overdue,
  CASE
    WHEN GREATEST(
      CAST(0 AS NUMERIC(14, 2)),
      CAST(COALESCE(i.net_amount, COALESCE(i.total_amount, 0) - COALESCE(i.discount_amount, 0)) - COALESCE(p.total_paid, 0) AS NUMERIC(14, 2))
    ) <= 0 THEN 'Paid'
    WHEN (CURRENT_DATE - COALESCE(i.due_date::date, CURRENT_DATE)) > 90 THEN '90+ Days'
    WHEN (CURRENT_DATE - COALESCE(i.due_date::date, CURRENT_DATE)) > 60 THEN '61-90 Days'
    WHEN (CURRENT_DATE - COALESCE(i.due_date::date, CURRENT_DATE)) > 0 THEN '1-60 Days'
    ELSE 'Current'
  END AS aging_bucket
FROM public.invoices i
LEFT JOIN public.students s ON s.id = i.student_id
LEFT JOIN (
  SELECT
    invoice_id,
    CAST(SUM(COALESCE(amount, 0)) AS NUMERIC(14, 2)) AS total_paid
  FROM public.payments
  GROUP BY invoice_id
) p ON p.invoice_id = i.id;

CREATE OR REPLACE FUNCTION public.get_ar_aging_summary(p_wing TEXT DEFAULT 'all')
RETURNS TABLE (
  current_not_due NUMERIC(14, 2),
  overdue_1_to_60 NUMERIC(14, 2),
  overdue_61_to_90 NUMERIC(14, 2),
  overdue_90_plus NUMERIC(14, 2),
  total_outstanding NUMERIC(14, 2),
  unpaid_invoice_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN aging_bucket = 'Current' THEN balance_due ELSE 0 END), 0)::NUMERIC(14, 2) AS current_not_due,
    COALESCE(SUM(CASE WHEN aging_bucket = '1-60 Days' THEN balance_due ELSE 0 END), 0)::NUMERIC(14, 2) AS overdue_1_to_60,
    COALESCE(SUM(CASE WHEN aging_bucket = '61-90 Days' THEN balance_due ELSE 0 END), 0)::NUMERIC(14, 2) AS overdue_61_to_90,
    COALESCE(SUM(CASE WHEN aging_bucket = '90+ Days' THEN balance_due ELSE 0 END), 0)::NUMERIC(14, 2) AS overdue_90_plus,
    COALESCE(SUM(balance_due), 0)::NUMERIC(14, 2) AS total_outstanding,
    COUNT(*) FILTER (WHERE balance_due > 0) AS unpaid_invoice_count
  FROM public.vw_invoice_balances_and_aging
  WHERE balance_due > 0
    AND (
      p_wing IS NULL
      OR LOWER(p_wing) = 'all'
      OR LOWER(wing) = LOWER(p_wing)
    );
$$;

-- -----------------------------------------------------------------------------
-- 3. Database-Side Class Marks Summary & Ranking RPC
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_class_marks_summary(
  p_class_id UUID,
  p_term TEXT
)
RETURNS TABLE (
  student_id UUID,
  subjects_count BIGINT,
  average_score NUMERIC(6, 2),
  class_rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH student_subject_averages AS (
    SELECT
      m.student_id,
      m.subject_id,
      AVG(COALESCE(m.score, 0))::NUMERIC(6, 2) AS subject_avg
    FROM public.marks m
    WHERE m.class_id = p_class_id
      AND m.term = p_term
    GROUP BY m.student_id, m.subject_id
  ),
  student_overall AS (
    SELECT
      ssa.student_id,
      COUNT(ssa.subject_id) AS subjects_count,
      ROUND(AVG(ssa.subject_avg), 2)::NUMERIC(6, 2) AS average_score
    FROM student_subject_averages ssa
    GROUP BY ssa.student_id
  )
  SELECT
    so.student_id,
    so.subjects_count,
    so.average_score,
    RANK() OVER (ORDER BY so.average_score DESC) AS class_rank
  FROM student_overall so
  ORDER BY class_rank ASC;
$$;

-- -----------------------------------------------------------------------------
-- 4. Background Jobs Queue Table for Asynchronous Operations (Workstream C)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wing TEXT DEFAULT 'Both'
    CHECK (wing IN ('Cambridge', 'NECTA', 'Both')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  result_meta JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_created_by_status
  ON public.background_jobs (created_by, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created_at
  ON public.background_jobs (status, created_at ASC)
  WHERE status IN ('queued', 'processing');

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'background_jobs'
      AND policyname = 'Users can view their own background jobs'
  ) THEN
    CREATE POLICY "Users can view their own background jobs"
      ON public.background_jobs
      FOR SELECT
      TO authenticated
      USING (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'background_jobs'
      AND policyname = 'Users can insert their own background jobs'
  ) THEN
    CREATE POLICY "Users can insert their own background jobs"
      ON public.background_jobs
      FOR INSERT
      TO authenticated
      WITH CHECK (created_by = auth.uid());
  END IF;
END
$$;
