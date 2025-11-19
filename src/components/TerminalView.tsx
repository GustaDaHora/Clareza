'use client';
import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Terminal, Play, Square, Trash2 } from 'lucide-react';

interface TerminalOutput {
  message: string;
  stream: 'stdout' | 'stderr' | 'system';
}

interface TerminalViewProps {
  onGeminiStatusChange?: (isRunning: boolean) => void;
}

export default function TerminalView({ onGeminiStatusChange }: TerminalViewProps) {
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  // Listen for terminal output events
  useEffect(() => {
    console.log('[FRONTEND] Setting up event listener');

    const setupListener = async () => {
      const unlisten = await listen<TerminalOutput>('terminal-output', (event) => {
        console.log('[FRONTEND] Received terminal output:', event.payload);
        setOutput((prev) => {
          const newOutput = [...prev, event.payload];
          console.log('[FRONTEND] Output array now has', newOutput.length, 'items');
          return newOutput;
        });
      });

      console.log('[FRONTEND] Event listener registered successfully');
      return unlisten;
    };

    const unlistenPromise = setupListener();

    return () => {
      console.log('[FRONTEND] Cleaning up event listener');
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const clearOutput = () => {
    setOutput([]);
  };

  const renderLine = (line: TerminalOutput, index: number) => {
    const baseClass = 'py-1 px-3 font-mono text-sm break-words';

    switch (line.stream) {
      case 'stderr':
        return (
          <div key={index} className={`${baseClass} text-red-300 bg-red-900/20`}>
            {line.message}
          </div>
        );
      case 'system':
        return (
          <div key={index} className={`${baseClass} text-blue-300`}>
            {line.message}
          </div>
        );
      case 'stdout':
      default:
        return (
          <div key={index} className={`${baseClass} text-gray-100`}>
            {line.message}
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-900 text-white h-full flex flex-col border-l border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Terminal className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-semibold">Assistente Gemini</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={clearOutput}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Limpar saída"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto bg-gray-950" ref={outputRef}>
        {output.length === 0 ? (
          <div className="text-gray-500 text-sm p-6">
            <p className="mb-3 text-gray-400">💡 Terminal do Assistente Gemini</p>
          </div>
        ) : (
          <div className="space-y-0.5">{output.map(renderLine)}</div>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{output.length} mensagem(ns)</span>
        </div>
      </div>
    </div>
  );
}
