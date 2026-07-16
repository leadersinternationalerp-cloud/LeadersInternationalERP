-- Migration: Pre-seed Integrations (WhatsApp, SMS, etc.)
-- This relies on the schema created in 000400_hardening_integrations_recon.sql

-- Insert default providers if they don't already exist
INSERT INTO public.integration_config (provider_type, provider_name, is_active)
SELECT 'WHATSAPP', 'WhatsApp Meta Cloud', false
WHERE NOT EXISTS (
    SELECT 1 FROM public.integration_config WHERE provider_name = 'WhatsApp Meta Cloud'
);

INSERT INTO public.integration_config (provider_type, provider_name, is_active)
SELECT 'SMS', 'Twilio SMS', false
WHERE NOT EXISTS (
    SELECT 1 FROM public.integration_config WHERE provider_name = 'Twilio SMS'
);

INSERT INTO public.integration_config (provider_type, provider_name, is_active)
SELECT 'SMTP', 'Custom HTTP / SMTP', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.integration_config WHERE provider_name = 'Custom HTTP / SMTP'
);
