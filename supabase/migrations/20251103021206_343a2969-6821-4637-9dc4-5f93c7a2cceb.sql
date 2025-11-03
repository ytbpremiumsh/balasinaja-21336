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