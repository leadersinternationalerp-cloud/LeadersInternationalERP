-- Migration: Phase 5 Communication & Oversight
-- Creates tables: calendar_events, submitted_reports, appraisal_cycles, appraisals, discipline_records, notifications
-- Sets up RLS and indexes.

-- 1. Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('Public Holiday', 'Exams', 'School Activity', 'Staff Meeting', 'Other')),
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  description text NOT NULL,
  target_audience text NOT NULL DEFAULT 'All School' CHECK (target_audience IN ('All School', 'Section', 'Class')),
  audience_ids text[] DEFAULT '{}'::text[],
  attachment_url text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chk_event_dates CHECK (end_date >= start_date)
);

-- Enable RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 2. Create submitted_reports table
CREATE TABLE IF NOT EXISTS public.submitted_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('Academic', 'Financial', 'Administrative', 'Staff', 'Other')),
  content text NOT NULL,
  attachment_url text,
  submit_to text NOT NULL CHECK (submit_to IN ('Principal', 'Director', 'Both')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed', 'Approved', 'Returned')),
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_notes text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on submitted_reports
ALTER TABLE public.submitted_reports ENABLE ROW LEVEL SECURITY;

-- 3. Create appraisal_cycles table
CREATE TABLE IF NOT EXISTS public.appraisal_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  indicators jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of objects: {name: string, max_score: number}
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chk_appraisal_dates CHECK (end_date >= start_date)
);

-- Enable RLS on appraisal_cycles
ALTER TABLE public.appraisal_cycles ENABLE ROW LEVEL SECURITY;

-- 4. Create appraisals table
CREATE TABLE IF NOT EXISTS public.appraisals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  self_scores jsonb NOT NULL DEFAULT '{}'::jsonb, -- key-value scores
  self_comments text,
  reviewer_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewer_comments text,
  final_rating text CHECK (final_rating IN ('Excellent', 'Good', 'Satisfactory', 'Needs Improvement')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Review', 'Completed')),
  reviewer_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (cycle_id, employee_id)
);

-- Enable RLS on appraisals
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;

-- 5. Create discipline_records table
CREATE TABLE IF NOT EXISTS public.discipline_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  incident_date date NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Misconduct', 'Absenteeism', 'Academic Dishonesty', 'Bullying', 'Other')),
  action_taken text NOT NULL,
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_date date,
  parent_notified boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id), -- Dean
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on discipline_records
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;

-- 6. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  link_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_by ON public.submitted_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_status ON public.submitted_reports(status);
CREATE INDEX IF NOT EXISTS idx_appraisals_cycle ON public.appraisals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_employee ON public.appraisals(employee_id);
CREATE INDEX IF NOT EXISTS idx_discipline_student ON public.discipline_records(student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_date ON public.discipline_records(incident_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);


-- 8. RLS POLICIES

-- calendar_events
DROP POLICY IF EXISTS "All users can view calendar events" ON public.calendar_events;
CREATE POLICY "All users can view calendar events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Reviewers can manage calendar events" ON public.calendar_events;
CREATE POLICY "Reviewers can manage calendar events"
  ON public.calendar_events FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Dean', 'Head of Section'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Dean', 'Head of Section'));

-- submitted_reports
DROP POLICY IF EXISTS "Employees can view own submitted reports" ON public.submitted_reports;
CREATE POLICY "Employees can view own submitted reports"
  ON public.submitted_reports FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS "Reviewers can view reports submitted to them" ON public.submitted_reports;
CREATE POLICY "Reviewers can view reports submitted to them"
  ON public.submitted_reports FOR SELECT TO authenticated
  USING (
    (submit_to = 'Principal' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Principal')) OR
    (submit_to = 'Director' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Director')) OR
    (submit_to = 'Both' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Principal', 'Director'))
  );

DROP POLICY IF EXISTS "Employees can submit reports" ON public.submitted_reports;
CREATE POLICY "Employees can submit reports"
  ON public.submitted_reports FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "Submitter can edit returned reports" ON public.submitted_reports;
CREATE POLICY "Submitter can edit returned reports"
  ON public.submitted_reports FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() AND status = 'Returned')
  WITH CHECK (submitted_by = auth.uid() AND status = 'Returned');

DROP POLICY IF EXISTS "Reviewers can update reports" ON public.submitted_reports;
CREATE POLICY "Reviewers can update reports"
  ON public.submitted_reports FOR UPDATE TO authenticated
  USING (
    (submit_to = 'Principal' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Principal')) OR
    (submit_to = 'Director' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Director')) OR
    (submit_to = 'Both' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Principal', 'Director'))
  )
  WITH CHECK (
    (submit_to = 'Principal' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Principal')) OR
    (submit_to = 'Director' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Director')) OR
    (submit_to = 'Both' AND public.get_user_role(auth.uid()) IN ('System Admin', 'Principal', 'Director'))
  );

-- appraisal_cycles
DROP POLICY IF EXISTS "All users can view appraisal cycles" ON public.appraisal_cycles;
CREATE POLICY "All users can view appraisal cycles"
  ON public.appraisal_cycles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Reviewers can manage cycles" ON public.appraisal_cycles;
CREATE POLICY "Reviewers can manage cycles"
  ON public.appraisal_cycles FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));

-- appraisals
DROP POLICY IF EXISTS "Employees can view own appraisals" ON public.appraisals;
CREATE POLICY "Employees can view own appraisals"
  ON public.appraisals FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Reviewers can view all appraisals" ON public.appraisals;
CREATE POLICY "Reviewers can view all appraisals"
  ON public.appraisals FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));

DROP POLICY IF EXISTS "Employees can create self appraisals" ON public.appraisals;
CREATE POLICY "Employees can create self appraisals"
  ON public.appraisals FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Employees and Reviewers can update appraisals" ON public.appraisals;
CREATE POLICY "Employees and Reviewers can update appraisals"
  ON public.appraisals FOR UPDATE TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal')
  )
  WITH CHECK (
    employee_id = auth.uid() OR
    public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal')
  );

-- discipline_records
DROP POLICY IF EXISTS "Staff can view discipline records" ON public.discipline_records;
CREATE POLICY "Staff can view discipline records"
  ON public.discipline_records FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Dean'));

DROP POLICY IF EXISTS "Parents can view child discipline records" ON public.discipline_records;
CREATE POLICY "Parents can view child discipline records"
  ON public.discipline_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_parents
      WHERE student_parents.parent_id = auth.uid()
      AND student_parents.student_id = discipline_records.student_id
    )
  );

DROP POLICY IF EXISTS "Dean can manage discipline records" ON public.discipline_records;
CREATE POLICY "Dean can manage discipline records"
  ON public.discipline_records FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Dean'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Dean'));

-- notifications
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow global system notification creation" ON public.notifications;
CREATE POLICY "Allow global system notification creation"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
