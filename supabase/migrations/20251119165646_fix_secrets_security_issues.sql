/*
  # Fix Secrets Table Security Issues

  1. Changes
    - Remove unused index `idx_secrets_key` (key column already has unique constraint)
    - Fix function search_path mutability by setting explicit search_path

  2. Security Improvements
    - Function now has immutable search_path to prevent search_path injection attacks
    - Removed redundant index that was never used
*/

-- Drop the unused index on secrets.key
-- The unique constraint already provides indexing
DROP INDEX IF EXISTS idx_secrets_key;

-- Recreate the function with explicit search_path
DROP FUNCTION IF EXISTS update_secrets_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_secrets_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS secrets_updated_at_trigger ON secrets;
CREATE TRIGGER secrets_updated_at_trigger
  BEFORE UPDATE ON secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_secrets_updated_at();
