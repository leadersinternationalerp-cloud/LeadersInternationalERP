-- Fix RLS policies on system_settings and assessment_weights so that:
-- 1. Multi-role users are evaluated via public.has_any_role() instead of public.get_user_role() (which only checks roles[1]).
-- 2. Principal and Dean can manage academic configuration keys ('assessment_weights', 'grading_scale') in system_settings
--    and all rows in assessment_weights, matching the server action authorization checks.

-- system_settings
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['System Admin', 'Director']))
  WITH CHECK (public.has_any_role(ARRAY['System Admin', 'Director']));

DROP POLICY IF EXISTS "Academic leadership can manage academic system settings" ON public.system_settings;
CREATE POLICY "Academic leadership can manage academic system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (
    key IN ('assessment_weights', 'grading_scale')
    AND public.has_any_role(ARRAY['Principal', 'Dean'])
  )
  WITH CHECK (
    key IN ('assessment_weights', 'grading_scale')
    AND public.has_any_role(ARRAY['Principal', 'Dean'])
  );

-- assessment_weights
DROP POLICY IF EXISTS "Allow admin all access on assessment_weights" ON public.assessment_weights;
CREATE POLICY "Allow admin all access on assessment_weights"
  ON public.assessment_weights FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean'])
  );
