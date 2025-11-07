-- Add missing retry_count column to broadcast_queue
ALTER TABLE public.broadcast_queue
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;