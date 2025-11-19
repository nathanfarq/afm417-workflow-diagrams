# Local Development Setup

Quick guide to get the project running locally with your API keys.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables
```bash
# Create .env.local from template
cp .env.example .env.local
```

### Step 3: Add Your API Keys to `.env.local`

Open `.env.local` in your editor and replace the placeholder values:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration (for local testing)
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

#### Where to Get Your Keys:

**Supabase Keys:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

**OpenAI API Key:**
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **+ Create new secret key**
3. Copy the key → `VITE_OPENAI_API_KEY`
4. ⚠️ **Important**: This is for LOCAL TESTING only. For production, set in Supabase secrets.

### Step 4: Run the App
```bash
npm run dev
```

Open [http://localhost:5173/v2](http://localhost:5173/v2) in your browser.

---

## ✅ Verification

### Test the Setup:

1. **Check V2 loads**: Navigate to `/v2` route
2. **Test AI chat**: Send a message like "Help me document a process"
3. **Verify response**: AI should respond with questions
4. **Check console**: No API errors

### Common Issues:

#### Issue: "OPENAI_API_KEY is not configured"
**Solution**: Check that you set `VITE_OPENAI_API_KEY` in `.env.local` (with VITE_ prefix for local dev)

#### Issue: "Failed to fetch"
**Solution**:
1. Verify Supabase URL and anon key are correct
2. Check if Supabase project is active
3. Ensure no typos in `.env.local`

#### Issue: Environment variables not loading
**Solution**:
1. Restart dev server (`Ctrl+C` then `npm run dev`)
2. Verify file is named `.env.local` (not `.env.local.txt`)
3. Check that values don't have quotes: `VITE_KEY=value` not `VITE_KEY="value"`

---

## 🔒 Security Checklist

- [ ] `.env.local` file created
- [ ] API keys added to `.env.local`
- [ ] Verified `.env.local` is in `.gitignore` (line 25)
- [ ] Never committed `.env.local` to Git
- [ ] Using VITE_ prefix for frontend variables
- [ ] Understand OpenAI key is for LOCAL TESTING only

---

## 🎯 Next Steps

### For Local Development:
- ✅ You're all set! Start coding.
- ℹ️ OpenAI calls go through frontend (testing only)
- ℹ️ No database migrations needed for local testing

### For Production Deployment:
1. **Remove** `VITE_OPENAI_API_KEY` from environment variables
2. **Set** OpenAI key in Supabase secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-key-here
   ```
3. **Deploy** Edge Function:
   ```bash
   supabase functions deploy openai-chat-v2
   ```
4. **Configure** hosting platform with VITE_SUPABASE_* variables only

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production deployment guide.

---

## 🧪 Testing Your Setup

### Manual Test Script:

1. **Start dev server**: `npm run dev`
2. **Open V2**: [http://localhost:5173/v2](http://localhost:5173/v2)
3. **Send message**: "I want to document an expense approval process"
4. **Verify AI responds**: Should ask clarifying questions
5. **Check diagram**: Should see empty state initially
6. **Continue conversation**: Provide process details
7. **Watch diagram build**: Should render in real-time
8. **Test export**: Click SVG/PNG/PDF buttons
9. **Test JSON**: Click download JSON button
10. **Test Start Over**: Should reset everything

### Expected Behavior:
- ✅ Chat interface loads
- ✅ AI responds within 2-5 seconds
- ✅ Diagram updates automatically
- ✅ Export buttons work
- ✅ No console errors

---

## 📁 File Structure

```
your-project/
├── .env.local          # ← Your API keys (NOT committed)
├── .env.example        # ← Template (safe to commit)
├── .gitignore          # ← Protects .env.local
├── src/
│   └── ...
└── supabase/
    └── ...
```

---

## 💡 Pro Tips

1. **Use VSCode**: Install "DotENV" extension for syntax highlighting
2. **Backup keys**: Save API keys in password manager
3. **Multiple projects**: Use separate `.env.local` per project
4. **Team setup**: Share `.env.example`, never share `.env.local`
5. **Key rotation**: Update keys periodically for security

---

## 🆘 Still Having Issues?

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) - Troubleshooting section
2. Review [SECURITY.md](SECURITY.md) - Security best practices
3. See [LIMITATIONS.md](LIMITATIONS.md) - Known issues
4. Open GitHub issue with error details

---

## ✨ You're Ready!

Your local environment is configured. Start building amazing process diagrams! 🚀

**Quick commands:**
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run typecheck` - Check TypeScript
- `npm test` - Run tests
