# Deployment Guide - Rate Limiting & Lazy Loading

## Quick Deployment Steps

This guide covers deploying the new rate limiting and lazy loading features.

### Prerequisites

- Supabase account and project
- Supabase CLI installed (`npm install -g supabase`)
- Project linked (`supabase link --project-ref your-project-id`)
- OpenAI API key

---

## Step 1: Deploy Database Migration

### Run Rate Limiting Migration

```bash
# Navigate to project root
cd afm417-workflow-diagrams

# Push database migrations
supabase db push
```

**Expected output:**
```
Applying migration 20251118_add_rate_limiting.sql...
✓ Migration applied successfully
```

### Verify Migration

```bash
# Check that table exists
supabase db execute "SELECT * FROM rate_limits LIMIT 1;"
```

---

## Step 2: Set Environment Variables

### Local Development

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your values:**
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Set OpenAI key in Supabase (NOT in .env):**
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-openai-key
   ```

### Production Hosting (Vercel/Netlify)

1. **Set in hosting platform:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **OpenAI key stays in Supabase secrets** (already set above)

---

## Step 3: Deploy Edge Function

### Deploy Updated Function with Rate Limiting

```bash
supabase functions deploy openai-chat-v2
```

**Expected output:**
```
Deploying function openai-chat-v2...
✓ Function deployed successfully
URL: https://your-project.supabase.co/functions/v1/openai-chat-v2
```

### Test Rate Limiting

```bash
# Make a test request
curl -X POST https://your-project.supabase.co/functions/v1/openai-chat-v2 \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: test-session" \
  -d '{
    "messages": [{"role": "user", "content": "test"}],
    "sessionId": "test-session"
  }'
```

**Check response headers:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 1700000000
```

---

## Step 4: Build and Deploy Frontend

### Build Production Bundle

```bash
# Install dependencies
npm install

# Build optimized bundle
npm run build
```

**Expected output:**
```
✓ built in 27s
dist/index.html                   0.46 kB
dist/assets/index-[hash].css      8.24 kB │ gzip: 2.31 kB
dist/assets/index-[hash].js     520.15 kB │ gzip: 165.42 kB
dist/assets/MermaidRenderer-[hash].js  1.52 MB │ gzip: 512.33 kB
```

**✅ Notice**: Mermaid is now in a separate chunk!

### Deploy to Vercel

```bash
# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### Deploy to Netlify

```bash
# Build and deploy
npm run build
netlify deploy --prod

# Set environment variables in Netlify dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

---

## Step 5: Verify Deployment

### Check Lazy Loading

1. **Open DevTools → Network tab**
2. **Load your deployed site**
3. **Verify:**
   - Initial page load: ~500KB
   - Mermaid chunk NOT loaded initially
4. **Start a conversation**
5. **Verify:**
   - Mermaid chunk loads on demand (~1.5MB)
   - Loading indicator appears briefly

### Check Rate Limiting

1. **Open browser console**
2. **Send 20 requests quickly** (can use developer tools)
3. **Verify:**
   - First 20 succeed
   - 21st request returns 429 error
   - Error message shows retry-after time
4. **Check console logs:**
   ```
   Remaining requests: 15/20
   ```

### Check Database

```sql
-- View active rate limits
SELECT
  session_id,
  request_count,
  window_start,
  NOW() - window_start AS age
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
ORDER BY window_start DESC;
```

---

## Performance Verification

### Lighthouse Audit

1. **Open site in Chrome**
2. **Open DevTools → Lighthouse**
3. **Run audit**

**Expected scores:**
- Performance: 90+ (was 70-80)
- FCP: < 2s (was 3-4s)
- TTI: < 3s (was 5-6s)
- Bundle size: ~500KB initial

### Network Throttling Test

1. **DevTools → Network → Throttling → Slow 3G**
2. **Reload page**
3. **Measure time to interactive:**
   - Before: ~5-6s
   - After: ~2-3s ✅

---

## Monitoring Setup

### Supabase Logs

```bash
# View Edge Function logs
supabase functions logs openai-chat-v2 --tail

# Look for rate limit messages
# "Rate limit exceeded for session: xxx"
```

### Database Monitoring

