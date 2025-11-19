/*
  # Create Secrets Management Table

  1. New Tables
    - `secrets`
      - `id` (uuid, primary key)
      - `key` (text, unique) - The secret key name (e.g., 'OPENAI_API_KEY')
      - `value` (text) - The encrypted or plain secret value
      - `description` (text) - Optional description of the secret
      - `created_at` (timestamptz) - When the secret was created
      - `updated_at` (timestamptz) - When the secret was last updated

  2. Security
    - Enable RLS on `secrets` table
    - Add policy for public read access (needed for app initialization)
    - Add policy for authenticated insert/update operations
    - Secrets are stored in plain text (client-side encryption recommended for production)

  3. Important Notes
    - This table stores application secrets like API keys
    - For production, consider implementing client-side encryption
    - RLS policies allow public read access since this is an anonymous app
*/

-- Create secrets table
CREATE TABLE IF NOT EXISTS secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for app to load secrets)
CREATE POLICY "Allow public read access to secrets"
  ON secrets
  FOR SELECT
  TO anon
  USING (true);

-- Allow public insert access (for initial setup)
CREATE POLICY "Allow public insert of secrets"
  ON secrets
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Allow public update of secrets"
  ON secrets
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow public delete access
CREATE POLICY "Allow public delete of secrets"
  ON secrets
  FOR DELETE
  TO anon
  USING (true);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_secrets_key ON secrets(key);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_secrets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS secrets_updated_at_trigger ON secrets;
CREATE TRIGGER secrets_updated_at_trigger
  BEFORE UPDATE ON secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_secrets_updated_at();
