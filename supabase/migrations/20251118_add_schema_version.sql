-- Add schema_version column to conversations table for V1/V2 distinction
-- PRD Section 11: Migration Strategy

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS schema_version text DEFAULT '1.0';

-- Create index for faster queries filtering by schema version
CREATE INDEX IF NOT EXISTS idx_conversations_schema_version
ON conversations(schema_version);

-- Comment
COMMENT ON COLUMN conversations.schema_version IS 'Schema version: 1.0 for legacy ReactFlow, 2.0 for Mermaid-based';
