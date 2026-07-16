-- Migration: Fix class_activities RLS policy and align students class_id columns

-- 1. Add class_id to students table if not exists
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 2. Populate class_id on students table from classes matching grade_level and section
UPDATE public.students s
SET class_id = c.id
FROM public.classes c
WHERE c.name = s.grade_level 
  AND (c.section = s.section OR (c.section IS NULL AND s.section IS NULL))
  AND s.class_id IS NULL;

-- 3. Populate student_classes junction table for all existing students
INSERT INTO public.student_classes (student_id, class_id)
SELECT s.id, s.class_id 
FROM public.students s
WHERE s.class_id IS NOT NULL
ON CONFLICT (student_id, class_id) DO NOTHING;

-- 4. Update RLS policy on class_activities
DROP POLICY IF EXISTS "Users can view activities" ON public.class_activities;

CREATE POLICY "Users can view activities" 
    ON public.class_activities FOR SELECT TO authenticated
    USING (
        -- Allow teachers/staff
        public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
        OR
        -- Allow students in the class
        EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.classes c ON c.name = s.grade_level AND (c.section = s.section OR (c.section IS NULL AND s.section IS NULL))
            WHERE s.id = auth.uid()
            AND c.id = class_activities.class_id
        )
        OR
        -- Allow parents of students in the class
        EXISTS (
            SELECT 1 FROM public.student_parents sp
            JOIN public.students s ON s.id = sp.student_id
            JOIN public.classes c ON c.name = s.grade_level AND (c.section = s.section OR (c.section IS NULL AND s.section IS NULL))
            WHERE sp.parent_id = auth.uid()
            AND c.id = class_activities.class_id
        )
    );
