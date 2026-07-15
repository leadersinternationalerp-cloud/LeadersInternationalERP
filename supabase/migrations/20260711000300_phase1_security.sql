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

-- 3. Update get_user_role helper function to return SETOF text
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS SETOF text
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT unnest(roles) FROM public.profiles WHERE id = user_id;
$$;
