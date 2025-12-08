# Database Migrations

This directory contains SQL migration scripts for the Order Management System database.

## Running Migrations

Since this project uses Drizzle ORM with Neon PostgreSQL, schema changes are typically applied through the `schema.js` file. However, for existing databases, you may need to run migrations manually.

### Manual Migration

To apply a migration manually, connect to your Neon PostgreSQL database and run the SQL script:

```bash
# Using psql
psql "YOUR_NEON_DATABASE_URL" -f backend/db/migrations/001_add_delivery_tracking_fields.sql

# Or copy and paste the SQL directly in the Neon console
```

## Migration History

- **001_add_delivery_tracking_fields.sql** (2025-12-08)
  - Adds delivery tracking fields: `delivery_status`, `tracking_id`, `delivery_partner`, `actual_delivery_date`
  - These fields enable tracking order delivery status and courier information

## Note

The schema.js file is the source of truth for the database schema. These migration scripts are provided for reference and manual application to existing databases.
