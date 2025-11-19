-- Rate Limiting Table for Edge Functions
-- Track API usage per session to prevent abuse

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by session and endpoint
CREATE INDEX IF NOT EXISTS idx_rate_limits_session_endpoint
    ON rate_limits(session_id, endpoint, window_start DESC);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
    ON rate_limits(window_start);

-- Row Level Security (RLS)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Edge Functions to read/write rate limit data
-- Note: This uses service_role access, not user-facing policies
CREATE POLICY "Service role can manage rate limits"
    ON rate_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to clean up old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- Optional: Create a cron job to run cleanup (requires pg_cron extension)
-- Uncomment if you have pg_cron enabled:
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT cleanup_old_rate_limits()');

-- Comments for documentation
COMMENT ON TABLE rate_limits IS 'Tracks API request counts per session for rate limiting';
COMMENT ON COLUMN rate_limits.session_id IS 'Client session identifier from localStorage';
COMMENT ON COLUMN rate_limits.endpoint IS 'API endpoint being rate limited (e.g., openai-chat-v2)';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in current time window';
COMMENT ON COLUMN rate_limits.window_start IS 'Start time of current rate limit window';
