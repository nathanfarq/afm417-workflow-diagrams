# Pre-Commit Security Checklist

Run this checklist **before pushing to GitHub** to ensure no secrets are exposed.

---

## 🔒 Automated Security Check

```bash
# Run the automated security verification script
bash scripts/verify-security.sh
```

**Expected Result**: `✅ All security checks passed!`

If any checks fail, **DO NOT COMMIT** until fixed.

---

## ✅ Manual Verification Checklist

### Environment Files
- [ ] `.env.local` exists locally (with your API keys)
- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.local` is NOT staged for commit (`git status` doesn't show it)
- [ ] `.env.example` has placeholder values only (no real keys)

### API Keys
- [ ] No API keys in source code (`src/` folder)
- [ ] No `sk-proj-` patterns in committed files
- [ ] No `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` patterns (Supabase keys)
- [ ] OpenAI key is in `.env.local` (local) or Supabase secrets (production)

### Git Status
- [ ] Run `git status` - verify no `.env*` files listed
- [ ] Run `git diff --cached` - verify no API keys visible
- [ ] Run `git log --all -- .env.local` - should return nothing

### Documentation
- [ ] README updated with latest changes
- [ ] SECURITY.md reviewed
- [ ] SETUP-LOCAL.md accurate

---

## 🚨 What to Do If You Find a Secret

### If you haven't committed yet:
1. Remove the secret from the file
2. Run `git reset` to unstage
3. Add to `.gitignore` if needed

### If you already committed (but not pushed):
```bash
# Reset the last commit (keeps changes)
git reset HEAD~1

# Remove secret from files
# Re-commit without the secret
```

### If you already pushed to GitHub:
1. **Immediately rotate the exposed key** (get a new one)
2. Use BFG Repo-Cleaner to remove from history:
   ```bash
   # Install BFG
   brew install bfg  # macOS
   # or download from: https://rtyley.github.io/bfg-repo-cleaner/

   # Remove secrets from history
   bfg --replace-text passwords.txt your-repo.git

   # Force push (⚠️ WARNING: Rewrites history)
   git push --force
   ```

3. Notify team if repository is shared

---

## 📋 Quick Commands Reference

### Before Committing
```bash
# Check what's staged
git status

# View staged changes
git diff --cached

# Run security check
bash scripts/verify-security.sh

# If all good, commit
git commit -m "Your message"
```

### Verify .env.local Protection
```bash
# Should show .env.local is ignored
git check-ignore -v .env.local

# Should return nothing (not tracked)
git ls-files .env.local
```

### Search for Accidentally Committed Secrets
```bash
# Search current files
grep -r "sk-proj-" .
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" .

# Search git history
git log --all --full-history --source --pretty=format: --name-only --diff-filter=A | grep "\.env"
```

---

## ✨ Safe to Commit Indicators

You're **safe to commit** when:
- ✅ Security script passes all checks
- ✅ `git status` shows no `.env` files
- ✅ `.env.local` is in `.gitignore`
- ✅ `.env.example` has placeholders only
- ✅ No API keys in source code
- ✅ Build succeeds: `npm run build`
- ✅ TypeScript compiles: `npm run typecheck`

---

## 🎯 Final Pre-Push Command

Run these commands in order:

```bash
# 1. Security check
bash scripts/verify-security.sh

# 2. TypeScript check
npm run typecheck

# 3. Build check
npm run build

# 4. Review staged files
git diff --cached

# 5. If all pass, push
git push origin main
```

---

## 📞 Emergency Contacts

### If You Accidentally Exposed a Secret:

1. **OpenAI API Key**:
   - Revoke: https://platform.openai.com/api-keys
   - Create new key
   - Update `.env.local` and Supabase secrets

2. **Supabase Keys**:
   - Anon key is safe to expose (public by design)
   - Service role key: Reset in Supabase dashboard
   - Database password: Reset in Supabase settings

3. **Help**:
   - GitHub Docs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
   - BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/

---

## 💡 Best Practices

1. **Always run security check before pushing**
2. **Never commit `.env.local`** (it's for local use only)
3. **Use `.env.example`** as template (safe to commit)
4. **Store production secrets** in hosting platform (Vercel/Netlify) or Supabase
5. **Rotate keys regularly** (every 90 days)
6. **Review PRs carefully** for accidental secret exposure
7. **Enable GitHub secret scanning** (Settings → Security → Secret scanning)

---

## ✅ You're Ready!

If all checks pass, you're safe to:
- ✅ Commit to Git
- ✅ Push to GitHub
- ✅ Create Pull Request
- ✅ Deploy to production

**Remember**: When in doubt, run the security script! 🔒
