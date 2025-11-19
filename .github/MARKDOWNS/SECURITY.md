# Security Considerations

## ✅ Current Security Implementation

### 1. **API Key Protection**
- ✅ **OpenAI API Key**: Stored in Supabase Edge Function secrets (NOT in frontend code)
- ✅ **Supabase Keys**: Only anon key exposed in frontend (intended for public use)
- ✅ **Environment Variables**: `.env` files in `.gitignore` (never committed)

### 2. **Row Level Security (RLS)**
- ✅ Supabase conversations table has RLS enabled
- ✅ Session-based isolation (users can only access their own data)
- ✅ Anonymous users get temporary session IDs (stored in localStorage)

### 3. **Data Privacy**
- ✅ No user authentication required (privacy-friendly)
- ✅ Conversations expire after 30 days (configurable in `sessionManager.ts`)
- ✅ No PII collected (anonymous session-based)

### 4. **CORS & Request Validation**
- ✅ CORS headers configured in Edge Functions
- ✅ Request validation in Edge Functions
- ✅ Error messages don't leak sensitive information

---

## 🔒 Security Best Practices for Deployment

### **For GitHub Repository (Public)**

1. **Never Commit Secrets**
   - ✅ `.env` is in `.gitignore`
   - ✅ `.env.example` provided as template (no real values)
   - ⚠️ **Before pushing**: Run `git log --all --full-history -- "*/.env*"` to check for accidentally committed secrets

2. **Audit Git History**
   ```bash
   # Check for accidentally committed secrets
   git log --all --source --full-history -- .env

   # If found, use BFG Repo-Cleaner or git-filter-repo to remove
   ```

3. **Use GitHub Secrets**
   - For CI/CD, store secrets in GitHub Actions secrets
   - Never hardcode in workflow files

### **For Bolt.new Deployment**

1. **Environment Variables**
   - Set `VITE_SUPABASE_URL` in Bolt environment
   - Set `VITE_SUPABASE_ANON_KEY` in Bolt environment
   - These are safe to expose (public keys by design)

2. **Supabase Setup**
   ```bash
   # Set OpenAI key in Supabase (NOT Bolt)
   supabase secrets set OPENAI_API_KEY=sk-...

   # Verify it's set
   supabase secrets list
   ```

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy openai-chat-v2
   ```

### **For Production Hosting**

1. **Rate Limiting**
   - ✅ **IMPLEMENTED**: Database-backed rate limiting on Edge Functions
   - ✅ 20 requests per 5 minutes per session
   - ✅ Automatic cleanup of old records
   - See [RATE-LIMITING.md](RATE-LIMITING.md) for details

2. **Input Validation**
   - ✅ JSON schema validation implemented
   - ✅ Mermaid syntax escaping prevents injection
   - ⚠️ **TODO**: Add content length limits

3. **Monitoring**
   - Set up Supabase log monitoring
   - Alert on unusual API usage patterns
   - Monitor OpenAI API costs

---

## 🚨 Known Security Limitations

### **Current Implementation**

1. **No Authentication** ⚠️
   - Anyone can use the app
   - ✅ Rate limiting implemented (20 req/5min per session)
   - **Risk**: OpenAI API costs could still escalate with many sessions
   - **Mitigation**: Add Supabase Auth for authenticated users with higher limits

2. **Client-Side Validation Only**
   - Schema validation happens in browser
   - **Risk**: Malicious users could bypass
   - **Mitigation**: Add server-side validation in Edge Function

3. **No Content Filtering**
   - Users can input any text
   - **Risk**: Potential for abuse/inappropriate content
   - **Mitigation**: Add OpenAI Moderation API call

4. **Session Hijacking**
   - Session IDs stored in localStorage
   - **Risk**: XSS could steal session ID
   - **Mitigation**: Use httpOnly cookies (requires backend)

### **Supabase RLS Policies**

Current policies allow anonymous access:
```sql
-- Anyone can create/read/update/delete conversations
-- This is intentional for demo, but not recommended for production
```

**For Production**, update to:
```sql
-- Restrict to authenticated users only
CREATE POLICY "Users can only access own conversations"
  ON conversations
  FOR ALL
  USING (auth.uid() = user_id);
```

---

## ✅ Security Checklist Before Going Live

- [ ] Audit git history for accidentally committed secrets
- [ ] Verify `.env` is not in repo
- [ ] Set up Supabase Auth (if not demo)
- [x] **Implement rate limiting on Edge Functions** ✅
- [ ] Add OpenAI Moderation API for content filtering
- [ ] Update RLS policies for authenticated users
- [ ] Set up monitoring and alerts
- [ ] Configure CORS to specific domains (not `*`)
- [ ] Add request size limits
- [ ] Enable HTTPS only (Supabase does this by default)
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Review Supabase logs for unusual activity
- [ ] Set OpenAI API spending limits
- [x] **Run database migration for rate_limits table** ✅

---

## 📞 Reporting Security Issues

If you discover a security vulnerability, please email [your-email@example.com](mailto:your-email@example.com) instead of opening a public issue.

---

## 🔄 Regular Security Maintenance

1. **Monthly**: Review Supabase logs for unusual patterns
2. **Monthly**: Check OpenAI API usage and costs
3. **Quarterly**: Update dependencies (`npm audit fix`)
4. **Quarterly**: Review and rotate API keys
5. **Yearly**: Full security audit
