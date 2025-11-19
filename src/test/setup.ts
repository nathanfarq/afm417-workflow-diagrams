import '@testing-library/jest-dom/vitest';

// Mock environment variables for tests
if (typeof process !== 'undefined') {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
}
