-- Migration: Lesson Plans Enhancements & RLS Policies

-- 1. Create lesson_plans table if not exists
CREATE TABLE IF NOT EXISTS public.lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    term TEXT NOT NULL DEFAULT 'Term 1',
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Submitted', -- 'Draft', 'Submitted', 'Approved', 'Returned'
    teacher_comments TEXT,
    review_notes TEXT,
    dean_comment TEXT,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing columns safely if table previously existed with fewer columns
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS teacher_comments TEXT;
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS dean_comment TEXT;
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_status ON public.lesson_plans(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_class_week ON public.lesson_plans(class_id, week_number);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_term_year ON public.lesson_plans(term, academic_year);

-- 4. Enable RLS
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid duplicates
DROP POLICY IF EXISTS "Teachers can view their own lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Teachers can insert their own lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Teachers can update their own lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Supervisors can view all lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Supervisors can update all lesson plans" ON public.lesson_plans;

-- RLS Policies for Teachers
CREATE POLICY "Teachers can view their own lesson plans"
    ON public.lesson_plans FOR SELECT TO authenticated
    USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their own lesson plans"
    ON public.lesson_plans FOR INSERT TO authenticated
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own lesson plans"
    ON public.lesson_plans FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- RLS Policies for Supervisors (HOS, Dean, Principal, Vice Principal, Director, Admin)
CREATE POLICY "Supervisors can view all lesson plans"
    ON public.lesson_plans FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Supervisors can update all lesson plans"
    ON public.lesson_plans FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
