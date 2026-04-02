-- Add UPI ID and QR Code columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS upi_id TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Update RLS policies if needed (already broad in current schema)
-- Current schema has:
-- CREATE POLICY "Anyone can update users" ON public.users FOR UPDATE USING (true);
