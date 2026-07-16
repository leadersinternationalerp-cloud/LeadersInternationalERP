-- Migration: Add RLS policies for the marks table

-- Enable RLS on marks (just to be sure)
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- 1. Teachers and staff can do all operations on marks
DROP POLICY IF EXISTS "Teachers and staff can manage marks" ON public.marks;
CREATE POLICY "Teachers and staff can manage marks" 
    ON public.marks FOR ALL TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
    );

-- 2. Students can view their own marks
DROP POLICY IF EXISTS "Students can view own marks" ON public.marks;
CREATE POLICY "Students can view own marks" 
    ON public.marks FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
    );

-- 3. Parents can view their child's marks
DROP POLICY IF EXISTS "Parents can view child marks" ON public.marks;
CREATE POLICY "Parents can view child marks" 
    ON public.marks FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.student_parents
            WHERE student_parents.parent_id = auth.uid()
            AND student_parents.student_id = marks.student_id
        )
    );
