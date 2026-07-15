-- Migration: Phase 1 Security & Authentication Foundation
-- Adds username, pin_hash, failed_attempts, locked_until, and roles columns to profiles.
-- Migrates existing single roles to roles array.
-- Updates get_user_role helper to unnest roles.

-- 1. Alter public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}'::text[];

-- 2. Populate columns
UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

UPDATE public.profiles
SET roles = ARRAY(SELECT trim(r) FROM unnest(string_to_array(role::text, ',')) r)
WHERE role IS NOT NULL AND (roles IS NULL OR roles = '{}'::text[]);

-- 3. Update get_user_role helper function to return text (legacy support)
-- Note: Postgres does not allow changing return type from text to SETOF text when policies depend on it.
-- For multi-role support, policies should be migrated to use public.has_role() in the future.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  -- Returns the primary role for legacy policies
  SELECT COALESCE(roles[1], role::text) FROM public.profiles WHERE id = user_id;
$$;
