-- HealthMate: Custom Appointments Database Schema Update
-- Run this in your Supabase SQL Editor to enable custom appointments

-- Add custom appointment fields to existing appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS custom_doctor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS custom_doctor_specialty VARCHAR(255),
ADD COLUMN IF NOT EXISTS custom_doctor_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_custom_appointment BOOLEAN DEFAULT FALSE;

-- Create index for better performance on custom appointments
CREATE INDEX IF NOT EXISTS idx_appointments_custom ON appointments(is_custom_appointment) WHERE is_custom_appointment = TRUE;

-- Update existing appointments to have the is_custom_appointment flag set properly
UPDATE appointments 
SET is_custom_appointment = FALSE 
WHERE is_custom_appointment IS NULL;

-- Success message
SELECT 'Custom appointment database schema updated successfully! 🎉' as message; 