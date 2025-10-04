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