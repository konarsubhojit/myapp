# Database Migrations

This directory contains SQL migration scripts for the Order Management System database.

## Current Migration

### 001_init_schema.sql

**Complete database schema initialization** - This is the primary migration file that creates the entire database schema from scratch.

#### What it includes:

1. **Enums**
   - `order_from` - Order source channels (instagram, facebook, whatsapp, call, offline)
   - `order_status` - Order processing states (pending, processing, completed, cancelled)

2. **Tables**
   - `items` - Product catalog with soft delete support
   - `orders` - Core order management with delivery tracking
   - `order_items` - Junction table for order-item relationships
   - `feedbacks` - Customer feedback system with multi-dimensional ratings
   - `feedback_tokens` - Secure token-based feedback access

3. **Performance Optimizations**
   - **13 strategically placed indexes** for optimal query performance
   - Cascading deletes for referential integrity
   - Check constraints for data validation
   - Unique constraints for data integrity

4. **Documentation**
   - Comprehensive comments on all tables and columns
   - Performance notes and optimization details

## How to Run the Migration

### Manual Execution

If using a PostgreSQL client (psql, pgAdmin, DBeaver, etc.):

```bash
# Using psql
psql $NEON_DATABASE_URL -f backend/db/migrations/001_init_schema.sql

# Or connect first, then run
psql $NEON_DATABASE_URL
\i backend/db/migrations/001_init_schema.sql
```

### Using Drizzle Kit (if installed)

```bash
# Install drizzle-kit if not already installed
npm install -D drizzle-kit

# Generate and run migrations
npx drizzle-kit push:pg
```

### Using Node.js

You can also execute the migration programmatically:

```javascript
import { readFileSync } from 'fs';
import { getDatabase } from './backend/db/connection.js';

const db = await getDatabase();
const migration = readFileSync('./backend/db/migrations/001_init_schema.sql', 'utf-8');
await db.execute(migration);
```

## Schema Alignment

The migration script is synchronized with the Drizzle ORM schema defined in `backend/db/schema.js`. Both files define the same structure:

- Same table names and columns
- Same indexes (named according to schema definition)
- Same constraints and relationships
- Same enums and data types

## Performance Indexes

The migration includes 13 performance-optimized indexes:

### Items Table (2 indexes)
- `items_name_idx` - Fast product name searches
- `items_deleted_at_idx` - Efficient soft-delete filtering

### Orders Table (5 indexes)
- `orders_order_id_idx` - Quick order ID lookups
- `orders_customer_id_idx` - Customer-based filtering
- `orders_delivery_date_idx` - Date range queries
- `orders_priority_idx` - Priority-based sorting
- `orders_status_idx` - Status filtering

### Feedbacks Table (4 indexes)
- `idx_feedbacks_order_id` - Order feedback retrieval
- `idx_feedbacks_rating` - Rating-based analysis
- `idx_feedbacks_created_at` - Chronological sorting (DESC)
- `idx_feedbacks_is_public` - Public/private filtering

### Feedback Tokens Table (2 indexes)
- `idx_feedback_tokens_order_id` - Token lookup by order
- `idx_feedback_tokens_token` - Fast token validation

## Migration History

This is a consolidated migration that replaces the previous incremental migrations:

- ~~001_add_delivery_tracking_fields.sql~~ (removed)
- ~~001_add_feedback_system.sql~~ (removed)

All features from the old migrations are now included in the single `001_init_schema.sql` file.

## Best Practices

1. **Backup first**: Always backup your database before running migrations
2. **Test locally**: Test migrations on a local/staging database first
3. **Check constraints**: Review check constraints and foreign keys
4. **Monitor performance**: Use `EXPLAIN ANALYZE` to verify index usage
5. **Version control**: Keep migration files in version control

## Troubleshooting

### If migration fails midway:

The migration uses `IF NOT EXISTS` clauses, so it's safe to re-run. However, if you need to start fresh:

```sql
-- Drop all tables (WARNING: This deletes all data!)
DROP TABLE IF EXISTS feedback_tokens CASCADE;
DROP TABLE IF EXISTS feedbacks CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS order_from;
```

### Common issues:

1. **Enum already exists**: If enums exist, drop them first or skip enum creation
2. **Permission denied**: Ensure your database user has CREATE permissions
3. **Connection timeout**: Check your `NEON_DATABASE_URL` environment variable

## Future Migrations

When adding new migrations:

1. Use sequential numbering: `002_description.sql`, `003_description.sql`, etc.
2. Include rollback instructions in comments
3. Test both up and down migrations
4. Update this README with new migration details
5. Keep migrations idempotent (safe to re-run)

## References

- Schema definition: `backend/db/schema.js`
- Database connection: `backend/db/connection.js`
- Drizzle ORM docs: https://orm.drizzle.team/
- PostgreSQL docs: https://www.postgresql.org/docs/
