# AI SEO OS - Supabase Database Schema

Complete PostgreSQL database schema for the AI SEO OS platform, designed for Supabase with Row Level Security (RLS), performance indexes, and audit capabilities.

## 📁 Structure

```
supabase/
├── migrations/
│   └── 20250103000000_initial_schema.sql    # Main migration file
├── seed.sql                                  # Test data for development
└── README.md                                 # This file
```

## 🗄️ Database Tables

### Core Tables

| Table | Description | Key Features |
|-------|-------------|--------------|
| `users` | Application users linked to Supabase Auth | Auth integration, company profiles |
| `projects` | SEO projects owned by users | WordPress integration, settings JSONB |
| `integrations` | Third-party service connections | OAuth token storage (encrypted), GSC, WordPress, Elementor |

### Content Tables

| Table | Description | Key Features |
|-------|-------------|--------------|
| `pages` | Website pages and content | Elementor data, internal links, publish status |
| `agent_runs` | AI agent execution tracking | Input/output JSONB, token usage, duration tracking |

### Analytics Tables

| Table | Description | Key Features |
|-------|-------------|--------------|
| `gsc_snapshots` | Google Search Console data | Query/page performance, snapshot dates |
| `rankings` | Keyword ranking positions | Position change tracking, difficulty scores |
| `leads` | Captured leads from forms | Source tracking, contact info |

### System Tables

| Table | Description | Key Features |
|-------|-------------|--------------|
| `logs` | System and application logs | Multi-level logging, metadata JSONB |

## 🔐 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

- **Users**: Can only view/update their own profile
- **Projects**: Users can only access their own projects
- **Related Tables**: All child tables (pages, integrations, etc.) use project-level authorization

### Encrypted Fields

The following fields are designed for encryption (vault integration ready):

- `projects.wordpress_password_encrypted`
- `integrations.access_token_encrypted`
- `integrations.refresh_token_encrypted`

## 📊 Indexes

Performance indexes are created on:

- **Foreign keys**: All `project_id`, `user_id`, `page_id` references
- **Status fields**: For efficient filtering by status
- **Timestamps**: For time-range queries
- **Search fields**: Slug, email, keyword lookups

## 🔄 Automated Features

### Triggers

- `update_updated_at_column()`: Automatically updates `updated_at` on all tables

### Views

- `project_health_summary`: Aggregated project metrics
- `agent_performance_summary`: Agent execution statistics

### Functions

- `get_project_stats(project_uuid)`: Returns JSONB with project statistics
- `clean_old_logs(days_to_keep)`: Maintenance function for log cleanup

## 🚀 Usage

### Local Development

```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase db reset

# Or apply specific migration
psql $DATABASE_URL -f supabase/migrations/20250103000000_initial_schema.sql
```

### Production Deployment

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Apply seed data (development only!)
supabase db seed
```

### Using with Supabase CLI

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Start local development stack
supabase start

# Create a new migration
supabase migration new add_new_feature

# Reset database with migrations
supabase db reset

# Generate types from schema
supabase gen types typescript --local > src/types/database.ts
```

## 📋 Enum Types

### Project Status
- `active` - Project is actively being worked on
- `paused` - Project temporarily stopped
- `archived` - Project archived

### Page Status
- `draft` - Content being created
- `published` - Live on website
- `optimized` - Content optimized based on data

### Publish Status
- `pending` - Waiting to be published
- `published` - Successfully published
- `failed` - Publishing failed

### Agent Types
- `market_research` - Market analysis agent
- `site_arch` - Site architecture planning
- `internal_linker` - Internal linking optimization
- `elementor_builder` - Elementor page building
- `content_builder` - Content generation
- `page_builder` - Page creation orchestration
- `fixer` - Error correction
- `technical_seo` - Technical SEO audits
- `monitor` - Performance monitoring
- `optimizer` - Content optimization
- `publisher` - WordPress publishing

### Agent Run Status
- `pending` - Waiting to start
- `running` - Currently executing
- `completed` - Successfully finished
- `failed` - Execution failed

### Integration Types
- `gsc` - Google Search Console
- `wordpress` - WordPress CMS
- `elementor` - Elementor page builder
- `rankmath` - RankMath SEO plugin
- `yoast` - Yoast SEO plugin

### Log Levels
- `debug` - Debug information
- `info` - General information
- `warn` - Warnings
- `error` - Errors

## 🔗 Relationships

```
auth.users (1) ────────< (1) users
                              │
                              │ (1)
                              ▼
                         projects (*) ────< (*) integrations
                              │
                              │ (1)
                              ├───< (*) pages
                              ├───< (*) agent_runs
                              ├───< (*) gsc_snapshots
                              ├───< (*) rankings
                              ├───< (*) leads
                              └───< (*) logs
```

## 📝 Example Queries

### Get project with all related data

```sql
SELECT 
    p.*,
    (SELECT COUNT(*) FROM pages WHERE project_id = p.id) as page_count,
    (SELECT COUNT(*) FROM leads WHERE project_id = p.id) as lead_count,
    (SELECT COUNT(*) FROM agent_runs WHERE project_id = p.id) as agent_run_count
FROM projects p
WHERE p.id = 'your-project-id';
```

### Get GSC performance over time

```sql
SELECT 
    snapshot_date,
    SUM(clicks) as total_clicks,
    SUM(impressions) as total_impressions,
    AVG(position) as avg_position
FROM gsc_snapshots
WHERE project_id = 'your-project-id'
GROUP BY snapshot_date
ORDER BY snapshot_date DESC;
```

### Get agent performance

```sql
SELECT 
    agent_type,
    status,
    COUNT(*) as run_count,
    AVG(duration_ms) as avg_duration_ms,
    SUM(tokens_used) as total_tokens
FROM agent_runs
WHERE project_id = 'your-project-id'
GROUP BY agent_type, status;
```

### Get project health summary

```sql
SELECT * FROM project_health_summary
WHERE project_id = 'your-project-id';
```

## 🔧 Maintenance

### Clean old logs

```sql
-- Remove debug and info logs older than 30 days
SELECT clean_old_logs(30);
```

### Update statistics

```sql
-- After large data imports
ANALYZE;

-- Reindex if needed
REINDEX DATABASE postgres;
```

## 🧪 Testing with Seed Data

The `seed.sql` file contains test data for development:

- 2 test users
- 3 sample projects (active, paused, archived)
- 4 integrations (GSC, WordPress, Elementor)
- 5 pages (various statuses)
- 8 agent runs (completed, failed)
- 6 GSC snapshots with performance data
- 5 keyword rankings
- 4 captured leads
- 6 system logs

To apply seed data:

```sql
\i supabase/seed.sql
```

Or using psql:

```bash
psql $DATABASE_URL -f supabase/seed.sql
```

## 📈 Schema Evolution

When making schema changes:

1. Create a new migration file:
   ```bash
   supabase migration new descriptive_name
   ```

2. Add your changes to the new migration file

3. Test locally:
   ```bash
   supabase db reset
   ```

4. Deploy to production:
   ```bash
   supabase db push
   ```

## 🆘 Troubleshooting

### RLS Policy Issues

If you encounter permission errors, ensure:
1. User is authenticated
2. User has a corresponding record in the `users` table
3. The `auth_id` matches the authenticated user's ID

### Migration Failures

If a migration fails:
1. Check the error message for specific issues
2. Fix the migration file
3. Reset the database: `supabase db reset`
4. Re-apply migrations

### Performance Issues

If queries are slow:
1. Check query plans: `EXPLAIN ANALYZE your_query`
2. Verify indexes exist: `\di table_name`
3. Update statistics: `ANALYZE table_name`
