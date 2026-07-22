-- Migration: Add payment frequency checkboxes to fee structures
ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS payable_once BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payable_annually BOOLEAN DEFAULT false;
