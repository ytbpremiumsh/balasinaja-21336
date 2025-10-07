-- Drop dangerous public read policies that expose sensitive data
-- These policies allowed anyone to read API keys, autoreplies, and AI knowledge
-- The webhook edge function uses service role and bypasses RLS, so it will continue to work

DROP POLICY IF EXISTS "Webhook can read settings" ON public.settings;
DROP POLICY IF EXISTS "Webhook can read autoreplies" ON public.autoreplies;
DROP POLICY IF EXISTS "Webhook can read knowledge" ON public.ai_knowledge_base;