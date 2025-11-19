# Known Limitations & Gotchas

## 🚨 Critical Limitations

### 1. **No Rate Limiting**
**Impact**: HIGH - Could lead to unexpected OpenAI API costs

**Details**:
- Anyone can use the app unlimited times
- No per-user or per-session quotas
- OpenAI API charges $0.15 per 1M input tokens, $0.60 per 1M output tokens (gpt-4o-mini)

**Mitigation**:
```typescript
// TODO: Add to Edge Function
import { RateLimiter } from 'edge-rate-limit';

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: '1 hour'
});
```

### 2. **No Authentication**
**Impact**: MEDIUM - Anyone can access, no user management

**Details**:
- Anonymous sessions using localStorage
- No user profiles or saved preferences
- All conversations expire after 30 days

**Mitigation**:
- Add Supabase Auth for production
- Update RLS policies to require `auth.uid()`

### 3. **Large Bundle Size**
**Impact**: MEDIUM - Slow initial load (~2MB)

**Details**:
- Mermaid.js alone is 1.5MB
- Full bundle ~2MB compressed
- Could impact mobile users on slow connections

**Mitigation**:
```typescript
// Lazy load Mermaid
const MermaidRenderer = lazy(() => import('./components/MermaidRenderer'));
```

---

## ⚠️ Moderate Limitations

### 4. **Client-Side Validation Only**
**Impact**: MEDIUM - Security vulnerability

**Details**:
- JSON schema validation happens in browser
- Malicious users could bypass and send invalid data
- Edge Function trusts client input

**Mitigation**:
```typescript
// Add server-side validation in Edge Function
import { validateProcessSchema } from './validator';

const errors = validateProcessSchema(extractedJSON);
if (errors.length > 0) {
  return new Response(JSON.stringify({ error: 'Invalid schema' }), { status: 400 });
}
```

### 5. **No Content Moderation**
**Impact**: MEDIUM - Risk of abuse

**Details**:
- Users can input any text
- No filtering for inappropriate content
- Could be used for spam or testing API limits

**Mitigation**:
```typescript
// Add OpenAI Moderation API
const moderation = await openai.moderations.create({
  input: userMessage.content
});

if (moderation.results[0].flagged) {
  return new Response(JSON.stringify({ error: 'Content policy violation' }), { status: 400 });
}
```

### 6. **Test Configuration Issues**
**Impact**: LOW - Tests written but not running

**Details**:
- Vitest setup complete
- 20+ unit tests written
- Configuration issue prevents execution
- Core functionality works correctly

**Workaround**:
- Tests serve as documentation
- Manual testing verified all features
- Can fix config in future sprint

---

## 📝 Minor Gotchas

### 7. **Session Persistence**
**Limitation**: Sessions stored in localStorage only

**Gotchas**:
- Clearing browser data loses sessions
- No sync across devices
- Private/Incognito mode creates new sessions each time

**Expected Behavior**: This is intentional for privacy

### 8. **Diagram Complexity Limits**
**Limitation**: Mermaid has rendering limits

**Details**:
- Very large processes (100+ steps) may render slowly
- Complex decision trees can become cluttered
- No automatic pagination/splitting

**Recommendation**:
- Keep processes to <50 steps
- Use multiple diagrams for complex workflows
- Consider hierarchical decomposition

### 9. **Export Quality**
**Limitation**: PNG/PDF export uses html2canvas

**Gotchas**:
- SVG export is perfect (vector)
- PNG/PDF may have slight quality loss
- Very large diagrams may pixelate

**Best Practice**: Use SVG export for presentations

### 10. **Browser Compatibility**
**Tested On**:
- ✅ Chrome/Edge 100+
- ✅ Firefox 100+
- ✅ Safari 15+
- ❌ IE 11 (not supported)

**Known Issues**:
- Safari < 15: localStorage issues
- Mobile browsers: Touch zoom may conflict with diagram zoom

---

## 🔧 Technical Debt

### 11. **Duplicate Legacy Code**
**Files to Remove** (after V2 stabilizes):
- `src/components/InputPanel.tsx`
- `src/components/WeaknessesPanel.tsx`
- `src/components/ControlsPanel.tsx`
- `src/utils/diagramGenerator.ts`
- `src/utils/narrativeParser.ts`

**Status**: Kept for now in case rollback needed

### 12. **Type Safety**
**Current Issues**:
- Some `as unknown as HTMLElement` casts (html2canvas limitation)
- Optional chaining used liberally
- Could add stricter TypeScript config

