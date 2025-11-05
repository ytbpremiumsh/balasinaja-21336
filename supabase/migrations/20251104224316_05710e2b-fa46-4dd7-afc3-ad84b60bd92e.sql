-- Drop the old unique constraint that only checks trigger
ALTER TABLE public.autoreplies DROP CONSTRAINT IF EXISTS autoreplies_trigger_key;

-- Add new unique constraint on combination of trigger and user_id
-- This allows same trigger for different users, but prevents duplicates for same user
ALTER TABLE public.autoreplies ADD CONSTRAINT autoreplies_trigger_user_id_key UNIQUE (trigger, user_id);