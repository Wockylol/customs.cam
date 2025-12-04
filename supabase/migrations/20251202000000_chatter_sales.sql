-- Create sale status enum
CREATE TYPE sale_status AS ENUM ('pending', 'valid', 'invalid');

-- Create chatter_sales table
CREATE TABLE IF NOT EXISTS public.chatter_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chatter_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_amount DECIMAL(10, 2) NOT NULL,
  screenshot_url TEXT,
  notes TEXT,
  status sale_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.team_members(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_chatter_sales_chatter_id ON public.chatter_sales(chatter_id);
CREATE INDEX idx_chatter_sales_client_id ON public.chatter_sales(client_id);
CREATE INDEX idx_chatter_sales_sale_date ON public.chatter_sales(sale_date);
CREATE INDEX idx_chatter_sales_status ON public.chatter_sales(status);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.chatter_sales ENABLE ROW LEVEL SECURITY;

-- Policy: Chatters can view their own sales
CREATE POLICY "Chatters can view their own sales"
  ON public.chatter_sales
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE id = chatter_sales.chatter_id
    )
  );

-- Policy: Chatters can insert their own sales
CREATE POLICY "Chatters can insert their own sales"
  ON public.chatter_sales
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE id = chatter_sales.chatter_id
    )
  );

-- Policy: Chatters can update their own sales (but not status)
CREATE POLICY "Chatters can update their own sales"
  ON public.chatter_sales
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE id = chatter_sales.chatter_id
    )
  );

-- Policy: Managers and admins can update any sale status
CREATE POLICY "Managers and admins can update sale status"
  ON public.chatter_sales
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role IN ('manager', 'admin')
    )
  );

-- Policy: Chatters can delete their own sales
CREATE POLICY "Chatters can delete their own sales"
  ON public.chatter_sales
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE id = chatter_sales.chatter_id
    )
  );

-- Policy: Managers and admins can view all sales
CREATE POLICY "Managers and admins can view all sales"
  ON public.chatter_sales
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role IN ('manager', 'admin')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_chatter_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_chatter_sales_updated_at
  BEFORE UPDATE ON public.chatter_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_chatter_sales_updated_at();

-- Add comment to table
COMMENT ON TABLE public.chatter_sales IS 'Tracks sales made by chatters for clients';
COMMENT ON COLUMN public.chatter_sales.status IS 'Status of the sale: pending (default), valid (approved), or invalid (rejected)';
COMMENT ON COLUMN public.chatter_sales.approved_by IS 'Team member who approved or rejected the sale';
COMMENT ON COLUMN public.chatter_sales.approved_at IS 'Timestamp when the sale was approved or rejected';

