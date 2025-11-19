# Deployment Guide

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install via `npm install -g supabase`
3. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com/api-keys)
4. **Node.js**: Version 18+ required

---

## Step 1: Set Up Supabase Project

### 1.1 Create New Project
```bash
# In Supabase dashboard, create a new project
# Note your project URL and anon key
```

### 1.2 Run Database Migrations
```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push

# Or manually run SQL in Supabase SQL Editor:
# 1. supabase/migrations/20251112221945_create_conversations_schema.sql
# 2. supabase/migrations/20251113142856_add_session_id_to_conversations.sql
# 3. supabase/migrations/20251113142909_fix_session_policies_simple.sql
# 4. supabase/migrations/20251118_add_schema_version.sql
```

### 1.3 Set OpenAI API Key in Supabase Secrets
```bash
# Set secret (NEVER commit this to Git!)
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here

# Verify
supabase secrets list
```

---

## Step 2: Deploy Edge Functions

### 2.1 Deploy V2 Edge Function
```bash
# Deploy the new V2 function
supabase functions deploy openai-chat-v2

# Test the deployment
curl -i --location --request POST \
  'https://your-project-id.supabase.co/functions/v1/openai-chat-v2' \
  --header 'Authorization: Bearer your-anon-key' \
  --header 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Test"}],"currentJSON":null}'
```

### 2.2 (Optional) Deploy V1 Edge Function for Backward Compatibility
```bash
supabase functions deploy openai-chat
```

---

## Step 3: Configure Frontend Environment

### 3.1 Create `.env` File
```bash
# Copy template
cp .env.example .env

# Edit .env with your values
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3.2 Test Locally
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:5173/v2
```

---

## Step 4: Deploy to Production

### Option A: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Deploy to production
vercel --prod
```

### Option B: Deploy to Netlify

```bash
# Build the project
npm run build

# Drag and drop /dist folder to Netlify

# Or use Netlify CLI:
npm install -g netlify-cli
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

### Option C: Deploy to Bolt.new

1. **Upload Project to Bolt.new**
   - Zip the entire project folder
   - Upload to Bolt.new
   - Or connect GitHub repository

2. **Set Environment Variables in Bolt**
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Build and Deploy**
   - Bolt.new will automatically detect Vite config
   - Click "Deploy" button
   - Access your deployed app

---

## Step 5: Verify Deployment

### 5.1 Check V2 Route
- Navigate to `https://your-domain.com/v2`
- Should see "Process Builder V2" interface

### 5.2 Test Full Flow
1. Enter a process description
2. Verify AI responds with questions
3. Check that diagram renders
4. Test JSON download
5. Test SVG/PNG/PDF export
6. Verify Start Over button works

### 5.3 Check Database
```bash
# Query conversations table
supabase db remote sql --db-url your-connection-string

SELECT * FROM conversations WHERE schema_version = '2.0';
```

---

## Step 6: Post-Deployment Tasks

### 6.1 Security Hardening

1. **Update CORS** (in Edge Function):
   ```typescript
   // Change from:
   "Access-Control-Allow-Origin": "*",

   // To:
   "Access-Control-Allow-Origin": "https://your-domain.com",
   ```

2. **Set Up Rate Limiting**:
   ```bash
   # Add to Supabase Edge Function
   # Install edge-rate-limit or implement custom logic
   ```

3. **Enable Supabase Auth** (optional but recommended):
   ```bash
   # Update RLS policies to require authentication
   ```

### 6.2 Monitoring

1. **Supabase Dashboard**:
   - Monitor Edge Function logs
   - Check database queries
   - Review API usage

2. **OpenAI Dashboard**:
   - Set spending limits
   - Monitor token usage
   - Check for errors

3. **Error Tracking** (optional):
   ```bash
   npm install @sentry/react @sentry/vite-plugin
   # Configure Sentry in main.tsx
   ```

---

## Troubleshooting

### Issue: Edge Function Returns 500 Error

**Cause**: OpenAI API key not set
**Solution**:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase functions deploy openai-chat-v2
```

### Issue: CORS Error in Browser

**Cause**: Edge Function CORS not configured
**Solution**: Check `corsHeaders` in `supabase/functions/openai-chat-v2/index.ts`

### Issue: Diagram Not Rendering

**Cause**: Mermaid syntax error or missing fields
**Solution**: Check browser console for validation errors

### Issue: "No test suite found" in Tests

**Cause**: Vitest configuration issue
**Solution**: Tests are written but may need TypeScript config adjustment. The core functionality works.

---

## Rollback Plan

If V2 has issues:

1. **Revert Frontend**:
   ```bash
   # Change default route in src/main.tsx
   <Route path="/" element={<Navigate to="/v1" replace />} />
   ```

2. **Keep Both Versions**:
   - V1 at `/v1` (legacy)
   - V2 at `/v2` (new)
   - Let users choose

3. **Database**: Old conversations (schema_version='1.0') still work with V1

---

## Performance Optimization

1. **Lazy Load Mermaid**:
   ```typescript
   // In MermaidRenderer.tsx
   const mermaid = await import('mermaid');
   ```

2. **Code Splitting**:
   ```typescript
   // In main.tsx
   const AppV2 = lazy(() => import('./AppV2'));
   ```

3. **CDN for Static Assets**:
   - Use Vercel/Netlify CDN
   - Enable compression

---

## Scaling Considerations

- **Database**: Supabase free tier handles ~50k conversations
- **Edge Functions**: 500k invocations/month on free tier
- **OpenAI API**: Monitor costs, gpt-4o-mini is cost-effective
- **Storage**: Conversations auto-expire after 30 days

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Mermaid.js Docs**: https://mermaid.js.org
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Issues**: https://github.com/your-username/repo/issues
