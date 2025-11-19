# Claude AI Development Guide

This document provides guidance for AI assistants (Claude) working on this codebase.

## Project Overview

**AI-Powered Process Builder V2** is a full-stack web application that transforms natural language process descriptions into professional Mermaid swimlane diagrams using OpenAI GPT-4o-mini.

### Key Technologies
- **Frontend**: React 18.3 + TypeScript 5.5 + Vite 7.2
- **Diagram Engine**: Mermaid.js 11.12 (V2 Primary) / ReactFlow 11.11 (V1 Legacy)
- **AI**: OpenAI GPT-4o-mini
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Styling**: Tailwind CSS 3.4
- **Testing**: Vitest 4.0 + @testing-library/react

## Codebase Structure

### Core Directories

```
src/
├── components/
│   ├── ChatInterfaceV2.tsx      # V2 Primary - Mermaid-based chat UI
│   ├── MermaidRenderer.tsx      # V2 Primary - Mermaid diagram renderer
│   ├── ChatInterface.tsx        # V1 Legacy - ReactFlow-based chat
│   └── DiagramCanvas.tsx        # V1 Legacy - ReactFlow renderer
├── services/
│   ├── openai-v2.ts             # V2 Primary - OpenAI service
│   ├── conversationServiceV2.ts # V2 Primary - Database service
│   ├── openai.ts                # V1 Legacy
│   └── conversationService.ts   # V1 Legacy
├── utils/
│   ├── mermaidGenerator.ts      # V2 Primary - JSON to Mermaid converter
│   ├── sessionManager.ts        # Session handling (both versions)
│   ├── diagramGenerator.ts      # V1 Legacy
│   ├── narrativeParser.ts       # V1 Legacy
│   └── jsonToDiagram.ts         # V1 Legacy
├── types/
│   ├── processSchema.ts         # V2 Primary - TypeScript types
│   └── auditProcess.ts          # V1 Legacy
├── lib/
│   └── supabase.ts              # Supabase client configuration
├── test/
│   └── setup.ts                 # Vitest configuration
├── AppV2.tsx                    # V2 Primary application
├── App.tsx                      # V1 Legacy application
└── main.tsx                     # Router entry point
```

### Important Files

- **Entry Point**: [main.tsx](src/main.tsx) - React Router setup with V1/V2 routes
- **V2 App**: [AppV2.tsx](src/AppV2.tsx) - Main V2 application component
- **V1 App**: [App.tsx](src/App.tsx) - Legacy V1 application (backward compatibility)
- **Environment**: [.env.example](.env.example) - Environment variable template
- **Config**: [vite.config.ts](vite.config.ts), [tsconfig.json](tsconfig.json), [eslint.config.js](eslint.config.js)

## Development Guidelines

### 1. V1 vs V2 Architecture

**IMPORTANT**: This project maintains two parallel implementations:

- **V2 (Primary)**: Mermaid.js-based, actively developed
  - Route: `/` and `/v2`
  - Uses: `ChatInterfaceV2`, `MermaidRenderer`, `openai-v2.ts`, `conversationServiceV2.ts`
  - Schema: `processSchema.ts` (V2 JSON schema)

- **V1 (Legacy)**: ReactFlow-based, maintained for backward compatibility
  - Route: `/v1`
  - Uses: `ChatInterface`, `DiagramCanvas`, `openai.ts`, `conversationService.ts`
  - Schema: `auditProcess.ts` (V1 JSON schema)

**Guidelines**:
- Prefer V2 for new features
- Don't remove V1 files (needed for backward compatibility)
- V1 and V2 share some utilities (e.g., `sessionManager.ts`)

### 2. Code Style

- **TypeScript**: Strict mode enabled, avoid `any` types
- **React**: Functional components with hooks only
- **Imports**: Use relative paths, no path aliases configured
- **Formatting**: ESLint configured with React hooks rules
- **Naming**:
  - Components: PascalCase (e.g., `ChatInterfaceV2.tsx`)
  - Services: camelCase (e.g., `conversationServiceV2.ts`)
  - Types: PascalCase (e.g., `ProcessSchema`)

### 3. Testing

**Test Framework**: Vitest 4.0 with @testing-library/react

**Existing Tests**:
- [src/utils/mermaidGenerator.test.ts](src/utils/mermaidGenerator.test.ts) - Mermaid generation tests
- [src/services/openai-v2.test.ts](src/services/openai-v2.test.ts) - OpenAI service tests

**Test Commands**:
```bash
npm test              # Run tests in watch mode
npm run test:ui       # Run with Vitest UI
npm run test:run      # Run once (CI mode)
npm run test:coverage # Generate coverage report
```

