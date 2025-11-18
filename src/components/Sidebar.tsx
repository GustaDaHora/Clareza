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
  metadata,
  onToolPrompt,
}: SidebarProps) {
  
  const handleToolClick = (toolId: string) => {
    // Set the selected tool
    setSelectedTool(toolId);
    
    // Immediately trigger the prompt
    if (onToolPrompt) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        onToolPrompt();
      }, 50);
    }
  };

  return (
    <aside className="w-80 bg-gray-800 border-r border-gray-700 p-6 flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-sm font-semibold text-white mb-4">Ferramentas de IA</h2>
        <div className="space-y-2" role="list">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.id} className="group relative" role="listitem">
                <button
                  onClick={() => handleToolClick(tool.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none hover:bg-gray-700 text-gray-300
                    ${selectedTool === tool.id ? 'bg-blue-900/50 text-blue-300 border border-blue-700' : ''}
                  `}
                  aria-label={tool.name}
                  aria-pressed={selectedTool === tool.id}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{tool.name}</span>
                </button>
                <div
                  className="absolute left-full ml-2 top-0 z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-600 pointer-events-none"
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
      
      {/* Document stats if available */}
      {metadata && (
        <div className="border-t border-gray-700 pt-4 mb-4 flex-shrink-0">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">Estatísticas</h3>
          <div className="space-y-1 text-xs text-gray-300">
            {metadata.word_count !== undefined && (
              <div className="flex justify-between">
                <span>Palavras:</span>
                <span className="font-medium">{metadata.word_count}</span>
              </div>
            )}
            {metadata.character_count !== undefined && (
              <div className="flex justify-between">
                <span>Caracteres:</span>
                <span className="font-medium">{metadata.character_count}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="border-t border-gray-700 pt-6 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-white mb-3">Pedido Personalizado</h3>
        <div className="space-y-3 flex-1 flex flex-col">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Descreva o que você gostaria que a IA faça com seu texto..."
            className="w-full p-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 min-h-[100px]"
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