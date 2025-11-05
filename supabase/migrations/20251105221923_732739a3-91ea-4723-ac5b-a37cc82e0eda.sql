-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create broadcast_templates table
CREATE TABLE IF NOT EXISTS public.broadcast_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  media_type TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcast_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcast_templates
CREATE POLICY "Users can view own templates"
  ON public.broadcast_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.broadcast_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.broadcast_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.broadcast_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing columns to broadcast_logs if they don't exist
ALTER TABLE public.broadcast_logs 
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.broadcast_templates(id),
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delay_min INTEGER,
  ADD COLUMN IF NOT EXISTS delay_max INTEGER,
  ADD COLUMN IF NOT EXISTS use_personalization BOOLEAN;

-- Create broadcast_queue table if not exists
CREATE TABLE IF NOT EXISTS public.broadcast_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_log_id UUID REFERENCES public.broadcast_logs(id),
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT NOT NULL,
  media_type TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcast_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcast_queue
CREATE POLICY "Users can view own queue"
  ON public.broadcast_queue
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.broadcast_logs
    WHERE broadcast_logs.id = broadcast_queue.broadcast_log_id
    AND broadcast_logs.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage queue"
  ON public.broadcast_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add category_id to inbox if not exists
ALTER TABLE public.inbox
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);