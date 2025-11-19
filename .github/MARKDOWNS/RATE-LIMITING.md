# Rate Limiting Implementation

## Overview

Rate limiting has been implemented to prevent API abuse and control OpenAI costs. The system tracks requests per session and enforces configurable limits.

## Configuration

### Default Limits
- **20 requests per 5 minutes** per session
- Configurable via Edge Function parameters
- Database-backed for persistence across restarts

### Components

1. **Database Table**: `rate_limits` (PostgreSQL)
2. **Edge Function Module**: `rate-limiter.ts`
3. **Frontend Integration**: Session ID tracking

## How It Works

### 1. Session Tracking

Each user gets a unique session ID stored in localStorage:

```typescript
// Automatically generated on first visit
const sessionId = getOrCreateSessionId();
```

### 2. Request Flow

```
User Request
    ↓
Frontend sends sessionId
    ↓
Edge Function checks rate_limits table
    ↓
If under limit: Process request & increment counter
If over limit: Return 429 error with retry-after
```

### 3. Rate Limit Window

- **Sliding window**: 5-minute periods
- **Automatic cleanup**: Old records deleted after 1 hour
- **Per-endpoint tracking**: Separate limits for different APIs

## Database Schema

```sql
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY,
    session_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
- `idx_rate_limits_session_endpoint` - Fast lookups
- `idx_rate_limits_window_start` - Cleanup queries

## Deployment

### 1. Run Migration

```bash
supabase db push
```

This creates the `rate_limits` table and associated functions.

### 2. Deploy Edge Function

```bash
supabase functions deploy openai-chat-v2
```

The rate limiter is automatically included and active.

### 3. Verify Setup

Check that the table exists:

```sql
SELECT * FROM rate_limits LIMIT 1;
```

## Configuration Options

### Adjusting Limits

Edit `supabase/functions/openai-chat-v2/index.ts`:

```typescript
const rateLimitResult = await checkRateLimit(effectiveSessionId, {
  maxRequests: 30,      // Change from 20 to 30
  windowMinutes: 10,    // Change from 5 to 10 minutes
  endpoint: "openai-chat-v2",
});
```

### Per-User Limits (Future)

To implement user-specific limits:

1. Add `user_id` column to `rate_limits` table
2. Update rate limiter to check authenticated user ID
3. Configure different limits per user tier

## Response Headers

Rate limit information is included in all responses:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1700000000
Retry-After: 60  (only when limited)
```

## Frontend Integration

### Request Handling

```typescript
// Session ID automatically sent
const response = await fetch(apiUrl, {
  headers: {
    'X-Session-Id': sessionId,
  },
  body: JSON.stringify({
    sessionId,  // Also in body for redundancy
    messages,
  }),
});
```

### Error Handling

```typescript
if (response.status === 429) {
  const errorData = await response.json();
  alert(`Rate limit exceeded. Try again in ${errorData.retryAfter} seconds.`);
}
```

### Rate Limit Display

Rate limit info is logged to console:

```javascript
console.log(`Remaining requests: ${rateLimit.remaining}/${rateLimit.limit}`);
```

To display in UI, add to your component:

```typescript
{rateLimit && (
  <div className="text-xs text-gray-500">
    Requests remaining: {rateLimit.remaining}/{rateLimit.limit}
  </div>
)}
```

## Monitoring

### View Current Limits

```sql
SELECT
  session_id,
  endpoint,
  request_count,
  window_start,
  NOW() - window_start AS age
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
ORDER BY window_start DESC;
```

### Find Heavy Users

```sql
SELECT
  session_id,
  COUNT(*) as total_windows,
  SUM(request_count) as total_requests,
  MAX(request_count) as max_in_window
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 day'
GROUP BY session_id
ORDER BY total_requests DESC
LIMIT 10;
```

### Cleanup Old Records

Automatic cleanup function runs periodically:

```sql
SELECT cleanup_old_rate_limits();
```

## Testing

### Test Rate Limiting

1. **Make 20 requests quickly**
   ```bash
   for i in {1..20}; do
     curl -X POST $SUPABASE_URL/functions/v1/openai-chat-v2 \
       -H "Authorization: Bearer $ANON_KEY" \
       -H "X-Session-Id: test-session" \
       -d '{"messages":[{"role":"user","content":"test"}]}'
   done
   ```

2. **21st request should fail with 429**
   ```json
   {
     "error": "Rate limit exceeded",
     "retryAfter": 300
   }
   ```

3. **Wait 5 minutes and try again** - Should work

### Check Database

```sql
SELECT * FROM rate_limits WHERE session_id = 'test-session';
```

## Troubleshooting

### Rate Limiting Not Working

1. **Check table exists**:
   ```sql
   \dt rate_limits
   ```

2. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'rate_limits';
   ```

3. **Check Edge Function logs**:
   ```bash
   supabase functions logs openai-chat-v2
   ```

### Too Restrictive

If users hit limits too often:

1. Increase `maxRequests` or `windowMinutes`
2. Add user tiers with different limits
3. Implement request queueing

### Database Performance

If rate_limits table grows too large:

1. Run cleanup more frequently
2. Add partitioning by date
3. Archive old records to separate table

## Security Considerations

### Session ID Spoofing

**Risk**: Users could share session IDs to bypass limits

**Mitigation**:
- Tie session IDs to IP addresses
- Implement device fingerprinting
- Add authentication requirement

### Database DoS

**Risk**: Attacker creates many sessions to fill database

**Mitigation**:
- Automatic cleanup (implemented)
- Add global rate limit by IP
- Monitor table size and alert

## Cost Analysis

### Storage

- ~100 bytes per rate limit record
- With cleanup: ~1000 active sessions = 100KB
- Negligible cost

### Compute

- 2 database queries per request (read + write)
- Average: 2ms per rate limit check
- Minimal impact on latency

## Future Enhancements

1. **Redis Integration**: Faster lookups for high-traffic scenarios
2. **Tiered Limits**: Different limits for authenticated vs anonymous
3. **Burst Allowance**: Allow occasional bursts above limit
4. **Geographic Limits**: Different limits by region
5. **Cost-based Limits**: Track OpenAI costs per session

## References

- Migration: [20251118_add_rate_limiting.sql](../../supabase/migrations/20251118_add_rate_limiting.sql)
- Rate Limiter Module: [rate-limiter.ts](../../supabase/functions/openai-chat-v2/rate-limiter.ts)
- Edge Function: [index.ts](../../supabase/functions/openai-chat-v2/index.ts)
- Frontend Service: [openai-v2.ts](../../src/services/openai-v2.ts)
