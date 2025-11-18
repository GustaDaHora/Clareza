'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ToastNotifications from './components/ToastNotifications';
import TextEditor from './components/Editor';
import TerminalView from './components/TerminalView';
import DependencyCheckScreen from './components/DependencyCheck';
import { useFileHandler } from './hooks/useFileHandler';
import { useToast } from './hooks/useToast';
import { TOOLS, DEFAULT_CONTENT } from './constants';
import { invoke } from '@tauri-apps/api/core';
import { FileService } from './services/fileService';

export default function ClarezaApp() {
  const [currentScreen, setCurrentScreen] = useState<'dependencies' | 'editor'>('dependencies');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const [editorContent, setEditorContent] = useState(DEFAULT_CONTENT);

  const {
    currentFilePath,
    isDirty,
    metadata,
    isLoading,
    lastAutoSave,
    openFile,
    saveFile,
    createBackup,
    createNewDocument,
    versions,
    currentVersionIndex,
    goToPreviousVersion,
    goToNextVersion,
    setContentChanged,
  } = useFileHandler();

  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    if (lastAutoSave) {
      setShowAutoSaveIndicator(true);
      const timer = setTimeout(() => {
        setShowAutoSaveIndicator(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAutoSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentScreen !== 'editor') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            handleNew();
            break;
          case 'o':
            e.preventDefault();
            handleOpen();
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;
          case 'b':
            e.preventDefault();
            handleCreateBackup();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen]);

  const handlePreviousVersion = async () => {
    const content = await goToPreviousVersion();
    if (content !== undefined) {
      setEditorContent(content);
    }
  };

  const handleNextVersion = async () => {
    const content = await goToNextVersion();
    if (content !== undefined) {
      setEditorContent(content);
    }
  };

  const showUnsavedChangesDialog = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const result = confirm('Você tem alterações não salvas. Deseja continuar mesmo assim?');
      resolve(result);
    });
  };

  const handleDependenciesComplete = () => {
    setCurrentScreen('editor');
  };

  const handleNew = async () => {
    if (isDirty) {
      const shouldContinue = await showUnsavedChangesDialog();
      if (!shouldContinue) return;
    }

    try {
      const title = prompt('Digite o título do novo documento:', 'Novo Documento');
      if (!title) return;

      const result = await createNewDocument(title);

      if (result.success && result.content !== undefined) {
        setEditorContent(result.content);
        addToast(result.message, 'success');
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Failed to create new document:', error);
      addToast(
        `Falha ao criar novo documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'error',
      );
    }
  };

  const handleOpen = async () => {
    if (isDirty) {
      const shouldContinue = await showUnsavedChangesDialog();
      if (!shouldContinue) return;
    }

    try {
      const filePath = await showOpenFileDialog();

      if (filePath) {
        const result = await openFile(filePath);

        if (result.success && result.content !== undefined) {
          setEditorContent(result.content);
          addToast(result.message, 'success');
        } else if (result.message !== 'Open cancelled') {
          addToast(result.message, 'error');
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      addToast(`Falha ao abrir arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  const handleSave = async () => {
    if (!isDirty && currentFilePath) {
      addToast('Nenhuma alteração para salvar', 'success');
      return;
    }

    try {
      const result = await saveFile(editorContent);
      addToast(result.message, 'success');
    } catch (error) {
      console.error('Failed to save file:', error);
      addToast(`Falha ao salvar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  const handleSaveAs = async () => {
    try {
      const result = await saveFile(editorContent, true);
      addToast(result.message, 'success');
    } catch (error) {
      console.error('Failed to save file as:', error);
      addToast(`Falha ao salvar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  const handleCreateBackup = async () => {
    if (!currentFilePath) {
      addToast('Nenhum arquivo aberto para backup', 'error');
      return;
    }

    try {
      await createBackup();
      addToast('Backup criado com sucesso', 'success');
    } catch (error) {
      console.error('Failed to create backup:', error);
      addToast(`Falha ao criar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  const handleOpenTerminal = async () => {
    try {
      await invoke('open_terminal');
    } catch (error) {
      console.error('Failed to open terminal:', error);
      addToast(`Falha ao abrir terminal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  const toggleTerminal = () => {
    setShowTerminal(!showTerminal);
  };

  const handleContentChange = (content: string) => {
    setEditorContent(content);
    setContentChanged(content);
  };

  const handleCustomPromptSubmit = () => {
    if (!customPrompt.trim()) return;
    sendPromptToGemini(customPrompt);
    setCustomPrompt('');
  };

  // Function to send prompt to Gemini CLI via Tauri
  const sendPromptToGemini = async (prompt: string) => {
    // Show terminal if not already visible
    if (!showTerminal) {
      setShowTerminal(true);
    }

    try {
      // Send prompt with current editor content
      await invoke('send_prompt_to_gemini', {
        prompt: prompt,
        fileContent: editorContent,
      });
      
      console.log('[APP] Prompt sent to Gemini');
    } catch (error) {
      console.error('[APP] Erro ao enviar prompt para Gemini:', error);
      addToast('Erro ao enviar prompt para Gemini', 'error');
    }
  };

  // Handle tool selection - send the tool's prompt with editor content
  const handleToolPrompt = () => {
    if (!selectedTool) return;

    const tool = TOOLS.find((t) => t.id === selectedTool);
    if (!tool) return;

    // Show terminal
    if (!showTerminal) {
      setShowTerminal(true);
    }

    // Send the tool's prompt
    sendPromptToGemini(tool.prompt);
    
    // Clear selection after sending
    setSelectedTool(null);
  };

  const showOpenFileDialog = async (): Promise<string | null> => {
    try {
      const result = await FileService.showOpenDialog();
      return result.success && result.path ? result.path : null;
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      addToast(
        `Falha ao abrir o seletor de arquivos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'error',
      );
      return null;
    }
  };

  if (currentScreen === 'dependencies') {
    return <DependencyCheckScreen onComplete={handleDependenciesComplete} />;
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <Header
        currentFilePath={currentFilePath}
        isDirty={isDirty}
        currentVersion={currentVersionIndex + 1}
        maxVersion={versions.length}
        isLoading={isLoading}
        onPreviousVersion={handlePreviousVersion}
        onNextVersion={handleNextVersion}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onOpenTerminal={handleOpenTerminal}
        onToggleTerminal={toggleTerminal}
        metadata={metadata}
        lastAutoSave={lastAutoSave}
        onCreateBackup={handleCreateBackup}
      />
      <ToastNotifications toasts={toasts} removeToast={removeToast} />

      {showAutoSaveIndicator && lastAutoSave && (
        <div className="bg-blue-600 text-white text-xs px-3 py-1 text-center">
          Auto-salvo em {lastAutoSave.toLocaleTimeString()}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          tools={TOOLS}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          onCustomPromptSubmit={handleCustomPromptSubmit}
          metadata={metadata}
          currentFilePath={currentFilePath}
          onToolPrompt={handleToolPrompt}
        />
        <main className="flex-1 overflow-hidden" role="main">
          <div className="w-full h-full bg-gray-800 flex">
            <div className={showTerminal ? 'w-1/2 h-full' : 'w-full h-full'}>
              <TextEditor
                content={editorContent}
                onContentChange={handleContentChange}
                metadata={metadata}
                isLoading={isLoading}
              />
            </div>
            {showTerminal && (
              <div className="w-1/2 h-full">
                <TerminalView />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}