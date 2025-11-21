/**
 * AppV2 - Main component for Process Builder V2
 * Mermaid-based diagram generation with new JSON schema
 * Based on PRD complete rewrite specification
 */

import { useState, useEffect, useCallback } from 'react';
import ChatInterfaceV2 from './components/ChatInterfaceV2';
import { MermaidRendererLazy } from './components/MermaidRendererLazy';
import ControlsRisksSummary from './components/ControlsRisksSummary';
import { sendMessage, testOpenAIConnection } from './services/openai-v2';
import { createConversationV2, updateConversationV2 } from './services/conversationServiceV2';
import type { ChatMessage, ProcessSchema } from './types/processSchema';
import { v4 as uuidv4 } from 'uuid';

// Debounce hook for diagram updates (PRD Section 3.1: 300ms debounce)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function AppV2() {
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentJSON, setCurrentJSON] = useState<ProcessSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debounce currentJSON updates to prevent flicker (PRD Section 3.1)
  const debouncedJSON = useDebounce(currentJSON, 300);

  // Initialize conversation and test connection
  useEffect(() => {
    const initConversation = async () => {
      const testResult = await testOpenAIConnection();
      console.log('OpenAI V2 Connection Test:', testResult);

      if (!testResult.success) {
        console.error('OpenAI V2 connection test failed:', testResult.message);
        alert(`OpenAI Setup Issue: ${testResult.message}`);
      }

      const id = await createConversationV2();
      setConversationId(id);
    };
    initConversation();
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async (message: string) => {
    setIsLoading(true);

    const userMessage: ChatMessage = { role: 'user', content: message };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      console.log('Sending message to OpenAI V2 Edge Function...');

      const response = await sendMessage(updatedMessages, currentJSON);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Only update JSON if marked as updated (PRD Section 2.3)
      if (response.updated && response.extractedJSON) {
        // Ensure processId and lastUpdated are set
        const processJson: ProcessSchema = {
          ...response.extractedJSON,
          processId: response.extractedJSON.processId || uuidv4(),
          lastUpdated: new Date().toISOString(),
        };
        setCurrentJSON(processJson);

        // Save to database
        if (conversationId) {
          await updateConversationV2(conversationId, finalMessages, processJson);
        }
      } else if (response.updated) {
        // Updated but no JSON - save messages only
        if (conversationId) {
          await updateConversationV2(conversationId, finalMessages, currentJSON);
        }
      }
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      const errorObj = error as {
        message?: string;
        status?: number;
        type?: string;
        response?: { data?: unknown };
      };
      console.error('Error details:', {
        message: errorObj?.message,
        status: errorObj?.status,
        type: errorObj?.type,
        response: errorObj?.response?.data,
      });

      let errorText = 'Sorry, I encountered an error processing your message. Please try again.';

      if (errorObj?.message) {
        errorText = errorObj.message;
      }

      if (errorObj?.message?.includes('API key')) {
        errorText += '\n\nPlease check that your OpenAI API key is correctly configured in Supabase secrets.';
      }

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: errorText,
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentJSON, conversationId]);

  // Handle Start Over (PRD Section 6.2)
  const handleStartOver = useCallback(async () => {
    setMessages([]);
    setCurrentJSON(null);

    // Create new conversation
    const id = await createConversationV2();
    setConversationId(id);
  }, []);

  // Handle JSON Download
  const handleJSONDownload = useCallback(() => {
    if (!currentJSON) return;

    const dataStr = JSON.stringify(currentJSON, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentJSON.processName || 'process'}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [currentJSON]);

  // Handle JSON Upload
  const handleJSONUpload = useCallback(async (json: ProcessSchema) => {
    try {
      // Validate basic structure
      if (!json.processName || !json.actors || !json.steps) {
        alert('Invalid JSON structure. Please ensure it matches the ProcessSchema format.');
        return;
      }

      // Set uploaded JSON
      setCurrentJSON(json);

      // Add system message about upload
      const uploadMessage: ChatMessage = {
        role: 'assistant',
        content: `Process "${json.processName}" loaded successfully! You can now ask me questions or request changes to this process.`
      };
      setMessages([uploadMessage]);

      // Save to database
      if (conversationId) {
        await updateConversationV2(conversationId, [uploadMessage], json);
      }
    } catch (error) {
      console.error('Error uploading JSON:', error);
      alert('Failed to upload JSON. Please check the file format.');
    }
  }, [conversationId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Visual Flow Assistant
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Conversational process mapping with diagram generation
              </p>
            </div>
            {currentJSON && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Process</p>
                <p className="text-lg font-semibold text-gray-900">{currentJSON.processName}</p>
                <p className="text-xs text-gray-500">
                  {currentJSON.steps.length} steps · {currentJSON.actors.length} actors
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-6 h-[calc(100vh-180px)]">
          {/* Chat Interface - Independent scrolling */}
          <div className="h-full overflow-hidden">
            <ChatInterfaceV2
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              currentJSON={currentJSON}
              onStartOver={handleStartOver}
              onJSONDownload={handleJSONDownload}
              onJSONUpload={handleJSONUpload}
            />
          </div>

          {/* Diagram Canvas - Independent scrolling */}
          <div className="h-full overflow-hidden">
            <MermaidRendererLazy
              processJson={debouncedJSON}
              onNodeClick={(nodeId) => {
                console.log('Node clicked:', nodeId);
                // TODO: Highlight node in JSON or show details
              }}
            />
          </div>
        </div>

        {/* Controls and Risks Summary - Full width below chat and diagram */}
        {currentJSON && (currentJSON.controls.length > 0 || currentJSON.risks.length > 0) && (
          <div className="mt-6">
            <ControlsRisksSummary processJson={currentJSON} />
          </div>
        )}
      </main>

      {/* Legend */}
      {currentJSON && currentJSON.steps.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs text-gray-600 max-w-xs">
          <div className="font-semibold mb-2">Legend:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-gray-600"></div>
              <span>Start/End</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-gray-600"></div>
              <span>Action</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-600 transform rotate-45"></div>
              <span>Decision</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-600"></div>
              <span>Has Controls</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border-2 border-orange-600"></div>
              <span>Has Risks</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppV2;
