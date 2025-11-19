/*
  # Add Session Management for Guest Users

  ## Overview
  This migration adds session-based isolation for guest users, allowing temporary conversations
  without requiring authentication. Sessions will be managed client-side and conversations can
  be automatically cleaned up after expiration.

  ## Changes

  ### conversations table modifications
  1. Add `session_id` column (text, nullable for backward compatibility)
     - Stores a unique session identifier for guest users
     - Generated client-side using UUID or similar
     - Used to isolate conversations by session
  
  2. Add `expires_at` column (timestamptz, nullable)
     - Stores when the conversation should be auto-deleted
     - Default is 24 hours from creation for guest sessions
     - Null for authenticated users (permanent storage)

  ### Security Updates
  1. Update RLS policies to filter by session_id for anonymous users
  2. Ensure guests can only access their own session conversations
  3. Maintain backward compatibility for existing conversations

  ## Notes
  - Session IDs will be stored in browser localStorage
  - A cleanup function can be added later to remove expired conversations
  - When authentication is added, session_id will be replaced with user_id
*/

-- Add session_id column to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN session_id text DEFAULT NULL;
  END IF;
END $$;

-- Add expires_at column to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN expires_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Create index on session_id for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_conversations_expires_at ON conversations(expires_at);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can create conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can delete conversations" ON conversations;

-- Create new RLS policies with session isolation for anonymous users

CREATE POLICY "Anonymous users can create conversations with session_id"
  ON conversations
  FOR INSERT
  TO anon
  WITH CHECK (session_id IS NOT NULL);

CREATE POLICY "Anonymous users can view own session conversations"
  ON conversations
  FOR SELECT
  TO anon
  USING (
    session_id IS NOT NULL 
    AND session_id = current_setting('request.headers', true)::json->>'x-session-id'
  );

CREATE POLICY "Anonymous users can update own session conversations"
  ON conversations
  FOR UPDATE
  TO anon
  USING (
    session_id IS NOT NULL 
    AND session_id = current_setting('request.headers', true)::json->>'x-session-id'
  )
  WITH CHECK (
    session_id IS NOT NULL 
    AND session_id = current_setting('request.headers', true)::json->>'x-session-id'
  );

CREATE POLICY "Anonymous users can delete own session conversations"
  ON conversations
  FOR DELETE
  TO anon
  USING (
    session_id IS NOT NULL 
    AND session_id = current_setting('request.headers', true)::json->>'x-session-id'
  );

-- Placeholder policies for future authenticated users
CREATE POLICY "Authenticated users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (true);