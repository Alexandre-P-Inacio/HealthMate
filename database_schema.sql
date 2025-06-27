-- HealthMate Database Schema for Supabase
-- Execute these commands in the Supabase SQL Editor

-- 1. Create balanca_digital_data table for body composition data
CREATE TABLE IF NOT EXISTS balanca_digital_data (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight DECIMAL(5,2),
  body_fat DECIMAL(5,2),
  bone_mass DECIMAL(5,3),
  bmr INTEGER,
  lean_body_mass DECIMAL(5,2),
  body_water_mass DECIMAL(5,2),
  source VARCHAR(50) DEFAULT 'Health Connect',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create wearables_data table for vitals/wearables data
CREATE TABLE IF NOT EXISTS wearables_data (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  heart_rate INTEGER,
  steps INTEGER,
  calories INTEGER,
  distance DECIMAL(8,2),
  blood_oxygen DECIMAL(5,2),
  body_temperature DECIMAL(4,2),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  sleep_duration DECIMAL(4,2),
  stress_level INTEGER,
  source VARCHAR(50) DEFAULT 'Health Connect',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_balanca_digital_user_date ON balanca_digital_data(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_balanca_digital_timestamp ON balanca_digital_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wearables_user_date ON wearables_data(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wearables_timestamp ON wearables_data(timestamp DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE balanca_digital_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearables_data ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (users can only access their own data)
CREATE POLICY "Users can view their own balanca_digital_data" 
  ON balanca_digital_data FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own balanca_digital_data" 
  ON balanca_digital_data FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own balanca_digital_data" 
  ON balanca_digital_data FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own balanca_digital_data" 
  ON balanca_digital_data FOR DELETE 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own wearables_data" 
  ON wearables_data FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own wearables_data" 
  ON wearables_data FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own wearables_data" 
  ON wearables_data FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own wearables_data" 
  ON wearables_data FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- 6. Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers to automatically update updated_at
CREATE TRIGGER update_balanca_digital_data_updated_at 
  BEFORE UPDATE ON balanca_digital_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wearables_data_updated_at 
  BEFORE UPDATE ON wearables_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant necessary permissions (if needed)
-- GRANT ALL ON balanca_digital_data TO authenticated;
-- GRANT ALL ON wearables_data TO authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'HealthMate database tables created successfully!' as message; 