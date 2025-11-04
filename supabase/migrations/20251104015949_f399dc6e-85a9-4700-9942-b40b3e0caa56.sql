-- Add unique constraint for contacts table to support upsert
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_phone_user_id_key UNIQUE (phone, user_id);