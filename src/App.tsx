'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ToastNotifications from './components/ToastNotifications';
import TextEditor from './components/Editor';

import DependencyCheckScreen from './components/DependencyCheck';
import { useFileHandler } from './hooks/useFileHandler';
import { useToast } from './hooks/useToast';
import { TOOLS, DEFAULT_CONTENT } from './constants';

export default function ClarezaApp() {
  const [currentScreen, setCurrentScreen] = useState<'dependencies' | 'editor'>('dependencies');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

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
    versions,
    currentVersionIndex,
    goToPreviousVersion,
    goToNextVersion,
    setContentChanged,
  } = useFileHandler();

  const { toasts, addToast, removeToast } = useToast();

  // Handle keyboard shortcuts
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
            // Ctrl/Cmd + B for backup
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

  const handleOpen = async () => {
    if (isDirty) {
      const shouldContinue = await showUnsavedChangesDialog();
      if (!shouldContinue) return;
    }

    try {
      const filePath = await showOpenFileDialog();
      console.log('Selected file path:', filePath);

      if (filePath) {
        const result = await openFile(filePath);
        console.log('Open file result:', result);

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

  const handleContentChange = (content: string) => {
    setEditorContent(content);
    // This triggers auto-save and updates isDirty state
    setContentChanged(content);
  };

  const handleCustomPromptSubmit = () => {
    if (!customPrompt.trim()) return;

    console.log('Enviando pedido personalizado:', customPrompt);
    addToast('Pedido personalizado enviado', 'success');
    setCustomPrompt('');
  };

  // Placeholder for file dialog - you'll need to implement this based on your needs
  const showOpenFileDialog = async (): Promise<string | null> => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Markdown',
            extensions: ['md'],
          },
        ],
      });
      if (Array.isArray(selected)) {
        return null;
      } else if (selected === null) {
        return null;
      } else {
        return selected;
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      addToast(`Falha ao abrir o seletor de arquivos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
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

        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        // Additional props for the new features
        metadata={metadata}
        lastAutoSave={lastAutoSave}
        onCreateBackup={handleCreateBackup}
      />
      <ToastNotifications toasts={toasts} removeToast={removeToast} />

      {/* Auto-save indicator */}
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
          // Additional props for document stats
          metadata={metadata}
          currentFilePath={currentFilePath}
        />
        <main className="flex-1 overflow-hidden" role="main">
          <div className="w-full h-full bg-gray-800">
            <TextEditor
              content={editorContent}
              onContentChange={handleContentChange}
              // Pass metadata for editor features
              metadata={metadata}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    </div>
  );
}