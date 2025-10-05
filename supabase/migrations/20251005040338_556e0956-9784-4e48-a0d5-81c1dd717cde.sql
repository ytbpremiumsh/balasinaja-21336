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