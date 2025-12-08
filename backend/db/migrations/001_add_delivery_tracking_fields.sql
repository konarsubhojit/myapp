-- Migration: Add delivery tracking fields to orders table
-- Date: 2025-12-08
-- Description: Adds deliveryStatus, trackingId, deliveryPartner, and actualDeliveryDate columns

-- Add delivery tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'not_shipped',
ADD COLUMN IF NOT EXISTS tracking_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_partner TEXT,
ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP;

-- Add comment to explain the columns
COMMENT ON COLUMN orders.delivery_status IS 'Status of the delivery: not_shipped, shipped, in_transit, out_for_delivery, delivered, returned';
COMMENT ON COLUMN orders.tracking_id IS 'Tracking ID or AWB number from delivery partner (e.g., Delhivery, DTDC, Blue Dart)';
COMMENT ON COLUMN orders.delivery_partner IS 'Name of the delivery partner (e.g., Delhivery, DTDC, Blue Dart, etc.)';
COMMENT ON COLUMN orders.actual_delivery_date IS 'The actual date when the order was delivered';
