# Database Schema Updates

The following schema changes have been made and need to be applied to the Neon database:

## New Fields Added to `orders` Table

```sql
-- Add address field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;

-- Add order_date field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMP;
```

## Order of Fields in Schema

The updated orders table schema now includes:
- id (serial, primary key)
- order_id (text, unique, not null)
- order_from (enum, not null)
- customer_name (text, not null)
- customer_id (text, not null)
- **address (text)** ← NEW
- total_price (numeric)
- status (text, default 'pending')
- payment_status (text, default 'unpaid')
- paid_amount (numeric, default 0)
- confirmation_status (text, default 'unconfirmed')
- customer_notes (text)
- priority (integer, default 0)
- **order_date (timestamp)** ← NEW
- expected_delivery_date (timestamp)
- created_at (timestamp, default now())

## Notes

- Both new fields are optional (nullable)
- `address` stores customer delivery/shipping address
- `order_date` allows backdating orders when adding historical data
- If `order_date` is not provided, `created_at` serves as the order date