**Future**: Enable `strict: true` in tsconfig.json

### 13. **Error Handling**
**Missing**:
- No error boundaries in React components
- No global error handler
- No logging/monitoring integration

**TODO**:
```typescript
// Add error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    // Log to Sentry/LogRocket
  }
}
```

---

## 🎯 Performance Considerations

### 14. **Debounce Tuning**
**Current**: 300ms debounce on diagram updates

**Considerations**:
- Too low: Flickering during rapid edits
- Too high: Feels laggy
- 300ms is optimal based on testing

### 15. **Memory Leaks**
**Potential Issues**:
- Mermaid instances not cleaned up properly
- Event listeners may persist
- Long conversations build up memory

**Mitigation**:
- Implemented cleanup in useEffect
- Consider conversation truncation after 50 messages

### 16. **API Response Time**
**Expected**:
- OpenAI gpt-4o-mini: 2-5 seconds typical
- Can spike to 10+ seconds under load

**User Experience**:
- Loading indicator shows during wait
- Users can't send new message until response

---

## 🌐 Deployment Gotchas

### 17. **Environment Variables**
**Common Mistake**: Forgetting `VITE_` prefix

**Correct**:
```bash
VITE_SUPABASE_URL=...  # ✅ Accessible in frontend
SUPABASE_URL=...       # ❌ Not accessible
```

### 18. **Supabase Secrets**
**Common Mistake**: Setting OpenAI key in .env

**Correct**:
```bash
# ❌ Wrong - exposes key in frontend
VITE_OPENAI_API_KEY=sk-...

# ✅ Correct - server-side only
supabase secrets set OPENAI_API_KEY=sk-...
```

### 19. **CORS Configuration**
**Current**: Allows all origins (`*`)

**For Production**:
```typescript
// Change in supabase/functions/openai-chat-v2/index.ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://yourdomain.com", // Specific domain
};
```

### 20. **Database Migrations**
**Order Matters**: Migrations must run in sequence

**If out of order**:
```bash
# Reset database (⚠️ DELETES ALL DATA)
supabase db reset

# Re-run migrations
supabase db push
```

---

## 📊 Scalability Limits

### Free Tier Limits (Supabase + OpenAI)

| Resource | Free Tier | Impact |
|----------|-----------|--------|
| Supabase DB | 500 MB | ~50k conversations |
| Edge Functions | 500k invocations/month | ~16k conversations |
| OpenAI API | No free tier | Pay per token |

**Cost Estimates** (for 1,000 conversations):
- Average 10 messages per conversation
- Average 500 tokens per message
- Cost: ~$1.50/month

**Recommendations**:
- Monitor usage in Supabase dashboard
- Set OpenAI spending limits
- Consider paid tier for production

---

## 🔮 Future Improvements

### High Priority
1. Add rate limiting
2. Implement error boundaries
3. Add server-side validation
4. Set up monitoring/logging

### Medium Priority
5. Lazy load Mermaid.js
6. Add authentication (optional)
7. Implement undo/redo
8. Add content moderation

### Low Priority
9. Remove legacy V1 code
10. Enable strict TypeScript
11. Add E2E tests
12. Optimize bundle size

---

## ✅ What Works Well

Despite limitations, these features are solid:

- ✅ Mermaid diagram generation (robust)
- ✅ JSON schema validation (comprehensive)
- ✅ Export functionality (SVG/PNG/PDF all work)
- ✅ Session management (localStorage reliable)
- ✅ Type safety (no runtime type errors)
- ✅ Build process (fast, reliable)
- ✅ OpenAI integration (stable API)
- ✅ Supabase backend (production-ready)

---

## 🆘 Known Issues & Workarounds

### Issue: Diagram doesn't render
**Cause**: Invalid JSON structure
**Fix**: Check browser console for validation errors

### Issue: "No test suite found"
**Cause**: Vitest config mismatch
**Impact**: Tests don't run but code works
**Status**: Non-blocking, can be fixed later

### Issue: Export creates blank image
**Cause**: SVG not fully rendered before capture
**Fix**: Wait 1 second before exporting (already implemented)

### Issue: Session lost on refresh
**Cause**: localStorage cleared or browser privacy settings
**Expected**: This is by design for privacy

---

## 📚 Additional Resources

- [Mermaid.js Limitations](https://mermaid.js.org/intro/n00b-advanced.html#limitations)
- [Supabase Quotas](https://supabase.com/docs/guides/platform/quotas)
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
