-- Migration: Wave 4 Advanced Features (Syllabus RAG, Kitchen LED)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Phase 1: Cambridge Syllabus RAG
CREATE TABLE IF NOT EXISTS public.cambridge_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name text UNIQUE NOT NULL, -- e.g., 'Primary Stage 1', 'IGCSE'
  description text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cambridge_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES public.cambridge_stages(id) ON DELETE CASCADE,
  subject_name text NOT NULL, -- e.g., 'Mathematics'
  subject_code text, -- e.g., '0580'
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(stage_id, subject_name)
);

CREATE TABLE IF NOT EXISTS public.cambridge_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cambridge_subject_id uuid REFERENCES public.cambridge_subjects(id) ON DELETE CASCADE,
  unit_number integer NOT NULL,
  unit_title text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cambridge_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.cambridge_units(id) ON DELETE CASCADE,
  topic_number text, -- e.g., '1.1'
  topic_title text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cambridge_learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.cambridge_topics(id) ON DELETE CASCADE,
  objective_code text, -- e.g., '1.1.a'
  objective_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Vector Store for RAG
CREATE TABLE IF NOT EXISTS public.syllabus_kb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_objective_id uuid REFERENCES public.cambridge_learning_objectives(id) ON DELETE CASCADE,
  content text NOT NULL, -- The text being embedded (usually objective_text + topic_title)
  embedding vector(1536), -- Assuming OpenAI text-embedding-3-small (or similar size)
  created_at timestamp with time zone DEFAULT now()
);

-- Add an index for cosine similarity search (pgvector hnsw index)
CREATE INDEX IF NOT EXISTS syllabus_kb_embedding_idx 
ON public.syllabus_kb USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Search function for vector similarity
CREATE OR REPLACE FUNCTION match_syllabus_kb(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  learning_objective_id uuid,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    syllabus_kb.id,
    syllabus_kb.learning_objective_id,
    syllabus_kb.content,
    1 - (syllabus_kb.embedding <=> query_embedding) AS similarity
  FROM public.syllabus_kb
  WHERE 1 - (syllabus_kb.embedding <=> query_embedding) > match_threshold
  ORDER BY syllabus_kb.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- Phase 3: Kitchen LED Display
CREATE TABLE IF NOT EXISTS public.kitchen_display_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_type text NOT NULL CHECK (display_type IN ('MENU', 'QUEUE', 'ANNOUNCEMENT')),
  content text NOT NULL,
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Seed Initial Kitchen Display
INSERT INTO public.kitchen_display_items (display_type, content, order_index) VALUES 
('MENU', 'Today''s Lunch: Rice & Beans with Fresh Vegetables', 1),
('ANNOUNCEMENT', 'Please remember to return your trays to the designated area.', 2);


-- Enable RLS
ALTER TABLE public.cambridge_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambridge_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambridge_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambridge_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambridge_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_display_items ENABLE ROW LEVEL SECURITY;

-- Base Policies
CREATE POLICY "Allow all authenticated users read access to syllabus" ON public.cambridge_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated users read access to subjects" ON public.cambridge_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated users read access to units" ON public.cambridge_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated users read access to topics" ON public.cambridge_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated users read access to objectives" ON public.cambridge_learning_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated users read access to KB" ON public.syllabus_kb FOR SELECT TO authenticated USING (true);

-- Kitchen Policies (Allow anon read for public kiosk, Admin write)
CREATE POLICY "Allow public read access to kitchen display" ON public.kitchen_display_items FOR SELECT USING (true);
CREATE POLICY "Allow admin manage kitchen display" ON public.kitchen_display_items FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));
