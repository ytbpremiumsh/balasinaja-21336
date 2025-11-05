-- Add category_id to inbox table
ALTER TABLE public.inbox ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;