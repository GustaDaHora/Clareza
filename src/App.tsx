'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ToastNotifications from './components/ToastNotifications';
import TextEditor from './components/Editor';
import NewDocumentModal from './components/NewDocumentModal';
import ExportModal from './components/ExportModal';
import DependencyCheckScreen from './components/DependencyCheck';
import { useFileHandler } from './hooks/useFileHandler';
import { useToast } from './hooks/useToast';
import { TOOLS, DEFAULT_CONTENT } from './constants';
import { NewDocumentData, ExportData } from './types';

export default function ClarezaApp() {
  const [currentScreen, setCurrentScreen] = useState<'dependencies' | 'editor'>('dependencies');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [currentVersion, setCurrentVersion] = useState(1);
  const [maxVersion] = useState(3);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<string>('');
  const [editorContent, setEditorContent] = useState(DEFAULT_CONTENT);

  const {
    currentFilePath,
    isDirty,
    metadata,
    isLoading,
    lastAutoSave,
    createNewDocument,
    openFile,
    saveFile,
    createBackup,
    exportDocument,
    setContentChanged,
  } = useFileHandler();
  
  const { toasts, addToast, removeToast } = useToast();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentScreen !== 'editor') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            handleNewDocument();
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

  const handlePreviousVersion = () => {
    if (currentVersion > 1) {
      setCurrentVersion(currentVersion - 1);
    }
  };

  const handleNextVersion = () => {
    if (currentVersion < maxVersion) {
      setCurrentVersion(currentVersion + 1);
    }
  };

  const handleExport = (format: string) => {
    setSelectedExportFormat(format);
    setShowExportModal(true);
    setShowExportMenu(false);
  };

  const handleCreateDocument = async (data: NewDocumentData) => {
    try {
      const result = await createNewDocument(data.title || 'New Document');
      
      if (result.success) {
        setEditorContent(result.content || DEFAULT_CONTENT);
        setShowNewDocumentModal(false);
        addToast('Novo documento criado', 'success');
      } else {
        addToast(`Erro ao criar documento: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Failed to create document:', error);
      addToast(`Falha ao criar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  const handleConfirmExport = async (data: ExportData) => {
    try {
      // Get export format from modal data or use selected format
      const format = data.format || selectedExportFormat;
      const outputPath = data.outputPath || `document.${format}`;
      
      const result = await exportDocument(editorContent, format as any, outputPath);
      
      if (result.success) {
        addToast(`Documento exportado: ${result.path}`, 'success');
      } else {
        addToast(`Erro na exportação: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Failed to export document:', error);
      addToast(`Falha na exportação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    } finally {
      setShowExportModal(false);
    }
  };

  const handleDependenciesComplete = () => {
    setCurrentScreen('editor');
  };

  const showUnsavedChangesDialog = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const result = confirm('Você tem alterações não salvas. Deseja continuar mesmo assim?');
      resolve(result);
    });
  };

  const handleNewDocument = async () => {
    if (isDirty) {
      const shouldContinue = await showUnsavedChangesDialog();
      if (!shouldContinue) return;
    }
    setShowNewDocumentModal(true);
  };

  const handleOpen = async () => {
    if (isDirty) {
      const shouldContinue = await showUnsavedChangesDialog();
      if (!shouldContinue) return;
    }

    try {
      // In a real implementation, you'd show a file dialog here
      // For now, we'll need to modify this to work with your file dialog system
      const filePath = await showOpenFileDialog(); // You'll need to implement this
      
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
    // This should integrate with Tauri's file dialog or your existing dialog system
    // For now, returning null as a placeholder
    console.log('File dialog would open here');
    return null;
  };

  if (currentScreen === 'dependencies') {
    return <DependencyCheckScreen onComplete={handleDependenciesComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header
        currentFilePath={currentFilePath}
        isDirty={isDirty}
        currentVersion={currentVersion}
        maxVersion={maxVersion}
        isLoading={isLoading}
        onPreviousVersion={handlePreviousVersion}
        onNextVersion={handleNextVersion}
        onNewDocument={handleNewDocument}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExport={handleExport}
        showExportMenu={showExportMenu}
        setShowExportMenu={setShowExportMenu}
        // Additional props for the new features
        metadata={metadata}
        lastAutoSave={lastAutoSave}
        onCreateBackup={handleCreateBackup}
      />
      <ToastNotifications toasts={toasts} removeToast={removeToast} />
      
      {/* Auto-save indicator */}
      {lastAutoSave && (
        <div className="bg-blue-600 text-white text-xs px-3 py-1 text-center">
          Auto-salvo em {lastAutoSave.toLocaleTimeString()}
        </div>
      )}
      
      <NewDocumentModal
        isOpen={showNewDocumentModal}
        onClose={() => setShowNewDocumentModal(false)}
        onCreateDocument={handleCreateDocument}
      />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedFormat={selectedExportFormat}
        onConfirmExport={handleConfirmExport}
        // Pass metadata for export options
        metadata={metadata}
      />
      <div className="flex flex-1">
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
        <main className="flex-1" role="main">
          <div className="w-full h-full min-h-[500px] bg-gray-800">
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