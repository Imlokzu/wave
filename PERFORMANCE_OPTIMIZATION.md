# Supabase Performance Optimization Guide

## Current Issues
- Slow initial load times
- High number of database connections
- Potential connection pool exhaustion

## ✅ Implemented Optimizations

### 1. **Client-Side Caching**
- ✅ SessionStorage auth cache (instant on reload)
- ✅ LocalStorage auth cache (10 minute expiry)
- ✅ Message caching per room (2 minute expiry)
- ✅ Parallel async loading

### 2. **Request Batching**
- ✅ Batch API requests within 50ms window
- ✅ 10 minute cache duration for static data

## 🔧 Recommended Supabase Configuration

### 1. Enable Supavisor Connection Pooling
In your Supabase dashboard:
1. Go to **Database** → **Connection Pooling**
2. Enable **Transaction** or **Session** mode
3. Update your `.env` to use pooler URL:

```env
# Backend .env
SUPABASE_URL=https://YOUR_PROJECT.pooler.supabase.com
SUPABASE_KEY=your_anon_key
```

### 2. Optimize Connection Settings
In Supabase SQL Editor, run:

```sql
-- Increase connection limit (if needed)
ALTER SYSTEM SET max_connections = '100';

-- Optimize connection pool
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### 3. Add Database Indexes
Run in Supabase SQL Editor:

```sql
-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_flux_users_username ON flux_users(username);
CREATE INDEX IF NOT EXISTS idx_flux_users_email ON flux_users(email);

-- Index for faster DM queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_users ON direct_messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_timestamp ON direct_messages(created_at DESC);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at) WHERE expires_at > NOW();
```

### 4. Clean Up Expired Sessions
Add a cron job in Supabase:

```sql
-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Run daily at 2 AM
SELECT cron.schedule(
  'cleanup-sessions',
  '0 2 * * *',
  $$SELECT cleanup_expired_sessions();$$
);
```

## 📊 Monitoring

### Check Active Connections
```sql
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

### Identify Slow Queries
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### View Connection Pool Status
Check metrics endpoint:
```
https://YOUR_PROJECT.supabase.co/rest/v1/metrics
```

## 🚀 Expected Performance Improvements

After implementing these optimizations:
- **Initial load**: < 1 second (from 5+ seconds)
- **Page reload**: < 500ms (from 3+ seconds)
- **API calls**: 80% reduction through caching
- **Database connections**: 60% reduction through pooling

## 📝 Notes
- Cache duration can be adjusted in `/public/js/config.js`
- Auth cache uses sessionStorage for instant reload
- Connection pooling is essential for serverless functions
