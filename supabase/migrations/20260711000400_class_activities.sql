-- Migration to add class_activities table

CREATE TABLE IF NOT EXISTS public.class_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.student_classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (student_id, class_id)
);

ALTER TABLE public.class_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can create activities" ON public.class_activities;
CREATE POLICY "Teachers can create activities" 
    ON public.class_activities FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
    );

DROP POLICY IF EXISTS "Teachers can update activities" ON public.class_activities;
CREATE POLICY "Teachers can update activities" 
    ON public.class_activities FOR UPDATE TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
    );

DROP POLICY IF EXISTS "Teachers can delete activities" ON public.class_activities;
CREATE POLICY "Teachers can delete activities" 
    ON public.class_activities FOR DELETE TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
    );

DROP POLICY IF EXISTS "Users can view activities" ON public.class_activities;
CREATE POLICY "Users can view activities" 
    ON public.class_activities FOR SELECT TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean')
        OR
        EXISTS (
            SELECT 1 FROM public.student_classes
            WHERE student_classes.class_id = class_activities.class_id
            AND student_classes.student_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.student_parents
            JOIN public.student_classes ON student_classes.student_id = student_parents.student_id
            WHERE student_parents.parent_id = auth.uid()
            AND student_classes.class_id = class_activities.class_id
        )
    );
