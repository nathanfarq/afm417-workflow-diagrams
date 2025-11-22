/**
 * Rate Limiting Module for Supabase Edge Functions
 * Implements token bucket algorithm with database persistence
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// Rate limit configuration
export interface RateLimitConfig {
  maxRequests: number;      // Maximum requests per window
  windowMinutes: number;    // Time window in minutes
  endpoint: string;         // Endpoint identifier
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;      // Seconds until rate limit resets
}

// Default configuration: 20 requests per 5 minutes
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowMinutes: 5,
  endpoint: "openai-chat-v2",
};

/**
 * Check if request is within rate limit and update counter
 * @param sessionId - Client session identifier
 * @param config - Rate limit configuration (optional)
 * @returns Rate limit result with allowed status
 */
export async function checkRateLimit(
  sessionId: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize Supabase client with service role key
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase credentials not configured for rate limiting");
    // Fail open - allow request if rate limiting isn't configured
    return {
      allowed: true,
      limit: finalConfig.maxRequests,
      remaining: finalConfig.maxRequests,
      resetAt: new Date(Date.now() + finalConfig.windowMinutes * 60 * 1000),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const windowStart = new Date();
    windowStart.setMinutes(
      windowStart.getMinutes() - finalConfig.windowMinutes
    );

    // Check current rate limit for this session and endpoint
    const { data: existingLimit, error: fetchError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("session_id", sessionId)
      .eq("endpoint", finalConfig.endpoint)
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned (not an error)
      console.error("Error fetching rate limit:", fetchError);
      // Fail open
      return {
        allowed: true,
        limit: finalConfig.maxRequests,
        remaining: finalConfig.maxRequests,
        resetAt: new Date(Date.now() + finalConfig.windowMinutes * 60 * 1000),
      };
    }

    const now = new Date();

    if (existingLimit) {
      // Rate limit record exists - check if limit exceeded
      const resetAt = new Date(existingLimit.window_start);
      resetAt.setMinutes(resetAt.getMinutes() + finalConfig.windowMinutes);

      if (existingLimit.request_count >= finalConfig.maxRequests) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

        return {
          allowed: false,
          limit: finalConfig.maxRequests,
          remaining: 0,
          resetAt,
          retryAfter: Math.max(retryAfter, 0),
        };
      }

      // Increment counter
      const { error: updateError } = await supabase
        .from("rate_limits")
        .update({
          request_count: existingLimit.request_count + 1,
          updated_at: now.toISOString(),
        })
        .eq("id", existingLimit.id);

      if (updateError) {
        console.error("Error updating rate limit:", updateError);
        // Fail open
        return {
          allowed: true,
          limit: finalConfig.maxRequests,
          remaining: finalConfig.maxRequests - existingLimit.request_count,
          resetAt,
        };
      }

      return {
        allowed: true,
        limit: finalConfig.maxRequests,
        remaining: finalConfig.maxRequests - existingLimit.request_count - 1,
        resetAt,
      };
    } else {
      // No existing rate limit - create new record
      const windowStartTime = now;
      const resetAt = new Date(now);
      resetAt.setMinutes(resetAt.getMinutes() + finalConfig.windowMinutes);

      const { error: insertError } = await supabase
        .from("rate_limits")
        .insert({
          session_id: sessionId,
          endpoint: finalConfig.endpoint,
          request_count: 1,
          window_start: windowStartTime.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });

      if (insertError) {
        console.error("Error creating rate limit:", insertError);
        // Fail open
        return {
          allowed: true,
          limit: finalConfig.maxRequests,
          remaining: finalConfig.maxRequests - 1,
          resetAt,
        };
      }

      return {
        allowed: true,
        limit: finalConfig.maxRequests,
        remaining: finalConfig.maxRequests - 1,
        resetAt,
      };
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request on error
    return {
      allowed: true,
      limit: finalConfig.maxRequests,
      remaining: finalConfig.maxRequests,
      resetAt: new Date(Date.now() + finalConfig.windowMinutes * 60 * 1000),
    };
  }
}

/**
 * Get rate limit headers for HTTP response
 * @param result - Rate limit result
 * @returns Headers object with rate limit information
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.floor(result.resetAt.getTime() / 1000).toString(),
  };

  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}
