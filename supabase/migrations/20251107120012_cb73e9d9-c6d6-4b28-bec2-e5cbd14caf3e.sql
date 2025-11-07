-- Minimal no-op migration to trigger types regeneration
-- Creates a harmless view in public schema
CREATE OR REPLACE VIEW public._lovable_types_refresh AS SELECT 1::integer AS one;