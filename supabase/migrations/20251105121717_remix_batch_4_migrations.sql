
-- Migration: 20251103022533

-- Migration: 20251002124045
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

-- Migration: 20251003024256
-- Create settings table for app configuration
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since this will be protected by app auth)
CREATE POLICY "Allow all operations on settings" ON public.settings
FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('onesender_api_url', 'http://194.127.192.254:3002/api/v1/messages'),
  ('onesender_api_key', 'ur48TUk4NX9MrnFp.ibKg2rGiV5USD1QupLQQNZAaCgRrViup'),
  ('ai_provider', 'lovable'),
  ('ai_model', 'google/gemini-2.5-flash');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Migration: 20251004010624
-- Add user_id to all tables
ALTER TABLE public.inbox ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.autoreplies ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_knowledge_base ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for inbox
DROP POLICY IF EXISTS "Allow all operations on inbox" ON public.inbox;
CREATE POLICY "Users can view own inbox" ON public.inbox FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inbox" ON public.inbox FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inbox" ON public.inbox FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inbox" ON public.inbox FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Webhook can insert inbox" ON public.inbox FOR INSERT WITH CHECK (true);
CREATE POLICY "Webhook can update inbox" ON public.inbox FOR UPDATE USING (true);

-- Update RLS policies for contacts
DROP POLICY IF EXISTS "Allow all operations on contacts" ON public.contacts;
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Webhook can insert contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Webhook can update contacts" ON public.contacts FOR UPDATE USING (true);

-- Update RLS policies for autoreplies
DROP POLICY IF EXISTS "Allow all operations on autoreplies" ON public.autoreplies;
CREATE POLICY "Users can view own autoreplies" ON public.autoreplies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own autoreplies" ON public.autoreplies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own autoreplies" ON public.autoreplies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own autoreplies" ON public.autoreplies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Webhook can read autoreplies" ON public.autoreplies FOR SELECT USING (true);

-- Update RLS policies for ai_knowledge_base
DROP POLICY IF EXISTS "Allow all operations on ai_knowledge_base" ON public.ai_knowledge_base;
CREATE POLICY "Users can view own knowledge" ON public.ai_knowledge_base FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge" ON public.ai_knowledge_base FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge" ON public.ai_knowledge_base FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge" ON public.ai_knowledge_base FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Webhook can read knowledge" ON public.ai_knowledge_base FOR SELECT USING (true);

-- Update RLS policies for settings
DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;
CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON public.settings FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Webhook can read settings" ON public.settings FOR SELECT USING (true);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  
  -- Insert default settings for new user
  INSERT INTO public.settings (user_id, key, value)
  VALUES 
    (new.id, 'onesender_api_url', ''),
    (new.id, 'onesender_api_key', ''),
    (new.id, 'ai_model', 'google/gemini-2.5-flash'),
    (new.id, 'system_prompt', 'Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional.');
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20251005040336
-- First, drop the unique constraint on key if it exists
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_key_key;

-- The correct unique constraint should be on (user_id, key) combination
ALTER TABLE public.settings ADD CONSTRAINT settings_user_id_key_unique UNIQUE (user_id, key);

-- Add default settings for existing users who don't have them
INSERT INTO public.settings (user_id, key, value)
SELECT 
  u.id,
  s.key,
  s.value
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('ai_vendor', 'lovable'),
    ('ai_api_key', ''),
    ('system_prompt', 'Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional.')
) AS s(key, value)
WHERE NOT EXISTS (
  SELECT 1 FROM public.settings 
  WHERE settings.user_id = u.id 
  AND settings.key = s.key
);

-- Update handle_new_user function to include new settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  
  -- Insert default settings for new user
  INSERT INTO public.settings (user_id, key, value)
  VALUES 
    (new.id, 'onesender_api_url', ''),
    (new.id, 'onesender_api_key', ''),
    (new.id, 'ai_vendor', 'lovable'),
    (new.id, 'ai_api_key', ''),
    (new.id, 'ai_model', 'google/gemini-2.5-flash'),
    (new.id, 'system_prompt', 'Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional.');
  
  RETURN new;
END;
$function$;

-- Migration: 20251005040527
-- Delete old settings that have null user_id (legacy data)
DELETE FROM public.settings WHERE user_id IS NULL;

-- Add default settings for existing users who don't have them
INSERT INTO public.settings (user_id, key, value)
SELECT 
  u.id,
  s.key,
  s.value
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('onesender_api_url', ''),
    ('onesender_api_key', ''),
    ('ai_vendor', 'lovable'),
    ('ai_api_key', ''),
    ('ai_model', 'google/gemini-2.5-flash'),
    ('system_prompt', 'Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional.')
) AS s(key, value)
WHERE NOT EXISTS (
  SELECT 1 FROM public.settings 
  WHERE settings.user_id = u.id 
  AND settings.key = s.key
);

-- Update handle_new_user function to include new settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  
  -- Insert default settings for new user
  INSERT INTO public.settings (user_id, key, value)
  VALUES 
    (new.id, 'onesender_api_url', ''),
    (new.id, 'onesender_api_key', ''),
    (new.id, 'ai_vendor', 'lovable'),
    (new.id, 'ai_api_key', ''),
    (new.id, 'ai_model', 'google/gemini-2.5-flash'),
    (new.id, 'system_prompt', 'Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional.');
  
  RETURN new;
