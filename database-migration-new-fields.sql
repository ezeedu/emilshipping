-- Database Migration: Add New Package Fields
-- Run this in your Supabase SQL Editor to add the new fields for enhanced package creation

-- Add new sender fields
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS sender_address TEXT,
ADD COLUMN IF NOT EXISTS sender_phone TEXT;

-- Add new receiver fields  
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS receiver_address TEXT,
ADD COLUMN IF NOT EXISTS receiver_phone TEXT;

-- Add new package fields
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS package_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_charges DECIMAL(10,2) DEFAULT 0.00;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_packages_sender_phone ON packages(sender_phone);
CREATE INDEX IF NOT EXISTS idx_packages_receiver_phone ON packages(receiver_phone);

-- Update existing sample data to include new fields (optional)
UPDATE packages 
SET 
    sender_address = CASE tracking_id
        WHEN 'ESP-1234567890' THEN 'Unit 5, 5 Kingsbury rd, Birmingham B249ps, UK'
        WHEN 'ESP-2345678901' THEN '123 Main Street, Entebbe, Uganda'
        WHEN 'ESP-3456789012' THEN '456 Oak Avenue, Entebbe, Uganda'
        ELSE 'Address not provided'
    END,
    sender_phone = CASE tracking_id
        WHEN 'ESP-1234567890' THEN '+447435367702'
        WHEN 'ESP-2345678901' THEN '+256701234567'
        WHEN 'ESP-3456789012' THEN '+256709876543'
        ELSE 'Phone not provided'
    END,
    receiver_address = CASE tracking_id
        WHEN 'ESP-1234567890' THEN 'Plot no.: 107 ASR nagar postahrada vizianagaram Andhra Pradesh 535002'
        WHEN 'ESP-2345678901' THEN '789 Business District, Jinja, Uganda'
        WHEN 'ESP-3456789012' THEN '321 Shopping Center, Mbarara, Uganda'
        ELSE 'Address not provided'
    END,
    receiver_phone = CASE tracking_id
        WHEN 'ESP-1234567890' THEN '+91 94947 92887'
        WHEN 'ESP-2345678901' THEN '+256702345678'
        WHEN 'ESP-3456789012' THEN '+256708765432'
        ELSE 'Phone not provided'
    END,
    package_quantity = CASE tracking_id
        WHEN 'ESP-1234567890' THEN 1
        WHEN 'ESP-2345678901' THEN 1
        WHEN 'ESP-3456789012' THEN 2
        ELSE 1
    END,
    total_charges = CASE tracking_id
        WHEN 'ESP-1234567890' THEN 39500.00
        WHEN 'ESP-2345678901' THEN 15000.00
        WHEN 'ESP-3456789012' THEN 25000.00
        ELSE 0.00
    END
WHERE tracking_id IN ('ESP-1234567890', 'ESP-2345678901', 'ESP-3456789012');

-- Verify the migration
SELECT 
    tracking_id,
    sender_name,
    sender_address,
    sender_phone,
    receiver_name, 
    receiver_address,
    receiver_phone,
    package_quantity,
    total_charges
FROM packages 
ORDER BY created_at DESC;