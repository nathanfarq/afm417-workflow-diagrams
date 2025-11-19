/**
 * Conversation Service V2
 * Handles database operations for V2 schema with versioning
 * Based on PRD Section 11: Migration Strategy
 */

import { supabase } from '../lib/supabase';
import type { ConversationV2, ChatMessage, ProcessSchema } from '../types/processSchema';
import { getOrCreateSessionId, getSessionExpiryDate } from '../utils/sessionManager';

// Schema version constant
const SCHEMA_VERSION = '2.0';

/**
 * Create a new V2 conversation
 */
export async function createConversationV2(): Promise<string> {
  const sessionId = getOrCreateSessionId();
  const expiresAt = getSessionExpiryDate();

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      title: 'New Process (V2)',
      messages: [],
      current_json: null,
      is_completed: false,
      session_id: sessionId,
      expires_at: expiresAt.toISOString(),
      schema_version: SCHEMA_VERSION, // Mark as V2
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Error creating conversation V2:', error);
    throw new Error('Failed to create conversation');
  }

  return data?.id || '';
}

/**
 * Update a V2 conversation
 */
export async function updateConversationV2(
  conversationId: string,
  messages: ChatMessage[],
  currentJSON: ProcessSchema | null
): Promise<void> {
  const updateData: Record<string, unknown> = {
    messages,
    current_json: currentJSON,
    schema_version: SCHEMA_VERSION,
  };

  // Update title if process name is available
  if (currentJSON?.processName) {
    updateData.title = currentJSON.processName;
  }

  const { error } = await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation V2:', error);
    throw new Error('Failed to update conversation');
  }
}

/**
 * Get a V2 conversation by ID
 */
export async function getConversationV2(conversationId: string): Promise<ConversationV2 | null> {
  const sessionId = getOrCreateSessionId();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('session_id', sessionId)
    .eq('schema_version', SCHEMA_VERSION) // Only V2 conversations
    .maybeSingle();

  if (error) {
    console.error('Error fetching conversation V2:', error);
    return null;
  }

  return data as ConversationV2;
}

/**
 * List all V2 conversations for the current session
 */
export async function listConversationsV2(): Promise<ConversationV2[]> {
  const sessionId = getOrCreateSessionId();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('schema_version', SCHEMA_VERSION) // Only V2 conversations
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error listing conversations V2:', error);
    return [];
  }

  return (data || []) as ConversationV2[];
}

/**
 * Delete a conversation
 */
export async function deleteConversationV2(conversationId: string): Promise<void> {
  const sessionId = getOrCreateSessionId();

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('session_id', sessionId)
    .eq('schema_version', SCHEMA_VERSION);

  if (error) {
    console.error('Error deleting conversation V2:', error);
    throw new Error('Failed to delete conversation');
  }
}
