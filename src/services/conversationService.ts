import { supabase } from '../lib/supabase';
import type { Conversation, ChatMessage, AuditProcessJSON } from '../types/auditProcess';
import { getOrCreateSessionId, getSessionExpiryDate } from '../utils/sessionManager';

export async function createConversation(): Promise<string> {
  const sessionId = getOrCreateSessionId();
  const expiresAt = getSessionExpiryDate();

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      title: 'New Audit Process',
      messages: [],
      current_json: null,
      is_completed: false,
      session_id: sessionId,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Error creating conversation:', error);
    throw new Error('Failed to create conversation');
  }

  return data?.id || '';
}

export async function updateConversation(
  conversationId: string,
  messages: ChatMessage[],
  currentJSON: AuditProcessJSON | null
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({
      messages,
      current_json: currentJSON,
    })
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation:', error);
    throw new Error('Failed to update conversation');
  }
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const sessionId = getOrCreateSessionId();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }

  return data as Conversation;
}

export async function listConversations(): Promise<Conversation[]> {
  const sessionId = getOrCreateSessionId();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error listing conversations:', error);
    return [];
  }

  return (data || []) as Conversation[];
}
