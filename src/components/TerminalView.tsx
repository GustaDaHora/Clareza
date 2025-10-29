'use client';
import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface TerminalOutput {
    message: string;
    stream: 'stdout' | 'stderr' | 'system';
}

export default function TerminalView() {
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);

  // Listen for terminal output events from the backend
  useEffect(() => {
    console.log('[FRONTEND] Setting up event listener');
    
    const unlisten = listen<TerminalOutput>('terminal-output', (event) => {
      console.log('[FRONTEND] Received terminal output:', event.payload);
      setOutput((prev) => {
        const newOutput = [...prev, event.payload];
        console.log('[FRONTEND] New output array length:', newOutput.length);
        return newOutput;
      });
    });

    setIsListening(true);
    console.log('[FRONTEND] Event listener set up');

    return () => {
      console.log('[FRONTEND] Cleaning up event listener');
      unlisten.then((fn) => fn());
      setIsListening(false);
    };
  }, []);

  // Auto-scroll to the bottom on new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const startProcess = async () => {
    console.log('[FRONTEND] Start button clicked');
    
    // Clear previous output and show initializing message
    setOutput([{
        message: 'Initializing Gemini...',
        stream: 'system'
    }]);
    
    console.log('[FRONTEND] Calling start_gemini_cli');
    
    try {
      await invoke('start_gemini_cli');
      console.log('[FRONTEND] start_gemini_cli completed successfully');
    } catch (error) {
      console.error('[FRONTEND] start_gemini_cli failed:', error);
      const errorMessage: TerminalOutput = {
          message: `Failed to start Gemini CLI: ${error}`,
          stream: 'stderr'
      };
      setOutput((prev) => [...prev, errorMessage]);
    }
  };

  const getDebugPath = async () => {
    console.log('[FRONTEND] Debug PATH button clicked');
    try {
      const path = await invoke<string>('debug_get_path');
      console.log('[FRONTEND] PATH received, length:', path.length);
      const pathEntries: TerminalOutput[] = path.split(';').map(p => ({
          message: p,
          stream: 'system'
      }));
      setOutput(prev => [...prev, {message: '--- Application PATH --- ', stream: 'system'}, ...pathEntries]);
    } catch (error) {
      console.error('[FRONTEND] Failed to get PATH:', error);
      const errorMessage: TerminalOutput = {
          message: `Failed to get PATH: ${error}`,
          stream: 'stderr'
      };
      setOutput((prev) => [...prev, errorMessage]);
    }
  };

  const renderLine = (line: TerminalOutput, index: number) => {
    switch (line.stream) {
      case 'stderr':
        return <div key={index} className="text-red-400">{`[stderr] ${line.message}`}</div>;
      case 'system':
        return <div key={index} className="text-yellow-400">{`[system] ${line.message}`}</div>;
      case 'stdout':
      default:
        return <div key={index}>{line.message}</div>;
    }
  };

  return (
    <div className="bg-gray-900 text-white font-mono text-sm p-4 h-full flex flex-col">
        <div className="flex-shrink-0 mb-2">
            <button onClick={startProcess} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Start Gemini
            </button>
            <button onClick={getDebugPath} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded ml-2">
                Debug: Get PATH
            </button>
            <span className="ml-2 text-sm">
                {isListening ? '🟢 Listening' : '🔴 Not listening'}
            </span>
        </div>
        <div className="overflow-y-auto flex-grow" ref={outputRef}>
            {output.length === 0 && (
                <div className="text-gray-500">Terminal output will appear here...</div>
            )}
            {output.map(renderLine)}
        </div>
        <div className="text-xs text-gray-500 mt-2">
            Output count: {output.length}
        </div>
    </div>
  );
}