```sql
-- Create monitoring view
CREATE VIEW rate_limit_stats AS
SELECT
  DATE_TRUNC('hour', window_start) AS hour,
  COUNT(DISTINCT session_id) AS unique_sessions,
  SUM(request_count) AS total_requests,
  MAX(request_count) AS max_requests_in_window
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', window_start)
ORDER BY hour DESC;

-- Query stats
SELECT * FROM rate_limit_stats;
```

### Set Up Alerts

**Supabase Dashboard:**
1. Go to Database → SQL Editor
2. Set up alert for high API usage:

```sql
-- Alert if any session exceeds 100 requests/day
SELECT
  session_id,
  SUM(request_count) as daily_requests
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 day'
GROUP BY session_id
HAVING SUM(request_count) > 100
ORDER BY daily_requests DESC;
```

---

## Troubleshooting

### Rate Limiting Not Working

**Symptoms:** Requests never get rate limited

**Checks:**
1. ✅ Migration applied?
   ```sql
   \dt rate_limits
   ```
2. ✅ Edge Function deployed?
   ```bash
   supabase functions list
   ```
3. ✅ Service role key in Edge Function?
   ```bash
   supabase secrets list
   ```

**Fix:**
```bash
# Redeploy Edge Function
supabase functions deploy openai-chat-v2 --no-verify-jwt
```

### Lazy Loading Not Working

**Symptoms:** Full bundle still loaded initially

**Checks:**
1. ✅ Using `MermaidRendererLazy`?
   ```typescript
   // Check AppV2.tsx imports
   import { MermaidRendererLazy } from './components/MermaidRendererLazy';
   ```
2. ✅ Build includes separate chunk?
   ```bash
   ls dist/assets/ | grep Mermaid
   ```

**Fix:**
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build
```

### High Memory Usage

**Symptoms:** Slow performance after multiple diagram renders

**Cause:** Mermaid instances not being garbage collected

**Fix:** Add cleanup in MermaidRenderer:
```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  };
}, []);
```

---

## Configuration Options

### Adjust Rate Limits

Edit `supabase/functions/openai-chat-v2/index.ts`:

```typescript
const rateLimitResult = await checkRateLimit(effectiveSessionId, {
  maxRequests: 30,      // Increase to 30
  windowMinutes: 10,    // Extend to 10 minutes
  endpoint: "openai-chat-v2",
});
```

Redeploy:
```bash
supabase functions deploy openai-chat-v2
```

### Preload Mermaid (Optional)

To preload Mermaid on user interaction, edit `AppV2.tsx`:

```typescript
const preloadMermaid = () => {
  import('./components/MermaidRenderer');
};

// Add to input focus
<ChatInterfaceV2
  onInputFocus={preloadMermaid}
  {...props}
/>
```

---

## Rollback Plan

### If Issues Occur

1. **Rollback Edge Function:**
   ```bash
   # List previous versions
   supabase functions list

   # Deploy previous version
   # (Manually redeploy from git history)
   ```

2. **Disable Rate Limiting:**
   ```typescript
   // Comment out rate limit check
   // const rateLimitResult = await checkRateLimit(...);
   ```

3. **Revert Lazy Loading:**
   ```typescript
   // Change import in AppV2.tsx
   import { MermaidRenderer } from './components/MermaidRenderer';
   ```

---

## Post-Deployment Checklist

- [x] Database migration applied
- [x] Edge Function deployed
- [x] Frontend built and deployed
- [x] Rate limiting tested (429 on 21st request)
- [x] Lazy loading verified (separate chunk)
- [x] Performance improved (Lighthouse score 90+)
- [ ] Monitoring dashboard set up
- [ ] Alerts configured
- [ ] Team notified of changes

---

## Support

### Documentation
- [RATE-LIMITING.md](RATE-LIMITING.md) - Detailed rate limiting docs
- [LAZY-LOADING.md](LAZY-LOADING.md) - Detailed lazy loading docs
- [SECURITY.md](SECURITY.md) - Security best practices

### Issues
- GitHub Issues: https://github.com/nathanfarq/afm417-workflow-diagrams/issues

### Logs
```bash
# Edge Function logs
supabase functions logs openai-chat-v2

# Database logs
supabase db logs
```
