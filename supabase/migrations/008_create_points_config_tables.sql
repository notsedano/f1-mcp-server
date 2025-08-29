-- Migration: Create point modifiable action configuration tables
-- This creates tables to store configurable point values for different actions

-- Create point_modifiable_action_configurations table to store the current point values
CREATE TABLE IF NOT EXISTS public.point_modifiable_action_configurations (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which action this configuration applies to
  action_key point_modifiable_action NOT NULL,
  
  -- Current point value for this action (positive for bonuses, negative for penalties)
  current_value DECIMAL(18,8) NOT NULL,
  
  -- Whether this modifier is currently active
  is_enabled BOOLEAN DEFAULT true,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one active configuration per action
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_config_unique_active 
ON public.point_modifiable_action_configurations(action_key) 
WHERE is_enabled = true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_point_config_action_key 
ON public.point_modifiable_action_configurations(action_key);

-- Enable Row Level Security
ALTER TABLE public.point_modifiable_action_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view configurations
CREATE POLICY "Everyone can view point configurations"
  ON public.point_modifiable_action_configurations
  FOR SELECT
  USING (true);

-- RLS Policy: Only service role can modify configurations
CREATE POLICY "Only service role can modify point configurations"
  ON public.point_modifiable_action_configurations
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE public.point_modifiable_action_configurations IS 'Configurable point values for different user actions';
COMMENT ON COLUMN public.point_modifiable_action_configurations.id IS 'Unique identifier for the configuration';
COMMENT ON COLUMN public.point_modifiable_action_configurations.action_key IS 'Which action this configuration applies to';
COMMENT ON COLUMN public.point_modifiable_action_configurations.current_value IS 'Current point value for this action (positive for bonuses, negative for penalties)';
COMMENT ON COLUMN public.point_modifiable_action_configurations.is_enabled IS 'Whether this modifier is currently active';
COMMENT ON COLUMN public.point_modifiable_action_configurations.created_at IS 'When the configuration was created';
COMMENT ON COLUMN public.point_modifiable_action_configurations.updated_at IS 'When the configuration was last updated';

-- Insert initial configuration values
INSERT INTO public.point_modifiable_action_configurations (action_key, current_value) VALUES
  ('CREATED_NEW_ACCOUNT', 500),
  ('REFERRED_NEW_USER', 100), 
  ('MATCHED_STRAIGHT_BET', 15),
  ('WON_STRAIGHT_BET', 50),
  ('LOGGED_IN_FOR_THE_FIRST_TIME_TODAY', 5);

-- Create a view for easy access to active configurations
CREATE OR REPLACE VIEW public.active_point_configurations AS
SELECT action_key, current_value
FROM public.point_modifiable_action_configurations
WHERE is_enabled = true;

-- Create a function to get the point value for a specific action
CREATE OR REPLACE FUNCTION public.get_point_value_for_action(action point_modifiable_action)
RETURNS DECIMAL(18,8) AS $$
DECLARE
  point_value DECIMAL(18,8);
BEGIN
  SELECT current_value INTO point_value
  FROM public.point_modifiable_action_configurations
  WHERE action_key = action AND is_enabled = true;
  
  IF point_value IS NULL THEN
    RAISE EXCEPTION 'No active configuration found for action: %', action;
  END IF;
  
  RETURN point_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.point_modifiable_action_configurations TO authenticated;
GRANT SELECT ON public.active_point_configurations TO authenticated; 