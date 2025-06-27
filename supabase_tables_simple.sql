-- SIMPLIFIED VERSION - Copy and paste this into Supabase SQL Editor

-- Create balanca_digital_data table
CREATE TABLE balanca_digital_data (
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

-- Create wearables_data table
CREATE TABLE wearables_data (
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

-- Create indexes
CREATE INDEX idx_balanca_digital_user_date ON balanca_digital_data(user_id, date DESC);
CREATE INDEX idx_wearables_user_date ON wearables_data(user_id, date DESC);

-- Enable RLS
ALTER TABLE balanca_digital_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearables_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "balanca_digital_policy" ON balanca_digital_data FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "wearables_policy" ON wearables_data FOR ALL USING (auth.uid()::text = user_id::text); 