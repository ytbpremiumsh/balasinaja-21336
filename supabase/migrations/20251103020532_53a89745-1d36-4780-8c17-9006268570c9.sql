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