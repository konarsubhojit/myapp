# Database Migrations

This directory contains SQL migration scripts for the Order Management System database.

## Migration Files

### Core Schema
- **000_complete_schema.sql** - Complete database schema (all-in-one for reference)
- **001_init_schema.sql** - Initial schema setup (items, orders, order_items, feedbacks, feedback_tokens)

### Feature Additions
- **002_digest_reminder_tables.sql** - Daily digest and reminder system tables
- **003_add_pagination_indexes.sql** - Performance indexes for pagination
- **004_add_cursor_pagination_index.sql** - Composite index for orders cursor pagination
- **005_items_cursor_indexes.sql** - Composite indexes for items cursor pagination
- **0006_add_item_designs.sql** - Item designs feature (multiple designs per item)
- **0007_add_users_table.sql** - User authentication and role-based access control

## How to Run Migrations

### Initial Setup (New Database)

For a fresh database, run migrations in order:

```bash
# Set your database URL
export NEON_DATABASE_URL="postgresql://user:pass@host/db"

# Run migrations in sequence
psql $NEON_DATABASE_URL -f backend/db/migrations/001_init_schema.sql
psql $NEON_DATABASE_URL -f backend/db/migrations/002_digest_reminder_tables.sql
psql $NEON_DATABASE_URL -f backend/db/migrations/003_add_pagination_indexes.sql
psql $NEON_DATABASE_URL -f backend/db/migrations/004_add_cursor_pagination_index.sql
psql $NEON_DATABASE_URL -f backend/db/migrations/005_items_cursor_indexes.sql
psql $NEON_DATABASE_URL -f backend/db/migrations/0006_add_item_designs.sql
psql $NEON_DATABASE_URL -f backend/db/migrations/0007_add_users_table.sql
```

Or use the complete schema for a fresh start:
```bash
psql $NEON_DATABASE_URL -f backend/db/migrations/000_complete_schema.sql
# Then run only the latest migrations (0006, 0007)
psql $NEON_DATABASE_URL -f backend/db/migrations/0006_add_item_designs.sql
psql $NEON_DATABASE_URL -f backend/db/migrations/0007_add_users_table.sql
```

### Existing Database

If updating an existing database, run only the new migrations you haven't applied yet.

## Admin User Setup

After running migration 0007, create an admin user:

```bash
cd backend
node scripts/createAdminUser.js "YOUR-GOOGLE-ID" "your-email@example.com" "Your Name"
```

See backend documentation for details on finding your Google ID.

## Schema Alignment

All migrations are synchronized with the Drizzle ORM schema in `backend/db/schema.js`.

## Best Practices

1. **Backup first**: Always backup your database before running migrations
2. **Test locally**: Test on local/staging database first
3. **Run in sequence**: Migrations must be run in numerical order
4. **Check logs**: Review migration output for errors
5. **Verify schema**: Check that tables and indexes were created correctly

## Troubleshooting

### Common Issues

1. **Enum already exists**: Skip enum creation or drop existing enums
2. **Permission denied**: Ensure database user has CREATE permissions
3. **Connection timeout**: Verify NEON_DATABASE_URL is correct
4. **Constraint violation**: Check existing data before running migration

### Clean Slate

To start fresh (WARNING: Deletes all data):

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO your_user;
```

## References

- Schema definition: `backend/db/schema.js`
- Database connection: `backend/db/connection.js`
- Backend docs: `docs/backend.md`
