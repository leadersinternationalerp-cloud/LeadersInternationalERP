-- Migration: Ingest 2027 Cambridge Wing & NECTA Wing Official Fee Structures
-- Adds wing, monthly_amount, annual_amount, and due_date columns to fee_structures

ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS wing text DEFAULT 'Cambridge',
  ADD COLUMN IF NOT EXISTS monthly_amount numeric(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS annual_amount numeric(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS due_date date;

-- Ensure 2027 academic year exists if academic_years table is present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'academic_years'
  ) THEN
    INSERT INTO public.academic_years (name)
    SELECT '2027'
    WHERE NOT EXISTS (SELECT 1 FROM public.academic_years WHERE name = '2027');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Idempotently replace 2027 seeded fee_structures if no invoice_items reference them yet
DELETE FROM public.fee_structures
WHERE academic_year = '2027'
  AND id NOT IN (
    SELECT DISTINCT fee_structure_id FROM public.invoice_items WHERE fee_structure_id IS NOT NULL
  );

-- =========================================================================
-- 1. CAMBRIDGE WING 2027 (Academic Year 2027 | Primary Year 1 - 6 | TZS)
-- =========================================================================
-- Year 1 - 3: Monthly 360,000 | Annual 4,320,000 | 3 Instalments of 1,440,000
-- Year 4 - 6: Monthly 468,000 | Annual 5,616,000 | 3 Instalments of 1,872,000

INSERT INTO public.fee_structures (
  academic_year, term, grade_level, fee_type, amount, monthly_amount, annual_amount,
  due_date, wing, payable_once, payable_annually, description
)
SELECT
  v.academic_year, v.term, v.grade_level, v.fee_type, v.amount, v.monthly_amount, v.annual_amount,
  v.due_date::date, v.wing, v.payable_once, v.payable_annually, v.description
FROM (
  -- Cambridge Year 1, Year 2, Year 3
  SELECT '2027' AS academic_year, t.term, g.grade_level, f.fee_type, f.amount, f.monthly_amount, f.annual_amount,
         t.due_date, 'Cambridge' AS wing, false AS payable_once, false AS payable_annually,
         'Cambridge Wing 2027 Official Fee Structure (Year 1 - 3)' AS description
  FROM (VALUES ('Cambridge Year 1'), ('Cambridge Year 2'), ('Cambridge Year 3')) AS g(grade_level)
  CROSS JOIN (VALUES
    ('Term 1', '2027-01-08'),
    ('Term 2', '2027-04-20'),
    ('Term 3', '2027-08-05')
  ) AS t(term, due_date)
  CROSS JOIN (VALUES
    ('Tuition', 620000::numeric, 155000::numeric, 1860000::numeric),
    ('Stationery', 500000::numeric, 125000::numeric, 1500000::numeric),
    ('Meals (Breakfast & Lunch)', 320000::numeric, 80000::numeric, 960000::numeric)
  ) AS f(fee_type, amount, monthly_amount, annual_amount)

  UNION ALL

  -- Cambridge Year 4, Year 5, Year 6
  SELECT '2027', t.term, g.grade_level, f.fee_type, f.amount, f.monthly_amount, f.annual_amount,
         t.due_date, 'Cambridge', false, false,
         'Cambridge Wing 2027 Official Fee Structure (Year 4 - 6)'
  FROM (VALUES ('Cambridge Year 4'), ('Cambridge Year 5'), ('Cambridge Year 6')) AS g(grade_level)
  CROSS JOIN (VALUES
    ('Term 1', '2027-01-08'),
    ('Term 2', '2027-04-20'),
    ('Term 3', '2027-08-05')
  ) AS t(term, due_date)
  CROSS JOIN (VALUES
    ('Tuition', 972000::numeric, 243000::numeric, 2916000::numeric),
    ('Stationery', 580000::numeric, 145000::numeric, 1740000::numeric),
    ('Meals (Breakfast & Lunch)', 320000::numeric, 80000::numeric, 960000::numeric)
  ) AS f(fee_type, amount, monthly_amount, annual_amount)

  UNION ALL

  -- Cambridge One-time Admission Fee (new students only)
  SELECT '2027', 'Term 1', g.grade_level, 'Admission Fee', 150000::numeric, 0::numeric, 150000::numeric,
         '2027-01-08', 'Cambridge', true, false,
         'One-time admission fee payable on admission (new students only)'
  FROM (VALUES
    ('Cambridge Year 1'), ('Cambridge Year 2'), ('Cambridge Year 3'),
    ('Cambridge Year 4'), ('Cambridge Year 5'), ('Cambridge Year 6')
  ) AS g(grade_level)

  UNION ALL

  -- =========================================================================
  -- 2. NECTA WING 2027 (Academic Year 2027 | Baby Class, Nursery, Primary 1-6)
  -- =========================================================================
  -- Baby Class: Monthly 150,000 | Annual 1,800,000 | Instalments: 600,000 / 600,000 / 600,000
  SELECT '2027', 'Term 1', 'Baby Class', 'Tuition', 173333::numeric, 43333::numeric, 520000::numeric,
         '2027-01-08', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Baby Class)'
  UNION ALL
  SELECT '2027', 'Term 1', 'Baby Class', 'Stationery, Meals & Other Curriculums', 426667::numeric, 106667::numeric, 1280000::numeric,
         '2027-01-08', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Baby Class)'
  UNION ALL
  SELECT '2027', 'Term 2', 'Baby Class', 'Tuition', 173333::numeric, 43333::numeric, 520000::numeric,
         '2027-04-20', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Baby Class)'
  UNION ALL
  SELECT '2027', 'Term 2', 'Baby Class', 'Stationery, Meals & Other Curriculums', 426667::numeric, 106667::numeric, 1280000::numeric,
         '2027-04-20', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Baby Class)'
  UNION ALL
  SELECT '2027', 'Term 3', 'Baby Class', 'Tuition', 173334::numeric, 43333::numeric, 520000::numeric,
         '2027-08-05', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Baby Class)'
  UNION ALL
  SELECT '2027', 'Term 3', 'Baby Class', 'Stationery, Meals & Other Curriculums', 426666::numeric, 106667::numeric, 1280000::numeric,
         '2027-08-05', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Baby Class)'

  UNION ALL

  -- Nursery: Monthly 166,667 | Annual 2,000,000 | Instalments: 670,000 / 665,000 / 665,000
  SELECT '2027', 'Term 1', 'Nursery', 'Tuition', 240000::numeric, 60000::numeric, 720000::numeric,
         '2027-01-08', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Nursery)'
  UNION ALL
  SELECT '2027', 'Term 1', 'Nursery', 'Stationery, Meals & Other Curriculums', 430000::numeric, 106667::numeric, 1280000::numeric,
         '2027-01-08', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Nursery)'
  UNION ALL
  SELECT '2027', 'Term 2', 'Nursery', 'Tuition', 240000::numeric, 60000::numeric, 720000::numeric,
         '2027-04-20', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Nursery)'
  UNION ALL
  SELECT '2027', 'Term 2', 'Nursery', 'Stationery, Meals & Other Curriculums', 425000::numeric, 106667::numeric, 1280000::numeric,
         '2027-04-20', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Nursery)'
  UNION ALL
  SELECT '2027', 'Term 3', 'Nursery', 'Tuition', 240000::numeric, 60000::numeric, 720000::numeric,
         '2027-08-05', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Nursery)'
  UNION ALL
  SELECT '2027', 'Term 3', 'Nursery', 'Stationery, Meals & Other Curriculums', 425000::numeric, 106667::numeric, 1280000::numeric,
         '2027-08-05', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Nursery)'

  UNION ALL

  -- Primary 1 - 6 (Grade 1 .. Grade 6): Monthly 183,333 | Annual 2,200,000 | Instalments: 740,000 / 730,000 / 730,000
  SELECT '2027', 'Term 1', g.grade_level, 'Tuition', 310000::numeric, 76666::numeric, 920000::numeric,
         '2027-01-08', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)'
  FROM (VALUES ('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6')) AS g(grade_level)
  UNION ALL
  SELECT '2027', 'Term 1', g.grade_level, 'Stationery, Meals & Other Curriculums', 430000::numeric, 106667::numeric, 1280000::numeric,
         '2027-01-08', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)'
  FROM (VALUES ('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6')) AS g(grade_level)
  UNION ALL
  SELECT '2027', 'Term 2', g.grade_level, 'Tuition', 305000::numeric, 76666::numeric, 920000::numeric,
         '2027-04-20', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)'
  FROM (VALUES ('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6')) AS g(grade_level)
  UNION ALL
  SELECT '2027', 'Term 2', g.grade_level, 'Stationery, Meals & Other Curriculums', 425000::numeric, 106667::numeric, 1280000::numeric,
         '2027-04-20', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)'
  FROM (VALUES ('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6')) AS g(grade_level)
  UNION ALL
  SELECT '2027', 'Term 3', g.grade_level, 'Tuition', 305000::numeric, 76666::numeric, 920000::numeric,
         '2027-08-05', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)'
  FROM (VALUES ('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6')) AS g(grade_level)
  UNION ALL
  SELECT '2027', 'Term 3', g.grade_level, 'Stationery, Meals & Other Curriculums', 425000::numeric, 106667::numeric, 1280000::numeric,
         '2027-08-05', 'NECTA', false, false, 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)'
  FROM (VALUES ('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6')) AS g(grade_level)

  UNION ALL

  -- NECTA One-time Admission Fee (new students only)
  SELECT '2027', 'Term 1', g.grade_level, 'Admission Fee', 150000::numeric, 0::numeric, 150000::numeric,
         '2027-01-08', 'NECTA', true, false,
         'One-time admission fee payable on admission (new students only)'
  FROM (VALUES
    ('Baby Class'), ('Nursery'),
    ('Grade 1'), ('Grade 2'), ('Grade 3'), ('Grade 4'), ('Grade 5'), ('Grade 6')
  ) AS g(grade_level)
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM public.fee_structures existing
  WHERE existing.academic_year = v.academic_year
    AND existing.term = v.term
    AND existing.grade_level = v.grade_level
    AND existing.fee_type = v.fee_type
);
