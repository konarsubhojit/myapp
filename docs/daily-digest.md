# Daily Digest Reminder System

This document describes the daily digest reminder feature that sends email notifications for orders approaching their expected delivery dates.

## Overview

The daily digest system emails internal recipients every day at 09:00 Asia/Kolkata (IST) with orders whose expected delivery date is exactly 1, 3, or 7 days away (Kolkata calendar days).

## Features

- **Three-tier reminders**: 1-day, 3-day, and 7-day advance notifications
- **Timezone-safe**: All calculations use Asia/Kolkata timezone
- **Idempotent**: Will not send duplicate emails if triggered multiple times the same day
- **Durable tracking**: Uses database state to avoid sending duplicate reminders for the same order/tier
- **Automatic reset**: When an order's delivery date changes, reminder state resets to allow new reminders

## API Endpoint

### POST /api/internal/digest/run

Triggers the daily digest email. This endpoint is protected by a secret header and does not require OAuth authentication.

**Headers**:
- `X-DIGEST-SECRET`: Must match the `DIGEST_JOB_SECRET` environment variable

**Response**:
```json
{
  "message": "Digest completed successfully",
  "status": "sent",
  "digestDate": "2024-12-15",
  "orderCounts": {
    "oneDay": 2,
    "threeDay": 3,
    "sevenDay": 5
  }
}
```

## Database Tables

### notification_recipients

Stores email addresses for digest delivery.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| email | text | Email address (unique) |
| enabled | boolean | Whether to include in digests |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### order_reminder_state

Tracks which reminder tiers have been sent for each order.

| Column | Type | Description |
|--------|------|-------------|
| order_id | integer | Primary key, references orders.id |
| delivery_date_snapshot | timestamp | Expected delivery date when state was set |
| sent_7d | boolean | Whether 7-day reminder was sent |
| sent_3d | boolean | Whether 3-day reminder was sent |
| sent_1d | boolean | Whether 1-day reminder was sent |
| updated_at | timestamp | Last update time |

### digest_runs

Tracks daily digest executions for idempotency.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| digest_date | date | The Kolkata calendar date (unique) |
| status | text | started, sent, or failed |
| started_at | timestamp | When the run started |
| sent_at | timestamp | When email was sent (nullable) |
| error | text | Error message if failed (nullable) |

## Environment Variables

Add these to your backend `.env` file:

```env
# Required for digest endpoint protection
DIGEST_JOB_SECRET=your-secure-random-secret

# SMTP configuration for sending emails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@your-domain.com
```

## Vercel Cron Configuration

To automatically trigger the digest at 09:00 IST (03:30 UTC) daily, add the following to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/internal/digest/run",
      "schedule": "30 3 * * *"
    }
  ]
}
```

**Note about Vercel Cron**: Vercel's built-in cron does not support custom headers. To use Vercel Cron, you have two options:

1. **Use Vercel's automatic CRON_SECRET**: Vercel automatically sets a `CRON_SECRET` environment variable and includes an `Authorization: Bearer <CRON_SECRET>` header. You can modify the digest route to validate this instead.

2. **Use an external cron service** (recommended for production): External services like cron-job.org, Upstash, or AWS EventBridge can include custom headers.

### External Cron Service (Recommended)

If using an external cron service, configure it to:
1. Send a POST request to `https://your-domain.com/api/internal/digest/run`
2. Include the header: `X-DIGEST-SECRET: your-secret`
3. Schedule at 09:00 IST (03:30 UTC): `30 3 * * *`

### Adapting for Vercel Cron

To use Vercel's native cron, modify `backend/routes/digest.js` to also accept Vercel's `Authorization` header:

```javascript
// Check for Vercel CRON_SECRET as an alternative
const vercelCronSecret = req.headers['authorization'];
const expectedVercelSecret = process.env.CRON_SECRET;

if (expectedVercelSecret && vercelCronSecret === `Bearer ${expectedVercelSecret}`) {
  return next(); // Valid Vercel cron request
}
```

## Seeding Recipients

To add recipients to the digest, insert records directly into the database:

```sql
INSERT INTO notification_recipients (email, enabled) 
VALUES 
  ('manager@example.com', true),
  ('operations@example.com', true);
```

## Time Bucket Definitions

Let D be "today's date" in Asia/Kolkata at runtime:

- **1-day bucket**: Orders with expected delivery date from start of D+1 to start of D+2 (Kolkata time)
- **3-day bucket**: Orders with expected delivery date from start of D+3 to start of D+4 (Kolkata time)
- **7-day bucket**: Orders with expected delivery date from start of D+7 to start of D+8 (Kolkata time)

## Exclusions

Orders are excluded from the digest if:
- `status = 'completed'`
- `status = 'cancelled'`
- The specific tier reminder has already been sent (based on `order_reminder_state`)

## Delivery Date Changes

When an order's `expectedDeliveryDate` is updated:
1. The `order_reminder_state.delivery_date_snapshot` is updated
2. All `sent_*` flags are reset to `false`
3. The order becomes eligible for new reminders based on the new date

## Testing

Run the digest tests:

```bash
cd backend
npm test -- digestBuckets
npm test -- digest.test
npm test -- digestService
npm test -- emailService
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel Cron (03:30 UTC)                      │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │   POST /api/internal/digest/run                            │ │
│  │   (Protected by X-DIGEST-SECRET)                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │   digestService.runDailyDigest()                           │ │
│  │   1. Check idempotency (digest_runs)                       │ │
│  │   2. Load enabled recipients                               │ │
│  │   3. Compute timezone-safe buckets                         │ │
│  │   4. Query orders for each bucket                          │ │
│  │   5. Send consolidated email                               │ │
│  │   6. Update order_reminder_state                           │ │
│  │   7. Mark digest_runs as sent                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │   emailService.sendEmail()                                 │ │
│  │   (SMTP via nodemailer)                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```
