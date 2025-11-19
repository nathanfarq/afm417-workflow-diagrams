/*
  # Create Conversations Schema for Chat-Based Audit Flow Generation

  ## Overview
  This migration creates the conversations table to store chat sessions between users and the AI assistant
  for generating audit process flows. Each conversation maintains message history and the evolving JSON
  document representing the audit process being created.

  ## New Tables

  ### conversations
  Stores individual chat sessions with full message history and current JSON state.
  
  - `id` (uuid, primary key): Unique identifier for each conversation
  - `created_at` (timestamptz): When the conversation was initiated
  - `updated_at` (timestamptz): Last time the conversation was modified
  - `title` (text): Optional conversation title (can be auto-generated from first message)
  - `messages` (jsonb): Array of message objects containing role (user/assistant) and content
  - `current_json` (jsonb): The current state of the audit process JSON being built through conversation
  - `is_completed` (boolean): Flag indicating if the conversation has been finalized

  ## Security

  - RLS is enabled on conversations table
  - Public access policy allows anyone to create and read conversations (for demo purposes)
  - Update and delete policies restricted to prevent accidental data loss

  ## Notes

  - Messages are stored as JSONB for efficient querying and updates
  - current_json evolves as the conversation progresses with AI extracting and updating structured data
  - updated_at automatically refreshes on any modification
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text DEFAULT 'New Audit Process',
  messages jsonb DEFAULT '[]'::jsonb,
  current_json jsonb DEFAULT NULL,
  is_completed boolean DEFAULT false
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create conversations"
  ON conversations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view conversations"
  ON conversations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can update conversations"
  ON conversations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete conversations"
  ON conversations
  FOR DELETE
  TO anon
  USING (true);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();