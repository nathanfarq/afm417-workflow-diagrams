#!/bin/bash
# Security verification script
# Run before committing to Git

echo "🔒 Security Verification Script"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any checks fail
FAILED=0

# Check 1: Verify .env.local is in .gitignore
echo "📋 Check 1: Verify .env.local is in .gitignore"
if grep -q ".env.local" .gitignore; then
    echo -e "${GREEN}✅ PASS${NC}: .env.local is in .gitignore"
else
    echo -e "${RED}❌ FAIL${NC}: .env.local NOT in .gitignore"
    FAILED=1
fi
echo ""

# Check 2: Verify .env.local exists locally
echo "📋 Check 2: Verify .env.local exists (local only)"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ PASS${NC}: .env.local exists locally"
else
    echo -e "${YELLOW}⚠️  WARN${NC}: .env.local not found (you'll need to create it)"
fi
echo ""

# Check 3: Check if .env.local has been staged for commit
echo "📋 Check 3: Verify .env.local is NOT staged for commit"
if git ls-files --error-unmatch .env.local 2>/dev/null; then
    echo -e "${RED}❌ FAIL${NC}: .env.local is tracked by Git!"
    echo "   Run: git rm --cached .env.local"
    FAILED=1
else
    echo -e "${GREEN}✅ PASS${NC}: .env.local is not tracked by Git"
fi
echo ""

# Check 4: Search for common API key patterns in staged files
echo "📋 Check 4: Search for API keys in staged files"
PATTERNS=("sk-proj-" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" "supabase.co/")

HAS_KEYS=0
for pattern in "${PATTERNS[@]}"; do
    if git diff --cached --name-only | xargs grep -l "$pattern" 2>/dev/null; then
        echo -e "${RED}❌ FAIL${NC}: Found potential API key pattern: $pattern"
        HAS_KEYS=1
        FAILED=1
    fi
done

if [ $HAS_KEYS -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: No API key patterns found in staged files"
fi
echo ""

# Check 5: Verify .env.example has no real values
echo "📋 Check 5: Verify .env.example has placeholder values only"
if grep -q "your-project-id" .env.example && grep -q "your-anon-key" .env.example; then
    echo -e "${GREEN}✅ PASS${NC}: .env.example has placeholder values"
else
    echo -e "${RED}❌ FAIL${NC}: .env.example may contain real API keys"
    FAILED=1
fi
echo ""

# Check 6: Check git history for accidentally committed .env files
echo "📋 Check 6: Check git history for .env files"
if git log --all --full-history --source --pretty=format: --name-only --diff-filter=A | grep -q "\.env$"; then
    echo -e "${YELLOW}⚠️  WARN${NC}: Found .env file in git history"
    echo "   Consider using BFG Repo-Cleaner to remove it"
else
    echo -e "${GREEN}✅ PASS${NC}: No .env files found in git history"
fi
echo ""

# Check 7: Verify supabase secrets are not in frontend code
echo "📋 Check 7: Verify OPENAI_API_KEY not in frontend env vars"
if grep -r "VITE_OPENAI_API_KEY" src/ 2>/dev/null | grep -v ".env"; then
    echo -e "${YELLOW}⚠️  WARN${NC}: VITE_OPENAI_API_KEY referenced in source code"
    echo "   This is OK for local dev, but remove for production"
else
    echo -e "${GREEN}✅ PASS${NC}: No VITE_OPENAI_API_KEY in source code"
fi
echo ""

# Final result
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    echo "   Safe to commit to Git."
    exit 0
else
    echo -e "${RED}❌ Some security checks failed!${NC}"
    echo "   Fix issues before committing."
    exit 1
fi
