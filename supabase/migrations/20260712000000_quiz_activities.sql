-- Migration: Gemini Free MCQ Quiz Activities & Student Attempts
-- Creates columns on class_activities and the activity_attempts table.

-- 1. Alter public.class_activities table
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS grade_level text;
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS activity_type text DEFAULT 'classwork' CHECK (activity_type IN ('homework', 'quiz', 'classwork'));
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS questions jsonb;
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS time_limit_minutes integer;
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 1;
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;
ALTER TABLE public.class_activities ADD COLUMN IF NOT EXISTS total_questions integer;

-- 2. Create activity_attempts table
CREATE TABLE IF NOT EXISTS public.activity_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.class_activities(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    answers jsonb NOT NULL,
    score integer NOT NULL,
    max_score integer NOT NULL,
    percentage numeric(5, 2) NOT NULL,
    time_taken_seconds integer,
    submitted_at timestamp with time zone DEFAULT now(),
    UNIQUE (student_id, activity_id)
);

-- Enable RLS on activity_attempts
ALTER TABLE public.activity_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_attempts
DROP POLICY IF EXISTS "Students can submit their own attempts" ON public.activity_attempts;
CREATE POLICY "Students can submit their own attempts"
    ON public.activity_attempts FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can view their own attempts" ON public.activity_attempts;
CREATE POLICY "Students can view their own attempts"
    ON public.activity_attempts FOR SELECT TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers and staff can view all attempts" ON public.activity_attempts;
CREATE POLICY "Teachers and staff can view all attempts"
    ON public.activity_attempts FOR SELECT TO authenticated
    USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean'));

DROP POLICY IF EXISTS "Parents can view child attempts" ON public.activity_attempts;
CREATE POLICY "Parents can view child attempts"
    ON public.activity_attempts FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.student_parents
            WHERE student_parents.parent_id = auth.uid()
            AND student_parents.student_id = activity_attempts.student_id
        )
    );
