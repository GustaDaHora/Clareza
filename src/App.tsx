// src/App.tsx

'use client';

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useFileHandler } from './hooks/useFileHandler';
import { useToast } from './hooks/useToast';
import { TOOLS, DEFAULT_CONTENT } from './constants';
import { invoke } from '@tauri-apps/api/core';
import { FileService } from './services/fileService';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ToastNotifications from './components/ToastNotifications';
import TextEditor from './components/Editor';
import TerminalView from './components/TerminalView';
import DependencyCheckScreen from './components/DependencyCheck';
import WelcomeScreen from './components/WelcomeScreen';

interface GeminiCompletePayload {
  content: string;
}

export default function ClarezaApp() {
  const [currentScreen, setCurrentScreen] = useState<'dependencies' | 'welcome' | 'editor'>('dependencies');
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
    console.log('[FRONTEND] Setting up gemini-complete listener');

    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlistenFn = await listen<GeminiCompletePayload>('gemini-complete', async (event) => {
          console.log('[FRONTEND] ========== GEMINI COMPLETE EVENT RECEIVED ==========');
          console.log('[FRONTEND] Full event:', JSON.stringify(event, null, 2));
          console.log('[FRONTEND] Payload:', event.payload);
          console.log('[FRONTEND] Content length:', event.payload?.content?.length);

          if (!event.payload || !event.payload.content) {
            console.error('[FRONTEND] Invalid payload received:', event.payload);
            addToast('Resposta inválida do Gemini', 'error');
            return;
          }

          const geminiResponse = event.payload.content;
          console.log('[FRONTEND] Content preview (first 200 chars):', geminiResponse.substring(0, 200));

          // Update editor content immediately
          console.log('[FRONTEND] Updating editor content...');
          setEditorContent(geminiResponse);

          // Save as new version if file exists
          if (currentFilePath) {
            console.log('[FRONTEND] Current file path:', currentFilePath);
            console.log('[FRONTEND] Attempting to save as new version...');

            try {
              const result = await saveFile(geminiResponse);
              console.log('[FRONTEND] Save result:', result);
              addToast('Nova versão criada com sugestões da IA', 'success');
            } catch (error) {
              console.error('[FRONTEND] Save error:', error);
              addToast(`Falha ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
            }
          } else {
            console.log('[FRONTEND] No file path, marking as dirty');
            setContentChanged(geminiResponse);
            addToast('Conteúdo atualizado pela IA. Salve o arquivo para criar uma versão.', 'success');
          }

          console.log('[FRONTEND] ========== PROCESSING COMPLETE ==========');
        });

        console.log('[FRONTEND] Listener registered successfully');
      } catch (error) {
        console.error('[FRONTEND] Failed to setup listener:', error);
        addToast('Falha ao configurar listener de eventos', 'error');
      }
    };

    setupListener();

    return () => {
      if (unlistenFn) {
        console.log('[FRONTEND] Cleaning up listener');
        unlistenFn();
      }
    };
  }, [currentFilePath, addToast]);

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
    setCurrentScreen('welcome');
  };

  const handleWelcomeNew = async () => {
    const success = await handleNew();
    if (success) {
      setCurrentScreen('editor');
    }
  };

  const handleWelcomeOpen = async () => {
    const success = await handleOpen();
    if (success) {
      setCurrentScreen('editor');
    }
  };

  const handleWelcomeOpenRecent = async (path: string) => {
    try {
      const result = await openFile(path);
      if (result.success && result.content !== undefined) {
        setEditorContent(result.content);
        addToast(result.message, 'success');
        setCurrentScreen('editor');
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Failed to open recent file:', error);
      addToast(`Falha ao abrir arquivo recente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  const handleNew = async (): Promise<boolean> => {
    if (isDirty) {
      const shouldContinue = await showUnsavedChangesDialog();
      if (!shouldContinue) return false;
    }

    try {
      const title = prompt('Digite o título do novo documento:', 'Novo Documento');
      if (!title) return false;

      const result = await createNewDocument(title);

      if (result.success && result.content !== undefined) {
        setEditorContent(result.content);
        addToast(result.message, 'success');
        return true;
      } else {
        addToast(result.message, 'error');
        return false;
      }
    } catch (error) {
      console.error('Failed to create new document:', error);
      addToast(
        `Falha ao criar novo documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'error',
      );
      return false;
    }
  };

  const handleOpen = async (): Promise<boolean> => {
    if (isDirty) {
      const shouldContinue = await showUnsavedChangesDialog();
      if (!shouldContinue) return false;
    }

    try {
      const filePath = await showOpenFileDialog();

      if (filePath) {
        const result = await openFile(filePath);

        if (result.success && result.content !== undefined) {
          setEditorContent(result.content);
          addToast(result.message, 'success');
          return true;
        } else if (result.message !== 'Open cancelled') {
          addToast(result.message, 'error');
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to open file:', error);
      addToast(`Falha ao abrir arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
      return false;
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

  const sendPromptToGemini = async (prompt: string) => {
    if (!showTerminal) {
      setShowTerminal(true);
    }

    try {
      console.log('[FRONTEND] Sending prompt to Gemini...');
      console.log('[FRONTEND] Prompt:', prompt);
      console.log('[FRONTEND] Editor content length:', editorContent.length);

      await invoke('send_prompt_to_gemini', {
        prompt: prompt,
        fileContent: editorContent,
      });

      console.log('[FRONTEND] Prompt sent successfully');
    } catch (error) {
      console.error('[FRONTEND] Erro ao enviar prompt para Gemini:', error);
      addToast('Erro ao enviar prompt para Gemini', 'error');
    }
  };

  const handleToolPrompt = () => {
    if (!selectedTool) return;

    const tool = TOOLS.find((t) => t.id === selectedTool);
    if (!tool) return;

    if (!showTerminal) {
      setShowTerminal(true);
    }

    sendPromptToGemini(tool.prompt);
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

  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        onNewDocument={handleWelcomeNew}
        onOpenDocument={handleWelcomeOpen}
        onOpenRecent={handleWelcomeOpenRecent}
      />
    );
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