**Known Issue**: Test configuration needs TypeScript path resolution fixes. Tests are comprehensive but may not execute properly. See [Known Limitations](#known-limitations).

### 4. Environment Variables

**Required Environment Variables**:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-your-key  # LOCAL TESTING ONLY
```

**Important**:
- Copy [.env.example](.env.example) to `.env.local` for local development
- NEVER commit `.env.local` (it's in `.gitignore`)
- For production, set `OPENAI_API_KEY` in Supabase Edge Function secrets (NOT frontend)
- `VITE_` prefix exposes variables to frontend (public)

### 5. Database Schema

**Tables**:
- `conversations` - Chat history with session-based isolation
- `audit_process_schema` - V1 legacy process storage
- Schema migrations in [supabase/migrations/](supabase/migrations/)

**Row Level Security**:
- Session-based isolation using `session_id`
- Auto-expire conversations after 30 days
- No authentication required (anonymous access)

### 6. Edge Functions

**V2 Primary**: [supabase/functions/openai-chat-v2/](supabase/functions/openai-chat-v2/)
- Model: GPT-4o-mini
- Purpose: Generate JSON process schemas from natural language
- Endpoint: `https://[project-ref].supabase.co/functions/v1/openai-chat-v2`

**V1 Legacy**: [supabase/functions/openai-chat/](supabase/functions/openai-chat/)
- Model: o1-mini
- Purpose: Legacy ReactFlow diagram generation

**Deployment Instructions**:

The Edge Functions must be deployed to Supabase to work. Use `npx` if you don't have Supabase CLI installed globally:

```bash
# 1. Login to Supabase (opens browser for authentication)
npx supabase login

# 2. Link to your project (replace with your project reference)
npx supabase link --project-ref your-project-ref

# 3. Deploy the Edge Function
npx supabase functions deploy openai-chat-v2

# 4. Set OpenAI API key in Supabase secrets (server-side only)
npx supabase secrets set OPENAI_API_KEY=sk-your-key

# 5. Apply database migrations
npx supabase db push
```

**Important Notes**:
- You do NOT need Docker for remote deployment (only for local development)
- Skip `supabase status` command if you get Docker errors - it's only for local development
- The `npx` prefix allows running Supabase CLI without global installation
- Session persists after login - you won't need to re-authenticate frequently
- Edge Function deployment is permanent until you explicitly delete or redeploy

## Common Tasks

### Adding a New Feature

1. **Determine Version**: Add to V2 unless it's a V1 bugfix
2. **Create Component**: Add to [src/components/](src/components/)
3. **Add Types**: Update [src/types/processSchema.ts](src/types/processSchema.ts)
4. **Write Tests**: Add corresponding `.test.ts` file
5. **Update Documentation**: Update [README.md](README.md) if user-facing

### Fixing a Bug

1. **Identify Version**: Check if bug is in V1 or V2
2. **Write Test**: Add failing test case first (TDD)
3. **Fix Code**: Implement fix
4. **Verify**: Run tests and manual testing
5. **Update Docs**: Update [CHANGELOG.md](CHANGELOG.md)

### Modifying Diagram Output

1. **V2 (Mermaid)**: Edit [src/utils/mermaidGenerator.ts](src/utils/mermaidGenerator.ts)
2. **V1 (ReactFlow)**: Edit [src/utils/diagramGenerator.ts](src/utils/diagramGenerator.ts)
3. **Schema Changes**: Update [src/types/processSchema.ts](src/types/processSchema.ts) or [src/types/auditProcess.ts](src/types/auditProcess.ts)
4. **AI Prompt**: Modify Edge Function system prompts in [supabase/functions/](supabase/functions/)

### Refactoring Code

1. **Don't Break V1**: Ensure backward compatibility
2. **Run Tests**: `npm run test:run` before and after
3. **Check Builds**: `npm run build` must succeed
4. **Type Safety**: `npm run typecheck` must pass
5. **Lint**: `npm run lint` must pass

## Security Considerations

### API Key Protection
- OpenAI key stored in Supabase secrets (server-side)
- Never expose OpenAI key in frontend code
- Supabase anon key is safe to expose (designed for public use)

### Known Security Gaps
1. **No Rate Limiting**: Anyone can spam OpenAI API (cost risk)
2. **No Authentication**: Anonymous access allowed (privacy-friendly but risky)
3. **Client-Side Validation Only**: Malicious users could bypass
4. **CORS Set to `*`**: Allows all origins

See [.github/MARKDOWNS/SECURITY.md](.github/MARKDOWNS/SECURITY.md) for mitigation strategies.

## Known Limitations

### High Priority
1. **No Authentication**: Anyone can use the service
   - Recommendation: Add Supabase Auth for production
   - Note: Rate limiting (20 req/5min per session) provides some protection

### Medium Priority
2. **Test Configuration Issues**: Tests written but may not execute
   - Issue: TypeScript path resolution in Vitest config
   - Workaround: Manual testing works fine

3. **No Error Boundaries**: React errors could crash entire app
   - Recommendation: Add error boundaries in production

4. **Client-Side Validation Only**: Security vulnerability
   - Recommendation: Add server-side validation in Edge Functions

### Resolved/Implemented
- ✅ **Rate Limiting**: Implemented with database-backed token bucket (20 req/5min per session)
- ✅ **Large Bundle Size**: Reduced from 2MB to ~500KB via lazy loading Mermaid.js (75% reduction)

## Troubleshooting

### Build Fails
```bash
# Check TypeScript errors
npm run typecheck

# Check linting
npm run lint

# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

### Tests Don't Run
- Known issue with Vitest configuration
- Tests are comprehensive but may not execute
- Workaround: Manual testing or fix TypeScript config

### Supabase Connection Issues

**"OpenAI Setup Issue: Failed to fetch" Error**

This error occurs when the Edge Function is not deployed to Supabase. To fix:

```bash
# 1. Login to Supabase
npx supabase login

# 2. Link to your project
npx supabase link --project-ref your-project-ref

# 3. Deploy the Edge Function
npx supabase functions deploy openai-chat-v2

# 4. Set OpenAI API key
npx supabase secrets set OPENAI_API_KEY=sk-your-key

# 5. Apply database migrations
npx supabase db push
```

**Note**: You do NOT need Docker for deployment. Skip `npx supabase status` if you see Docker errors.

**Other Connection Issues**:
```bash
# Verify environment variables
cat .env.local

# Verify Edge Function is deployed (via Supabase dashboard)
# Go to: https://supabase.com/dashboard/project/[your-ref]/functions

# Check if secret is set (via Supabase dashboard)
# Go to: https://supabase.com/dashboard/project/[your-ref]/settings/vault
```

### Diagram Rendering Issues
- Check browser console for Mermaid errors
- Verify JSON schema matches [src/types/processSchema.ts](src/types/processSchema.ts)
- Test with simple process first

## Deployment Checklist

Before deploying to production:

1. Security
   - [ ] Implement rate limiting
   - [ ] Add authentication (optional)
   - [ ] Set CORS to specific domain
   - [ ] Add server-side validation
   - [ ] Review [SECURITY.md](.github/MARKDOWNS/SECURITY.md)

2. Performance
   - [ ] Lazy load Mermaid.js
   - [ ] Enable code splitting
   - [ ] Optimize bundle size
   - [ ] Add error boundaries

3. Testing
   - [ ] Fix Vitest configuration
   - [ ] Run full test suite
   - [ ] Manual testing on production build

4. Documentation
   - [ ] Update [CHANGELOG.md](CHANGELOG.md)
   - [ ] Update [README.md](README.md)
   - [ ] Review [DEPLOYMENT.md](.github/MARKDOWNS/DEPLOYMENT.md)

## Resources

### Documentation
- [README.md](README.md) - Project overview and setup
- [DEPLOYMENT.md](.github/MARKDOWNS/DEPLOYMENT.md) - Deployment guide
- [SECURITY.md](.github/MARKDOWNS/SECURITY.md) - Security considerations
- [LIMITATIONS.md](.github/MARKDOWNS/LIMITATIONS.md) - Known limitations
- [SETUP-LOCAL.md](.github/MARKDOWNS/SETUP-LOCAL.md) - Local setup guide

### PRD & Design Docs
- [process-diagram-generation-prd1.md](.github/CLAUDE_PRD/process-diagram-generation-prd1.md) - Product requirements
- [quick-notes.md](.github/CLAUDE_PRD/quick-notes.md) - Development notes

### External Links
- [Mermaid.js Docs](https://mermaid.js.org/)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [Vitest Docs](https://vitest.dev/)

## Contributing

When working on this codebase:

1. Read [README.md](README.md) for project overview
2. Review this CLAUDE.md for development guidelines
3. Check [CHANGELOG.md](CHANGELOG.md) for recent changes
4. Follow existing code patterns and style
5. Write tests for new features
6. Update documentation as needed

## Questions?

- Check [.github/CLAUDE_PRD/](`.github/CLAUDE_PRD/`) for product requirements
- Review [LIMITATIONS.md](.github/MARKDOWNS/LIMITATIONS.md) for known issues
- Check [GitHub Issues](https://github.com/nathanfarq/afm417-workflow-diagrams/issues)
