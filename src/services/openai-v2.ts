/**
 * OpenAI Service for V2 (Mermaid-based) implementation
 * Uses new ProcessSchema and handles <UPDATED>/<UNCHANGED> tags
 * Based on PRD Section 2.3 and 5.2
 */

import type { ChatMessage, ProcessSchema } from '../types/processSchema';
import { isProcessSchema } from '../types/processSchema';
import { getOrCreateSessionId } from '../utils/sessionManager';

interface OpenAIResponse {
  content: string;
  extractedJSON: ProcessSchema | null;
  updated: boolean; // Whether JSON was marked as updated
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
}

/**
 * Strip JSON code fence from content to get only visible text for user
 * The JSON is extracted separately for diagram generation
 */
function stripJSONFromContent(content: string): string {
  // Remove JSON code fences and their content (including tags)
  // Pattern matches: ```json <UPDATED> or ```json followed by JSON content and closing ```
  const withoutJSON = content.replace(/```json\s*(?:<UPDATED>|<UNCHANGED>)?\s*\n[\s\S]*?\n```/g, '').trim();

  return withoutJSON;
}

/**
 * Extract JSON from assistant response with <UPDATED>/<UNCHANGED> tag detection
 * PRD Section 2.3: "Include <UPDATED> tag when JSON changes"
 */
export function extractJSON(content: string): { json: ProcessSchema | null; updated: boolean } {
  // Look for <UPDATED> or <UNCHANGED> tags
  const hasUpdatedTag = content.includes('<UPDATED>');
  const hasUnchangedTag = content.includes('<UNCHANGED>');

  // Extract JSON from code fence
  const jsonMatch = content.match(/```json\s*(?:<UPDATED>)?\s*\n([\s\S]*?)\n```/);

  if (!jsonMatch) {
    return { json: null, updated: hasUpdatedTag };
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);

    // Validate schema structure
    if (!isProcessSchema(parsed)) {
      console.error('Extracted JSON does not match ProcessSchema structure');
      return { json: null, updated: false };
    }

    // If <UPDATED> tag present, definitely updated
    // If no tag but JSON exists, assume updated (for backward compatibility)
    const updated = hasUpdatedTag || (!hasUnchangedTag && parsed !== null);

    return { json: parsed, updated };
  } catch (error) {
    console.error('Failed to parse JSON from assistant response:', error);

    // Attempt auto-repair for common issues (PRD Section 7.2)
    try {
      const repairedJson = attemptJSONRepair(jsonMatch[1]);
      const parsed = JSON.parse(repairedJson);

      if (isProcessSchema(parsed)) {
        console.log('Successfully repaired malformed JSON');
        return { json: parsed, updated: hasUpdatedTag };
      }
    } catch (repairError) {
      console.error('JSON repair failed:', repairError);
    }

    return { json: null, updated: false };
  }
}

/**
 * Attempt to repair common JSON syntax errors
 * PRD Section 7.2: "Attempt auto-repair (common issues: trailing commas, unquoted keys)"
 */
function attemptJSONRepair(jsonString: string): string {
  let repaired = jsonString;

  // Remove trailing commas before closing braces/brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // Remove comments (// and /* */)
  repaired = repaired.replace(/\/\/.*$/gm, '');
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');

  return repaired;
}

/**
 * Send message to OpenAI Edge Function V2
 * PRD Section 4.2: API Integration
 */
export async function sendMessage(
  messages: ChatMessage[],
  currentJSON: ProcessSchema | null
): Promise<OpenAIResponse> {
  console.log('OpenAI V2 service - Starting sendMessage');
  console.log('Messages count:', messages.length);
  console.log('Has current JSON:', !!currentJSON);

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-chat-v2`;
    const sessionId = getOrCreateSessionId();

    console.log('Calling Edge Function V2:', apiUrl);
    console.log('Session ID:', sessionId);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({
        messages,
        currentJSON,
        sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Edge Function error:', errorData);

      // Handle rate limit error specifically
      if (response.status === 429) {
        const retryAfter = errorData.resetAt
          ? Math.ceil((new Date(errorData.resetAt).getTime() - Date.now()) / 1000)
          : errorData.retryAfter || 60;
        throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
      }

      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Edge Function V2 response received');

    // Log rate limit info
    if (data.rateLimit) {
      console.log('Rate limit:', data.rateLimit);
      console.log(`Remaining requests: ${data.rateLimit.remaining}/${data.rateLimit.limit}`);
    }

    const assistantMessage = data.content || '';
    const { json: extractedJSON, updated } = extractJSON(assistantMessage);

    console.log('Assistant response length:', assistantMessage.length);
    console.log('Extracted JSON:', !!extractedJSON);
    console.log('JSON updated:', updated);

    // Strip JSON code fence from visible content (keep only text for user)
    const visibleContent = stripJSONFromContent(assistantMessage);

    // If assistant indicates error, prompt for correction (PRD Section 7.2)
    if (!extractedJSON && assistantMessage.toLowerCase().includes('json') && assistantMessage.toLowerCase().includes('error')) {
      console.warn('Assistant reported JSON error, may need correction');
    }

    return {
      content: visibleContent, // Return cleaned content without JSON
      extractedJSON: updated ? extractedJSON : null, // Only return if marked as updated
      updated,
      rateLimit: data.rateLimit,
    };
  } catch (error: unknown) {
    console.error('OpenAI V2 API Error:', error);
    const errorObj = error as { message?: string };
    console.error('Error message:', errorObj?.message);
    throw error;
  }
}

/**
 * Test OpenAI V2 connection
 */
export async function testOpenAIConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const testMessages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Test connection. Just respond with "Connection successful"'
      }
    ];

    await sendMessage(testMessages, null);

    return {
      success: true,
      message: 'OpenAI V2 connection successful'
    };
  } catch (error) {
    const errorObj = error as { message?: string };
    return {
      success: false,
      message: errorObj?.message || 'OpenAI V2 connection failed'
    };
  }
}
