'use client';

import { MessageSquare } from 'lucide-react';
import { Tool, DocumentMetadata } from '../types';

type SidebarProps = {
  tools: Tool[];
  selectedTool: string | null;
  setSelectedTool: (toolId: string | null) => void;
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  onCustomPromptSubmit: () => void;
  metadata?: DocumentMetadata;
  currentFilePath?: string;
  onToolPrompt?: () => void;
};

export default function Sidebar({
  tools,
  selectedTool,
  setSelectedTool,
  customPrompt,
  setCustomPrompt,
  onCustomPromptSubmit,
  onToolPrompt,
}: SidebarProps) {
  return (
    <aside className="w-80 bg-gray-800 border-r border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Ferramentas de IA</h2>
        <div className="space-y-2" role="list">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.id} className="group relative" role="listitem">
                <button
                  onClick={() => {
                    setSelectedTool(selectedTool === tool.id ? null : tool.id);
                    if (selectedTool !== tool.id && onToolPrompt) {
                      onToolPrompt();
                    }
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    selectedTool === tool.id
                      ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                  aria-label={tool.name}
                  aria-pressed={selectedTool === tool.id}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{tool.name}</span>
                </button>
                <div
                  className="absolute left-full ml-2 top-0 z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-600"
                  role="tooltip"
                >
                  {tool.description}
                  <div className="absolute left-0 top-3 -ml-1 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-gray-600" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-sm font-semibold text-white mb-3">Pedido Personalizado</h3>
        <div className="space-y-3">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Descreva o que você gostaria que a IA faça com seu texto..."
            className="w-full p-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            aria-label="Prompt personalizado"
          />
          <button
            onClick={onCustomPromptSubmit}
            disabled={!customPrompt.trim()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500"
            aria-label="Enviar pedido personalizado"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Enviar Pedido</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
