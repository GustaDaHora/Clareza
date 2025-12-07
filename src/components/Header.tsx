'use client';

import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import { FileText, FolderOpen, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { TOOLTIP_DELAY } from '../constants';
import type { DocumentMetadata } from '../types';

type HeaderProps = {
  currentFilePath?: string;
  isDirty: boolean;
  currentVersion: number;
  maxVersion: number;
  isLoading: boolean;
  onPreviousVersion: () => void;
  onNextVersion: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenTerminal: () => void;
  onToggleTerminal: () => void;
  metadata?: DocumentMetadata;
  lastAutoSave?: Date;
  onCreateBackup: () => void;
};

export default function Header({
  currentFilePath,
  isDirty,
  currentVersion,
  maxVersion,
  isLoading,
  onPreviousVersion,
  onNextVersion,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onOpenTerminal,
  onToggleTerminal,
  metadata,
  lastAutoSave,
  onCreateBackup,
}: HeaderProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipTimer, setTooltipTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // console.log('Header metadata:', metadata);
  // console.log("lastAutoSave:", lastAutoSave);
  // console.log("onCreateBackup:", onCreateBackup);

  useEffect(() => {
    return () => {
      if (tooltipTimer) clearTimeout(tooltipTimer);
    };
  }, [tooltipTimer]);

  const handleMouseEnter = (tooltipType: string) => {
    if (tooltipTimer) clearTimeout(tooltipTimer);
    const timer = setTimeout(() => {
      setShowTooltip(tooltipType);
    }, TOOLTIP_DELAY);
    setTooltipTimer(timer);
  };

  const handleMouseLeave = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
      setTooltipTimer(null);
    }
    setShowTooltip(null);
  };

  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-400" aria-hidden="true" />
              <h1 className="text-lg font-semibold text-white">Clareza</h1>
            </div>
            <div className="flex items-center space-x-2 ml-8">
              <div className="relative">
                <button
                  onClick={onPreviousVersion}
                  disabled={currentVersion === 1}
                  onMouseEnter={() => handleMouseEnter('previous')}
                  onMouseLeave={handleMouseLeave}
                  className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Versão anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {showTooltip === 'previous' && (
                  <div
                    role="tooltip"
                    className="absolute top-8 left-0 z-10 px-2 py-1 bg-gray-900 text-white text-xs rounded border border-gray-600 whitespace-nowrap"
                  >
                    Voltar para versão anterior
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-300 font-medium px-2" aria-label={`Versão ${currentVersion}`}>
                V{currentVersion}
              </span>
              <div className="relative">
                <button
                  onClick={onNextVersion}
                  disabled={currentVersion === maxVersion}
                  onMouseEnter={() => handleMouseEnter('next')}
                  onMouseLeave={handleMouseLeave}
                  className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Próxima versão"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {showTooltip === 'next' && (
                  <div
                    role="tooltip"
                    className="absolute top-8 right-0 z-10 px-2 py-1 bg-gray-900 text-white text-xs rounded border border-gray-600 whitespace-nowrap"
                  >
                    Avançar para próxima versão
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 text-center">
            {currentFilePath && (
              <span className="text-lg text-gray-200 font-bold">
                {currentFilePath.replace(/^.*[\\/]/, '')}
                {isDirty && ' *'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpen}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-label="Abrir arquivo (Ctrl+O)"
            >
              <FolderOpen className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Abrir</span>
            </button>
            <button
              onClick={onSave}
              disabled={!isDirty || isLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-600 focus:ring-2 focus:ring-blue-500"
              aria-label="Salvar arquivo (Ctrl+S)"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">{isLoading ? 'Salvando...' : isDirty ? 'Salvar' : 'Salvo'}</span>
            </button>
            <button
              onClick={onSaveAs}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-label="Salvar como... (Ctrl+Shift+S)"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Salvar Como...</span>
            </button>
            <button
              onClick={onOpenTerminal}
              className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-label="Abrir terminal"
            >
              <span className="text-sm">Abrir Terminal</span>
            </button>
            <button
              onClick={onToggleTerminal}
              className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-label="Toggle Terminal"
            >
              <span className="text-sm">Toggle Terminal</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

async function handleOpenTerminal() {
  await invoke('open_terminal');
}
