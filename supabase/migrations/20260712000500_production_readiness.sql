CREATE TABLE IF NOT EXISTS public.report_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    academic_year VARCHAR NOT NULL,
    grade_level VARCHAR NOT NULL,
    total_marks NUMERIC(6,2),
    average_score NUMERIC(5,2),
    class_rank INTEGER,
    remarks TEXT,
    principal_comments TEXT,
    pdf_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year VARCHAR NOT NULL,
    account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for report_cards
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated on report_cards" ON public.report_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for admin/principal on report_cards" ON public.report_cards FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Principal'));

-- RLS for budget_lines
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated on budget_lines" ON public.budget_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for accountant/admin on budget_lines" ON public.budget_lines FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Accountant'));
