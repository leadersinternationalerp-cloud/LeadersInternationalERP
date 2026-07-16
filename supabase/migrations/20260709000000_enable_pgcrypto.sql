-- Enable pgcrypto (provides gen_random_uuid) and provide a compatibility wrapper
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Provide a lightweight wrapper so existing migrations using
-- uuid_generate_v4() continue to work if uuid-ossp isn't available.
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid AS $$
    SELECT gen_random_uuid();
$$ LANGUAGE SQL VOLATILE;
