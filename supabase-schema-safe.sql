-- Emil Shipping Database Schema (Safe Version)
-- This version handles existing policies gracefully
-- Run this in your Supabase SQL Editor

-- Create packages table (as per requirements)
CREATE TABLE IF NOT EXISTS packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_id TEXT UNIQUE NOT NULL,
    sender_email TEXT NOT NULL,
    receiver_email TEXT NOT NULL,
    sender_name TEXT,
    receiver_name TEXT,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    package_description TEXT,
    weight DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipping timeline updates (as per requirements)
CREATE TABLE IF NOT EXISTS shipping_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packages_tracking_id ON packages(tracking_id);
CREATE INDEX IF NOT EXISTS idx_packages_receiver_email ON packages(receiver_email);
CREATE INDEX IF NOT EXISTS idx_packages_created_at ON packages(created_at);
CREATE INDEX IF NOT EXISTS idx_shipping_updates_package_id ON shipping_updates(package_id);
CREATE INDEX IF NOT EXISTS idx_shipping_updates_timestamp ON shipping_updates(timestamp);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- Insert sample package data for testing with ESP-XXXXXXXXXX format
INSERT INTO packages (tracking_id, sender_email, receiver_email, sender_name, receiver_name, origin, destination, package_description, weight, status) VALUES
(
    'ESP-1234567890',
    'john@example.com',
    'customer1@example.com',
    'John Doe',
    'Sarah Johnson',
    'Entebbe, Uganda',
    'Kampala, Uganda',
    'Electronics - Laptop',
    2.5,
    'delivered'
),
(
    'ESP-2345678901',
    'jane@example.com',
    'customer2@example.com',
    'Jane Smith',
    'Mike Wilson',
    'Entebbe, Uganda',
    'Jinja, Uganda',
    'Documents - Legal Papers',
    0.5,
    'in_transit'
),
(
    'ESP-3456789012',
    'bob@example.com',
    'customer3@example.com',
    'Bob Johnson',
    'Lisa Brown',
    'Entebbe, Uganda',
    'Mbarara, Uganda',
    'Clothing - Fashion Items',
    1.2,
    'pending'
) ON CONFLICT (tracking_id) DO NOTHING;

-- Insert sample shipping updates
INSERT INTO shipping_updates (package_id, status, location, description, timestamp) VALUES
-- Updates for ESP-1234567890 (delivered package)
((SELECT id FROM packages WHERE tracking_id = 'ESP-1234567890'), 'Package Created', 'Emil Shipping Warehouse, Entebbe', 'Package received and processed', '2024-01-15T10:00:00Z'),
((SELECT id FROM packages WHERE tracking_id = 'ESP-1234567890'), 'In Transit', 'Entebbe International Airport', 'Package departed from warehouse', '2024-01-15T14:30:00Z'),
((SELECT id FROM packages WHERE tracking_id = 'ESP-1234567890'), 'Arrived at Hub', 'Kampala Distribution Center', 'Package arrived at distribution center', '2024-01-16T09:15:00Z'),
((SELECT id FROM packages WHERE tracking_id = 'ESP-1234567890'), 'Out for Delivery', 'Kampala Local Delivery', 'Package is out for delivery', '2024-01-18T08:00:00Z'),
((SELECT id FROM packages WHERE tracking_id = 'ESP-1234567890'), 'Delivered', 'Customer Address, Kampala', 'Package delivered successfully', '2024-01-18T16:30:00Z'),

-- Updates for ESP-2345678901 (in transit package)
((SELECT id FROM packages WHERE tracking_id = 'ESP-2345678901'), 'Package Created', 'Emil Shipping Warehouse, Entebbe', 'Package received and processed', '2024-01-16T11:00:00Z'),
((SELECT id FROM packages WHERE tracking_id = 'ESP-2345678901'), 'In Transit', 'Entebbe International Airport', 'Package in transit to destination', '2024-01-16T16:30:00Z'),

-- Updates for ESP-3456789012 (pending package)
((SELECT id FROM packages WHERE tracking_id = 'ESP-3456789012'), 'Package Created', 'Emil Shipping Warehouse, Entebbe', 'Package awaiting processing', '2024-01-17T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to packages" ON packages;
DROP POLICY IF EXISTS "Allow service role full access to packages" ON packages;
DROP POLICY IF EXISTS "Allow public read access to shipping_updates" ON shipping_updates;
DROP POLICY IF EXISTS "Allow service role full access to shipping_updates" ON shipping_updates;
DROP POLICY IF EXISTS "Allow public insert to contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Allow service role full access to contact_messages" ON contact_messages;

-- Create policies for packages table
CREATE POLICY "Allow public read access to packages" ON packages
    FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to packages" ON packages
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for shipping_updates table
CREATE POLICY "Allow public read access to shipping_updates" ON shipping_updates
    FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to shipping_updates" ON shipping_updates
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for contact_messages table
CREATE POLICY "Allow public insert to contact_messages" ON contact_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role full access to contact_messages" ON contact_messages
    FOR ALL USING (auth.role() = 'service_role');

-- Create or replace the function (handles existing functions)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS set_updated_at ON packages;
DROP TRIGGER IF EXISTS update_contact_messages_updated_at ON contact_messages;

-- Create triggers to automatically update updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();