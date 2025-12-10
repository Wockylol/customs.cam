-- Create payroll_settings table
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  base_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(team_member_id)
);

-- Create payroll_bonuses table
CREATE TABLE IF NOT EXISTS public.payroll_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES public.team_members(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_payroll_settings_team_member_id ON public.payroll_settings(team_member_id);
CREATE INDEX idx_payroll_bonuses_team_member_id ON public.payroll_bonuses(team_member_id);
CREATE INDEX idx_payroll_bonuses_bonus_date ON public.payroll_bonuses(bonus_date);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_bonuses ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all payroll settings
CREATE POLICY "Admins can view all payroll settings"
  ON public.payroll_settings
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Policy: Admins can insert payroll settings
CREATE POLICY "Admins can insert payroll settings"
  ON public.payroll_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Policy: Admins can update payroll settings
CREATE POLICY "Admins can update payroll settings"
  ON public.payroll_settings
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Policy: Admins can delete payroll settings
CREATE POLICY "Admins can delete payroll settings"
  ON public.payroll_settings
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Policy: Admins can view all bonuses
CREATE POLICY "Admins can view all bonuses"
  ON public.payroll_bonuses
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Policy: Admins can insert bonuses
CREATE POLICY "Admins can insert bonuses"
  ON public.payroll_bonuses
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Policy: Admins can update bonuses
CREATE POLICY "Admins can update bonuses"
  ON public.payroll_bonuses
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Policy: Admins can delete bonuses
CREATE POLICY "Admins can delete bonuses"
  ON public.payroll_bonuses
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.team_members 
      WHERE role = 'admin'
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_payroll_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payroll_settings_updated_at
  BEFORE UPDATE ON public.payroll_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_settings_updated_at();

CREATE OR REPLACE FUNCTION update_payroll_bonuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payroll_bonuses_updated_at
  BEFORE UPDATE ON public.payroll_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_bonuses_updated_at();

-- Add comments to tables
COMMENT ON TABLE public.payroll_settings IS 'Stores base salary and commission percentage settings for team members';
COMMENT ON COLUMN public.payroll_settings.base_salary IS 'Monthly base salary for the team member';
COMMENT ON COLUMN public.payroll_settings.commission_percentage IS 'Percentage of valid sales that count towards commission';

COMMENT ON TABLE public.payroll_bonuses IS 'Stores bonuses given to team members';
COMMENT ON COLUMN public.payroll_bonuses.amount IS 'Bonus amount in dollars';
COMMENT ON COLUMN public.payroll_bonuses.reason IS 'Reason for giving the bonus';
COMMENT ON COLUMN public.payroll_bonuses.bonus_date IS 'Date when the bonus was given';
COMMENT ON COLUMN public.payroll_bonuses.created_by IS 'Admin who created the bonus';

