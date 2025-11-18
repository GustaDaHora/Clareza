'use client';
import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
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
  const [isGeminiRunning, setIsGeminiRunning] = useState(false);
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

  // Check Gemini status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const running = await invoke<boolean>('is_gemini_running');
        setIsGeminiRunning(running);
        onGeminiStatusChange?.(running);
      } catch (error) {
        console.error('Failed to check Gemini status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [onGeminiStatusChange]);

  const startGemini = async () => {
    console.log('[FRONTEND] Start button clicked');

    setOutput([
      {
        message: '🚀 Iniciando Gemini CLI...',
        stream: 'system',
      },
    ]);

    try {
      await invoke('start_gemini_cli');
      console.log('[FRONTEND] Gemini CLI started successfully');
      setIsGeminiRunning(true);
      onGeminiStatusChange?.(true);
    } catch (error) {
      console.error('[FRONTEND] Failed to start Gemini:', error);
      setOutput((prev) => [
        ...prev,
        {
          message: `❌ Falha ao iniciar Gemini CLI: ${error}`,
          stream: 'stderr',
        },
      ]);
    }
  };

  const stopGemini = async () => {
    try {
      await invoke('stop_gemini_cli');
      setIsGeminiRunning(false);
      onGeminiStatusChange?.(false);
      setOutput((prev) => [
        ...prev,
        {
          message: '⏹️ Gemini CLI interrompido',
          stream: 'system',
        },
      ]);
    } catch (error) {
      console.error('[FRONTEND] Failed to stop Gemini:', error);
      setOutput((prev) => [
        ...prev,
        {
          message: `❌ Falha ao parar Gemini CLI: ${error}`,
          stream: 'stderr',
        },
      ]);
    }
  };

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
          <span
            className={`text-xs px-2 py-1 rounded ${
              isGeminiRunning ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
            }`}
          >
            {isGeminiRunning ? '● Ativo' : '○ Inativo'}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={clearOutput}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Limpar saída"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {!isGeminiRunning ? (
            <button
              onClick={startGemini}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Iniciar</span>
            </button>
          ) : (
            <button
              onClick={stopGemini}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Parar</span>
            </button>
          )}
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto bg-gray-950" ref={outputRef}>
        {output.length === 0 ? (
          <div className="text-gray-500 text-sm p-6">
            <p className="mb-3 text-gray-400">💡 Terminal do Assistente Gemini</p>
            <p className="mb-2">
              {isGeminiRunning
                ? '✓ Sistema pronto. Use as ferramentas na barra lateral para analisar seu texto.'
                : 'Clique em "Iniciar" para ativar o assistente.'}
            </p>
            {isGeminiRunning && (
              <div className="mt-4 text-xs text-gray-600">
                <p>• Selecione uma ferramenta de IA</p>
                <p>• Digite um pedido personalizado</p>
                <p>• As respostas aparecerão aqui</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {output.map(renderLine)}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{output.length} mensagem(ns)</span>
          {isGeminiRunning && (
            <span className="text-green-400">⚡ Pronto para processar</span>
          )}
        </div>
      </div>
    </div>
  );
}