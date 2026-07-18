-- Migration: Create assessment_weights table and RLS policies

CREATE TABLE IF NOT EXISTS public.assessment_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type text UNIQUE NOT NULL,
  weight numeric(5,2) NOT NULL CHECK (weight >= 0.00 AND weight <= 100.00),
  is_active bool DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Enable RLS
ALTER TABLE public.assessment_weights ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read
DROP POLICY IF EXISTS "Allow authenticated read on assessment_weights" ON public.assessment_weights;
CREATE POLICY "Allow authenticated read on assessment_weights" 
ON public.assessment_weights FOR SELECT TO authenticated 
USING (true);

-- Admin full access
DROP POLICY IF EXISTS "Allow admin all access on assessment_weights" ON public.assessment_weights;
CREATE POLICY "Allow admin all access on assessment_weights" 
ON public.assessment_weights FOR ALL TO authenticated 
USING (
  public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal')
)
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal')
);

-- Seed defaults
INSERT INTO public.assessment_weights (assessment_type, weight, is_active, display_order)
VALUES 
  ('QUIZZES', 20.00, true, 0),
  ('Test 1', 20.00, true, 1),
  ('Test 2', 20.00, true, 2),
  ('Mid-Term', 20.00, true, 3),
  ('Terminal', 40.00, true, 4),
  ('CA', 0.00, false, 5),
  ('OPENER', 20.00, false, 6)
ON CONFLICT (assessment_type) DO UPDATE 
SET weight = EXCLUDED.weight, is_active = EXCLUDED.is_active, display_order = EXCLUDED.display_order;

-- Insert into system_settings key assessment_weights json backup
INSERT INTO public.system_settings (key, value)
VALUES ('assessment_weights', '[
  {"type": "QUIZZES", "weight": 20.00, "is_active": true, "display_order": 0},
  {"type": "Test 1", "weight": 20.00, "is_active": true, "display_order": 1},
  {"type": "Test 2", "weight": 20.00, "is_active": true, "display_order": 2},
  {"type": "Mid-Term", "weight": 20.00, "is_active": true, "display_order": 3},
  {"type": "Terminal", "weight": 40.00, "is_active": true, "display_order": 4},
  {"type": "CA", "weight": 0.00, "is_active": false, "display_order": 5},
  {"type": "OPENER", "weight": 20.00, "is_active": false, "display_order": 6}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Trigger function for updated_at if not exists
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_assessment_weights_updated_at ON public.assessment_weights;
CREATE TRIGGER update_assessment_weights_updated_at
BEFORE UPDATE ON public.assessment_weights
FOR EACH ROW
EXECUTE FUNCTION public.handle_update_timestamp();
