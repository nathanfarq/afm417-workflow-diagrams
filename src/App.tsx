import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import { DiagramCanvas } from './components/DiagramCanvas';
import { Node, Edge } from 'reactflow';
import { sendMessage } from './services/openai';
import { createConversation, updateConversation } from './services/conversationService';
import { convertJSONToDiagram } from './utils/jsonToDiagram';
import { testOpenAIConnection } from './services/testOpenAI';
import type { ChatMessage, AuditProcessJSON } from './types/auditProcess';

function App() {
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentJSON, setCurrentJSON] = useState<AuditProcessJSON | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [, setSwimlanes] = useState<Array<{ id: string; name: string; y: number; height: number; color: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initConversation = async () => {
      const testResult = await testOpenAIConnection();
      console.log('OpenAI Connection Test:', testResult);

      if (!testResult.success) {
        console.error('OpenAI connection test failed:', testResult.message);
        alert(`OpenAI Setup Issue: ${testResult.message}`);
      }

      const id = await createConversation();
      setConversationId(id);
    };
    initConversation();
  }, []);

  useEffect(() => {
    if (currentJSON) {
      const diagram = convertJSONToDiagram(currentJSON);
      setNodes(diagram.nodes);
      setEdges(diagram.edges);
      setSwimlanes(diagram.swimlanes);
    }
  }, [currentJSON]);

  const handleSendMessage = async (message: string) => {
    setIsLoading(true);

    const userMessage: ChatMessage = { role: 'user', content: message };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      console.log('Sending message to OpenAI Edge Function...');

      const response = await sendMessage(updatedMessages, currentJSON);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (response.extractedJSON) {
        setCurrentJSON(response.extractedJSON);
      }

      if (conversationId) {
        await updateConversation(
          conversationId,
          finalMessages,
          response.extractedJSON || currentJSON
        );
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
        errorText += '\n\nPlease check that your OpenAI API key is correctly configured in the Bolt secrets.';
      }

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: errorText,
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI-Powered Audit Process Flow Generator
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Chat with AI to create comprehensive audit process diagrams
              </p>
            </div>
            {currentJSON && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Process</p>
                <p className="text-lg font-semibold text-gray-900">{currentJSON.processName}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-6 h-[calc(100vh-180px)]">
          <div className="h-full">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>

          <div className="h-full">
            <DiagramCanvas nodes={nodes} edges={edges} />
          </div>
        </div>
      </main>

      {nodes.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs text-gray-600 max-w-xs">
          <div className="flex items-start gap-2">
            <div className="font-semibold">Legend:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span>Process Step</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>Control</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>Weakness</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
