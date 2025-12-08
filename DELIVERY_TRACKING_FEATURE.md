# Delivery Tracking Feature

## Overview

The Order Management System now includes comprehensive delivery tracking functionality that allows you to track the delivery status of orders, add tracking IDs (AWB numbers), specify delivery partners, and record actual delivery dates.

## Features

### 1. Delivery Status Tracking

Orders can now have one of the following delivery statuses:

- **Not Shipped** (default): Order has not been shipped yet
- **Shipped**: Order has been handed over to delivery partner
- **In Transit**: Order is on the way to the customer
- **Out for Delivery**: Order is out for final delivery
- **Delivered**: Order has been successfully delivered
- **Returned**: Order was returned

### 2. Tracking Information

For each order, you can now store:

- **Tracking ID / AWB Number**: The tracking or airway bill number from the delivery partner
- **Delivery Partner**: Name of the delivery partner (e.g., Delhivery, DTDC, Blue Dart, FedEx, DHL, etc.)
- **Actual Delivery Date**: The actual date when the order was delivered

### 3. Flexible Delivery Partner Support

The system supports tracking IDs from any delivery partner without using restrictive enums. This allows you to work with:

- Delhivery
- DTDC
- Blue Dart
- FedEx
- DHL
- Any other delivery partner you work with

## User Interface Changes

### Order History View

The Order History table now includes a **Delivery** column that shows the current delivery status with color-coded chips:

- Green for "Delivered"
- Blue for "In Transit" and "Out for Delivery"
- Primary color for "Shipped"
- Red for "Returned"
- Default for "Not Shipped"

### Order Details Dialog

When viewing or editing an order, you'll see a new **Delivery Tracking** section that displays:

**View Mode:**
- Delivery Status (with color-coded chip)
- Tracking ID (if available, displayed in monospace font)
- Delivery Partner (if available)
- Actual Delivery Date (if available)

**Edit Mode:**
- Dropdown to select Delivery Status
- Text field for Tracking ID / AWB Number
- Text field for Delivery Partner name
- Date picker for Actual Delivery Date

## API Changes

### Create Order (POST /api/orders)

New optional fields:
```json
{
  "deliveryStatus": "not_shipped",
  "trackingId": "AWB123456789",
  "deliveryPartner": "Delhivery",
  "actualDeliveryDate": null
}
```

### Update Order (PUT /api/orders/:id)

You can now update delivery tracking information:
```json
{
  "deliveryStatus": "delivered",
  "trackingId": "AWB123456789",
  "deliveryPartner": "Delhivery",
  "actualDeliveryDate": "2024-12-08"
}
```

### Response Format

Order responses now include:
```json
{
  "_id": 1,
  "orderId": "ORD123456",
  "deliveryStatus": "shipped",
  "trackingId": "AWB123456789",
  "deliveryPartner": "Delhivery",
  "actualDeliveryDate": null,
  ...
}
```

## Database Schema Changes

New columns added to the `orders` table:

| Column | Type | Description | Default |
|--------|------|-------------|---------|
| `delivery_status` | TEXT | Current delivery status | 'not_shipped' |
| `tracking_id` | TEXT | Tracking/AWB number | NULL |
| `delivery_partner` | TEXT | Name of delivery partner | NULL |
| `actual_delivery_date` | TIMESTAMP | Actual delivery date | NULL |

## Migration

If you have an existing database, you need to run the migration script:

```bash
# Connect to your Neon PostgreSQL database
psql "YOUR_NEON_DATABASE_URL" -f backend/db/migrations/001_add_delivery_tracking_fields.sql
```

Or copy and paste the SQL from `backend/db/migrations/001_add_delivery_tracking_fields.sql` in the Neon console.

For new installations, the schema will be automatically created from `backend/db/schema.js`.

## Validation Rules

### Delivery Status
- Must be one of: `not_shipped`, `shipped`, `in_transit`, `out_for_delivery`, `delivered`, `returned`
- Invalid values will return a 400 error

### Tracking ID
- Optional text field
- Can contain alphanumeric characters and special characters
- No maximum length restriction

### Delivery Partner
- Optional text field
- Can be any delivery partner name
- No enum restriction - supports flexibility

### Actual Delivery Date
- Optional date field
- Must be a valid ISO date format
- Can be set when marking an order as delivered

## Usage Examples

### Example 1: Create an Order with Delivery Tracking

```javascript
const orderData = {
  orderFrom: 'instagram',
  customerName: 'John Doe',
  customerId: 'CUST001',
  items: [{ itemId: 1, quantity: 2 }],
  deliveryStatus: 'not_shipped',
  trackingId: '',
  deliveryPartner: '',
};

const response = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData),
});
```

### Example 2: Mark Order as Shipped with Tracking

```javascript
const updateData = {
  deliveryStatus: 'shipped',
  trackingId: 'DELHIV123456789',
  deliveryPartner: 'Delhivery',
};

const response = await fetch(`/api/orders/${orderId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData),
});
```

### Example 3: Mark Order as Delivered

```javascript
const updateData = {
  deliveryStatus: 'delivered',
  actualDeliveryDate: '2024-12-08',
};

const response = await fetch(`/api/orders/${orderId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData),
});
```

## Testing

The feature includes comprehensive test coverage:

- ✅ Create order with delivery tracking fields
- ✅ Update order to mark as delivered
- ✅ Update order with tracking information
- ✅ Reject invalid delivery status
- ✅ Accept all valid delivery statuses
- ✅ Allow tracking from multiple delivery partners

Run tests with:
```bash
cd backend
npm test
```

All 126 tests pass, including 6 new tests for delivery tracking functionality.

## Future Enhancements

Possible future improvements:

1. **Delivery Partner Integration**: Direct integration with delivery partner APIs to fetch real-time tracking information
2. **Automated Status Updates**: Webhooks from delivery partners to automatically update delivery status
3. **Customer Notifications**: Send SMS/email notifications when delivery status changes
4. **Delivery History**: Track the complete journey of the package with timestamps
5. **Estimated Delivery Time**: Calculate and display estimated delivery time based on delivery partner

## Support

For issues or questions about the delivery tracking feature, please open an issue in the GitHub repository.
