/**
 * Chat Interface V2 for Process Builder
 * Enhanced with JSON display, Start Over, and collapsible features
 * Based on PRD Section 6.2
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RefreshCw, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';
import type { ChatMessage, ProcessSchema } from '../types/processSchema';

interface ChatInterfaceV2Props {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  currentJSON: ProcessSchema | null;
  onStartOver: () => void;
  onJSONDownload: () => void;
  onJSONUpload: (json: ProcessSchema) => void;
}

export default function ChatInterfaceV2({
  messages,
  onSendMessage,
  isLoading,
  currentJSON,
  onStartOver,
  onJSONDownload,
  onJSONUpload
}: ChatInterfaceV2Props) {
  const [input, setInput] = useState('');
  const [showJSON, setShowJSON] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleStartOver = () => {
    if (messages.length > 0) {
      const confirmed = window.confirm(
        'Are you sure you want to start over? This will clear all messages and the current process.'
      );
      if (confirmed) {
        onStartOver();
      }
    } else {
      onStartOver();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onJSONUpload(json);
      } catch (error) {
        alert('Failed to parse JSON file. Please ensure it is valid JSON.');
        console.error('JSON parse error:', error);
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Visual Flow Builder</h2>
            <p className="text-sm text-blue-100 mt-1">
              Describe your process, and I'll help you create a flow diagram
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStartOver}
              className="flex items-center gap-1 px-3 py-1 bg-blue-800 hover:bg-blue-900 rounded text-sm transition"
              title="Start Over"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Start Over</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable independently */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium mb-2">Welcome to Visual Flow Analysis!</p>
            <p className="text-sm mb-4">
              Start by describing the process you want to document.
              <br />
              I'll ask clarifying questions and help you build a comprehensive flow diagram.
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition"
              >
                <Upload className="w-4 h-4" />
                Upload JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-xs font-semibold mb-1 opacity-70">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg p-4 bg-gray-100 text-gray-900">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm">Analyzing and building process...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* JSON Viewer - PRD Section 6.2: Display JSON updates in collapsible code block */}
      {currentJSON && (
        <div className="border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setShowJSON(!showJSON)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-100 transition"
          >
            <span className="text-sm font-medium text-gray-700">
              Current Process JSON
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJSONDownload();
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Download JSON"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
              {showJSON ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </div>
          </button>

          {showJSON && (
            <div className="px-4 pb-4 max-h-64 overflow-y-auto">
              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded font-mono overflow-x-auto">
                {JSON.stringify(currentJSON, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe your process, ask questions, or request changes..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={1}
            disabled={isLoading}
            style={{ minHeight: '50px', maxHeight: '200px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