END;
$function$;

-- Migration: 20251007122531
-- Drop dangerous public read policies that expose sensitive data
-- These policies allowed anyone to read API keys, autoreplies, and AI knowledge
-- The webhook edge function uses service role and bypasses RLS, so it will continue to work

DROP POLICY IF EXISTS "Webhook can read settings" ON public.settings;
DROP POLICY IF EXISTS "Webhook can read autoreplies" ON public.autoreplies;
DROP POLICY IF EXISTS "Webhook can read knowledge" ON public.ai_knowledge_base;

-- Migration: 20251007123213
-- Drop dangerous webhook policies on contacts table that expose customer phone numbers
-- These policies allow anyone to insert/update contacts without authentication
-- The webhook edge function uses service role key and bypasses RLS, so it will continue to work

DROP POLICY IF EXISTS "Webhook can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Webhook can update contacts" ON public.contacts;

-- Now only authenticated users can access their own contacts via the remaining policies:
-- "Users can view own contacts" - SELECT with auth.uid() = user_id
-- "Users can insert own contacts" - INSERT with auth.uid() = user_id  
-- "Users can update own contacts" - UPDATE with auth.uid() = user_id
-- "Users can delete own contacts" - DELETE with auth.uid() = user_id;

-- Migration: 20251008043110
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'support');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create packages table
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price DECIMAL(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- RLS policies for packages
CREATE POLICY "Anyone can view active packages"
ON public.packages
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage packages"
ON public.packages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Admins can view all logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expire_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Update handle_new_user function to assign default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, expire_at, status, plan)
  VALUES (
    new.id, 
    new.email,
    now() + INTERVAL '2 days',
    'trial',
    'trial'
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  -- Insert default settings for new user
  INSERT INTO public.settings (user_id, key, value)
  VALUES 
    (new.id, 'onesender_api_url', ''),
    (new.id, 'onesender_api_key', ''),
    (new.id, 'ai_vendor', 'lovable'),
    (new.id, 'ai_api_key', ''),
    (new.id, 'ai_model', 'google/gemini-2.5-flash'),
    (new.id, 'system_prompt', 'Anda adalah asisten AI yang membantu menjawab pertanyaan pelanggan dengan ramah dan profesional.');
  
  RETURN new;
END;
$$;

-- Insert default packages
INSERT INTO public.packages (name, duration_days, price, description) VALUES
  ('Trial', 2, 0, 'Paket trial gratis 2 hari'),
  ('Bulanan', 30, 50000, 'Paket berlangganan bulanan'),
  ('Tahunan', 365, 500000, 'Paket berlangganan tahunan dengan diskon');

-- Migration: 20251102095404
-- Add RLS policy for admins to view and manage all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migration: 20251103020531
-- Create payment settings table for admin to configure bank account and e-wallet
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  bank_name text,
  account_number text,
  account_holder text,
  qris_code text,
  qris_image_url text
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view payment settings (needed for checkout)
CREATE POLICY "Anyone can view payment settings"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage payment settings
CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default payment settings
INSERT INTO public.payment_settings (bank_name, account_number, account_holder)
VALUES ('BCA', '1234567890', 'PT. BalasinAja');

-- Create payment proofs table
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  proof_image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamp with time zone,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment proofs
CREATE POLICY "Users can view own payment proofs"
ON public.payment_proofs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own payment proofs
CREATE POLICY "Users can insert own payment proofs"
ON public.payment_proofs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all payment proofs
CREATE POLICY "Admins can view all payment proofs"
ON public.payment_proofs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update payment proofs (for verification)
CREATE POLICY "Admins can update payment proofs"
ON public.payment_proofs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_settings_updated_at();

-- Migration: 20251103021204
-- Fix search path for update function
DROP TRIGGER IF EXISTS update_payment_settings_updated_at ON public.payment_settings;
DROP FUNCTION IF EXISTS public.update_payment_settings_updated_at();

CREATE OR REPLACE FUNCTION public.update_payment_settings_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_settings_updated_at();


-- Migration: 20251104014233
-- Light, non-destructive comments to trigger types refresh
COMMENT ON TABLE public.profiles IS 'User profiles with subscription and status fields';
COMMENT ON TABLE public.user_roles IS 'User to role mapping using app_role enum';
COMMENT ON TABLE public.settings IS 'Per-user key/value settings';
COMMENT ON TABLE public.ai_knowledge_base IS 'Per-user AI knowledge base entries';
COMMENT ON TABLE public.autoreplies IS 'Per-user autoresponder rules';
COMMENT ON TABLE public.contacts IS 'Per-user contacts';
COMMENT ON TABLE public.inbox IS 'Per-user inbox messages';
COMMENT ON TABLE public.packages IS 'Subscription packages';
COMMENT ON TABLE public.payment_proofs IS 'Payment proof submissions';
COMMENT ON TABLE public.payment_settings IS 'Payment receiving settings';
COMMENT ON TABLE public.activity_logs IS 'Admin activity logs';
COMMENT ON TYPE public.app_role IS 'Application roles: admin, moderator, user';

-- Migration: 20251104015947
-- Add unique constraint for contacts table to support upsert
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_phone_user_id_key UNIQUE (phone, user_id);

-- Migration: 20251104020639
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
