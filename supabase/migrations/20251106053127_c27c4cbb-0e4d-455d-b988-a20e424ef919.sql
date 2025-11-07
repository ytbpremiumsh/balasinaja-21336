-- Add category_id to inbox table for categorizing messages
ALTER TABLE public.inbox
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;