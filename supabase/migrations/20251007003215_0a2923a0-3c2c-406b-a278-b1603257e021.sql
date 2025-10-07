-- Drop dangerous webhook policies on contacts table that expose customer phone numbers
-- These policies allow anyone to insert/update contacts without authentication
-- The webhook edge function uses service role key and bypasses RLS, so it will continue to work

DROP POLICY IF EXISTS "Webhook can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Webhook can update contacts" ON public.contacts;

-- Now only authenticated users can access their own contacts via the remaining policies:
-- "Users can view own contacts" - SELECT with auth.uid() = user_id
-- "Users can insert own contacts" - INSERT with auth.uid() = user_id  
-- "Users can update own contacts" - UPDATE with auth.uid() = user_id
-- "Users can delete own contacts" - DELETE with auth.uid() = user_id