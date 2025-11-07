-- Create broadcast_templates table
CREATE TABLE public.broadcast_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
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

-- Create broadcast_queue table
CREATE TABLE public.broadcast_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_log_id UUID NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT NOT NULL,
  media_type TEXT DEFAULT 'text',
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for broadcast_queue
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

CREATE POLICY "System can insert queue"
  ON public.broadcast_queue
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update queue"
  ON public.broadcast_queue
  FOR UPDATE
  USING (true);

-- Add missing columns to broadcast_logs
ALTER TABLE public.broadcast_logs
ADD COLUMN media_type TEXT DEFAULT 'text',
ADD COLUMN media_url TEXT,
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN delay_min INTEGER DEFAULT 1,
ADD COLUMN delay_max INTEGER DEFAULT 3,
ADD COLUMN use_personalization BOOLEAN DEFAULT false,
ADD COLUMN template_id UUID;