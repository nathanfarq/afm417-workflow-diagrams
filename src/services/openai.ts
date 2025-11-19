import type { ChatMessage, AuditProcessJSON } from '../types/auditProcess';


export function extractJSON(content: string): AuditProcessJSON | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed as AuditProcessJSON;
    } catch (error) {
      console.error('Failed to parse JSON from assistant response:', error);
      return null;
    }
  }

  return null;
}

export async function sendMessage(
  messages: ChatMessage[],
  currentJSON: AuditProcessJSON | null
): Promise<{ content: string; extractedJSON: AuditProcessJSON | null }> {
  console.log('OpenAI service - Starting sendMessage');
  console.log('Messages count:', messages.length);
  console.log('Has current JSON:', !!currentJSON);

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-chat`;

    console.log('Calling Edge Function:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        currentJSON,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Edge Function error:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Edge Function response received');

    const assistantMessage = data.content || '';
    const extractedJSON = extractJSON(assistantMessage);

    console.log('Assistant response length:', assistantMessage.length);
    console.log('Extracted JSON:', !!extractedJSON);

    return {
      content: assistantMessage,
      extractedJSON,
    };
  } catch (error: unknown) {
    console.error('OpenAI API Error:', error);
    const errorObj = error as { message?: string };
    console.error('Error message:', errorObj?.message);
    throw error;
  }
}
