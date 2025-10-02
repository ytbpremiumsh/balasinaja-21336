-- Create autoreplies table
CREATE TABLE IF NOT EXISTS public.autoreplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger TEXT UNIQUE NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  url_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_knowledge_base table
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create inbox table
CREATE TABLE IF NOT EXISTS public.inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  inbox_type TEXT,
  inbox_message TEXT,
  reply_type TEXT,
  reply_message TEXT,
  reply_image TEXT,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.autoreplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for webhook, will be restricted later if auth is added)
CREATE POLICY "Allow all operations on autoreplies" ON public.autoreplies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on ai_knowledge_base" ON public.ai_knowledge_base FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on inbox" ON public.inbox FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_autoreplies_trigger ON public.autoreplies(LOWER(trigger));
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_inbox_message_id ON public.inbox(message_id);
CREATE INDEX idx_inbox_created_at ON public.inbox(created_at DESC);