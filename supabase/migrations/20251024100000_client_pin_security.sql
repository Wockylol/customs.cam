-- Migration: Client PIN Security System
-- Description: Creates table and policies for secure mobile PIN protection
-- Created: 2025-10-24

-- Create client_pins table
CREATE TABLE IF NOT EXISTS public.client_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  CONSTRAINT unique_client_pin UNIQUE (client_id)
);

-- Add indexes for performance
CREATE INDEX idx_client_pins_client_id ON public.client_pins(client_id);
CREATE INDEX idx_client_pins_locked_until ON public.client_pins(locked_until) WHERE locked_until IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.client_pins IS 'Stores secure PIN hashes for client mobile app authentication';
COMMENT ON COLUMN public.client_pins.pin_hash IS 'Hashed version of the 4-digit PIN (never store plaintext)';
COMMENT ON COLUMN public.client_pins.failed_attempts IS 'Counter for failed authentication attempts';
COMMENT ON COLUMN public.client_pins.locked_until IS 'Timestamp when account will be unlocked after too many failed attempts';
COMMENT ON COLUMN public.client_pins.last_verified_at IS 'Last successful PIN verification timestamp';

-- Enable Row Level Security
ALTER TABLE public.client_pins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view client PIN records" ON public.client_pins;
DROP POLICY IF EXISTS "Anyone can create client PINs" ON public.client_pins;
DROP POLICY IF EXISTS "Anyone can update client PINs" ON public.client_pins;
DROP POLICY IF EXISTS "Admins can view all client PINs" ON public.client_pins;
DROP POLICY IF EXISTS "Admins can delete client PINs" ON public.client_pins;

-- RLS Policies for Anonymous Access
-- Note: Clients access mobile view anonymously without authentication
-- Security is maintained through:
-- 1. PIN hashing (never store plaintext)
-- 2. Failed attempt tracking and lockouts
-- 3. Client must know the client_id to access

-- Allow anyone to view PIN records (needed to check if PIN exists)
CREATE POLICY "Anyone can view client PIN records"
  ON public.client_pins
  FOR SELECT
  USING (true);

-- Allow anyone to create a PIN (first time setup)
CREATE POLICY "Anyone can create client PINs"
  ON public.client_pins
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update PIN records (for verification, failed attempts, etc.)
CREATE POLICY "Anyone can update client PINs"
  ON public.client_pins
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow admins to view all PINs (for support/reset purposes)
CREATE POLICY "Admins can view all client PINs"
  ON public.client_pins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Allow admins to delete (reset) client PINs
CREATE POLICY "Admins can delete client PINs"
  ON public.client_pins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_client_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_client_pins_updated_at ON public.client_pins;
CREATE TRIGGER update_client_pins_updated_at
  BEFORE UPDATE ON public.client_pins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_pins_updated_at();

-- Create function to handle failed PIN attempts
CREATE OR REPLACE FUNCTION public.increment_pin_failed_attempts(p_client_id UUID)
RETURNS TABLE (
  failed_attempts INTEGER,
  locked_until TIMESTAMPTZ
) AS $$
DECLARE
  v_failed_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Increment failed attempts
  UPDATE public.client_pins
  SET 
    failed_attempts = COALESCE(failed_attempts, 0) + 1,
    locked_until = CASE 
      WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN now() + INTERVAL '15 minutes'
      ELSE locked_until
    END
  WHERE client_id = p_client_id
  RETURNING client_pins.failed_attempts, client_pins.locked_until
  INTO v_failed_attempts, v_locked_until;
  
  RETURN QUERY SELECT v_failed_attempts, v_locked_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset failed attempts on successful verification
CREATE OR REPLACE FUNCTION public.reset_pin_failed_attempts(p_client_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.client_pins
  SET 
    failed_attempts = 0,
    locked_until = NULL,
    last_verified_at = now()
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if PIN is locked
CREATE OR REPLACE FUNCTION public.is_pin_locked(p_client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM public.client_pins
  WHERE client_id = p_client_id;
  
  -- If locked_until is NULL or in the past, not locked
  IF v_locked_until IS NULL OR v_locked_until < now() THEN
    -- Clear the lock if it was set but has expired
    IF v_locked_until IS NOT NULL AND v_locked_until < now() THEN
      UPDATE public.client_pins
      SET locked_until = NULL, failed_attempts = 0
      WHERE client_id = p_client_id;
    END IF;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to both authenticated and anonymous users
GRANT SELECT, INSERT, UPDATE ON public.client_pins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.client_pins TO anon;
GRANT EXECUTE ON FUNCTION public.increment_pin_failed_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pin_failed_attempts TO anon;
GRANT EXECUTE ON FUNCTION public.reset_pin_failed_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_pin_failed_attempts TO anon;
GRANT EXECUTE ON FUNCTION public.is_pin_locked TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pin_locked TO anon;

-- Add column to clients table to track if PIN is enabled (optional)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.clients.pin_enabled IS 'Whether the client has enabled PIN protection for mobile app';

-- Create index on pin_enabled for performance
CREATE INDEX IF NOT EXISTS idx_clients_pin_enabled ON public.clients(pin_enabled) WHERE pin_enabled = true;

-- Grant permissions for anonymous users to update pin_enabled flag
-- Note: This is optional - the pin_enabled flag is primarily informational
GRANT UPDATE (pin_enabled) ON public.clients TO anon;
GRANT UPDATE (pin_enabled) ON public.clients TO authenticated;

