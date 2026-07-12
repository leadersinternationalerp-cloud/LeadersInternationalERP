-- Migration: Academics, AI Quizzes, and Biometrics
-- Phase 1: Report Cards & Early Years
CREATE TABLE IF NOT EXISTS public.grade_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_name text NOT NULL, -- e.g., 'Primary A-F', 'IB 1-7'
  min_score numeric(5,2) NOT NULL,
  max_score numeric(5,2) NOT NULL,
  grade_label text NOT NULL,
  remarks text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_area_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.terms(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  learning_area text NOT NULL,
  achievement_level text NOT NULL, -- e.g., 'Emerging', 'Expected', 'Exceeding'
  teacher_observation text,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_card_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid REFERENCES public.terms(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  published_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Phase 2: AI Quiz Parity
CREATE TABLE IF NOT EXISTS public.quiz_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_id uuid REFERENCES public.subjects(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_bank_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_bank_id uuid REFERENCES public.quiz_banks(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  options jsonb, -- Array of {text, is_correct, rationale}
  difficulty text CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  cognitive_level text, -- e.g., 'Remember', 'Apply', 'Analyze'
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES public.profiles(id),
  topic text NOT NULL,
  num_questions integer NOT NULL,
  difficulty text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'APPROVED', 'REJECTED')),
  generated_questions jsonb, -- The AI output waiting for review
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Phase 3: Biometrics
CREATE TABLE IF NOT EXISTS public.biometric_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  device_serial text UNIQUE NOT NULL,
  location text,
  status text DEFAULT 'ACTIVE',
  last_ping_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.biometric_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.biometric_devices(id),
  biometric_id text NOT NULL, -- The ID returned by the scanner
  scan_time timestamp with time zone NOT NULL,
  matched_profile_id uuid REFERENCES public.profiles(id), -- Null if unmatched
  status text NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, UNMATCHED, DUPLICATE
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biometric_log_id uuid REFERENCES public.biometric_logs(id) ON DELETE CASCADE,
  exception_type text NOT NULL, -- UNMATCHED_ID, DUPLICATE_SCAN, LATE_ARRIVAL
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'IGNORED')),
  resolution_notes text,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Seed Data for Grade Boundaries
INSERT INTO public.grade_boundaries (framework_name, min_score, max_score, grade_label, remarks) VALUES 
  ('Primary A-F', 90, 100, 'A', 'Excellent'),
  ('Primary A-F', 80, 89.99, 'B', 'Very Good'),
  ('Primary A-F', 70, 79.99, 'C', 'Good'),
  ('Primary A-F', 60, 69.99, 'D', 'Satisfactory'),
  ('Primary A-F', 0, 59.99, 'F', 'Needs Improvement');

-- RLS Enablement
ALTER TABLE public.grade_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_area_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;

-- Basic Policies (allowing Admin/Principal/Teacher appropriate access)
-- Note: In a real environment, you'd tailor these exactly to the get_user_role() function.
CREATE POLICY "Allow all authenticated users read access" ON public.grade_boundaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated users read access" ON public.learning_area_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow teachers to insert learning progress" ON public.learning_area_progress FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('Teacher', 'Principal', 'System Admin'));
CREATE POLICY "Allow all authenticated users read access" ON public.report_card_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow principal to publish report cards" ON public.report_card_releases FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('Principal', 'System Admin'));

CREATE POLICY "Allow teachers to manage quiz banks" ON public.quiz_banks FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('Teacher', 'Principal', 'System Admin'));
CREATE POLICY "Allow teachers to manage quiz items" ON public.quiz_bank_items FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('Teacher', 'Principal', 'System Admin'));
CREATE POLICY "Allow teachers to manage quiz jobs" ON public.quiz_generation_jobs FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('Teacher', 'Principal', 'System Admin'));

CREATE POLICY "Allow admin to manage biometric devices" ON public.biometric_devices FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin'));
CREATE POLICY "Allow admin to view biometric logs" ON public.biometric_logs FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));
CREATE POLICY "Allow admin to manage exceptions" ON public.attendance_exceptions FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Principal'));
