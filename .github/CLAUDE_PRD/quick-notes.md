# Quick notes from ClaudeCoding

## PRD 1
### Attempt 1
[x] Ensure testing is setup and run (skipped early in TODO).
[x] Ensure API calls and keys are not exposed. App will be added to Github and published via Bolt.new.
    [x] Add .env.local to store api keys (openai and supabase) and reference this for execution. Ensure api keys remain protected.
[] Clean up codebase by removing uncessary or unused files.
[] Review codebase for areas of improvement (.env.example, create CLAUDE.md file, update CHANGELOG.md).
[x]  Edit setup.ts - Edit failed: src/test/setup.ts
<<import '@testing-library/jest-dom/vitest';

// Mock environment variables for tests
if (typeof process !== 'undefined') {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';>>
[] Next step: enable rate limiting
[] Supabase integration?
[] Address large file load, implement dynamic loading - ask claude to clarify
[x] Adjust system prompt to only ask questions when unsure of user input or not confident in output. 
[x] UX: Allow the chat to be scrolled independently of the diagram and rest of app
