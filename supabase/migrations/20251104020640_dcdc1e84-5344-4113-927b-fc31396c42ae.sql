-- Create categories table for broadcast
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_categories junction table
CREATE TABLE public.contact_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, contact_id)
);

-- Create broadcast_logs table to track sent messages
CREATE TABLE public.broadcast_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for contact_categories
CREATE POLICY "Users can view own contact_categories" ON public.contact_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.categories 
      WHERE categories.id = contact_categories.category_id 
      AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own contact_categories" ON public.contact_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories 
      WHERE categories.id = contact_categories.category_id 
      AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own contact_categories" ON public.contact_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.categories 
      WHERE categories.id = contact_categories.category_id 
      AND categories.user_id = auth.uid()
    )
  );

-- RLS Policies for broadcast_logs
CREATE POLICY "Users can view own broadcast_logs" ON public.broadcast_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own broadcast_logs" ON public.broadcast_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);