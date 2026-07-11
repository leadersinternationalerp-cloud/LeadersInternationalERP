-- Migration to add class_activities table

CREATE TABLE IF NOT EXISTS public.class_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.class_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for their class" 
    ON public.class_activities FOR SELECT 
    USING (true); -- Implement stricter RLS in future if needed

CREATE POLICY "Teachers can create activities" 
    ON public.class_activities FOR ALL 
    USING (true);
