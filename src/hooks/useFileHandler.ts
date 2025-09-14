// src/hooks/useFileHandler.ts - Updated hook using Rust backend
import { useState, useCallback, useRef, useEffect } from 'react';
import { FileService, FileOperation, DocumentMetadata } from '../services/fileService';

interface FileHandlerState {
  currentFilePath: string | undefined;
  isDirty: boolean;
  metadata: DocumentMetadata | undefined;
  isLoading: boolean;
  lastAutoSave: Date | undefined;
}

export function useFileHandler() {
  const [state, setState] = useState<FileHandlerState>({
    currentFilePath: undefined,
    isDirty: false,
    metadata: undefined,
    isLoading: false,
    lastAutoSave: undefined,
  });

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingContent = useRef<string>('');

  // Auto-save functionality
  const scheduleAutoSave = useCallback((content: string) => {
    pendingContent.current = content;
    
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    autoSaveTimer.current = setTimeout(async () => {
      if (state.currentFilePath && state.isDirty) {
        try {
          await FileService.saveDocument(
            state.currentFilePath,
            pendingContent.current,
            state.metadata
          );
          
          setState(prev => ({
            ...prev,
            isDirty: false,
            lastAutoSave: new Date(),
          }));
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 3000); // Auto-save after 3 seconds of inactivity
  }, [state.currentFilePath, state.isDirty, state.metadata]);

  // Clean up auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const createNewDocument = useCallback(async (title: string): Promise<FileOperation> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await FileService.createDocument(title);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          currentFilePath: undefined,
          isDirty: false,
          metadata: result.metadata || undefined,
          isLoading: false,
        }));
      }
      
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const openFile = useCallback(async (path: string): Promise<FileOperation> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await FileService.openDocument(path);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          currentFilePath: result.path || undefined,
          isDirty: false,
          metadata: result.metadata || undefined,
          isLoading: false,
        }));
      }
      
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const saveFile = useCallback(async (
    content: string,
    asNew = false
  ): Promise<FileOperation> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = asNew || !state.currentFilePath
        ? await FileService.saveDocumentAs(content, undefined, state.metadata)
        : await FileService.saveDocument(state.currentFilePath, content, state.metadata);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          currentFilePath: result.path || prev.currentFilePath,
          isDirty: false,
          metadata: result.metadata || prev.metadata,
          isLoading: false,
          lastAutoSave: new Date(),
        }));
      }
      
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.currentFilePath, state.metadata]);

  const createBackup = useCallback(async (): Promise<void> => {
    if (!state.currentFilePath) {
      throw new Error('No file to backup');
    }
    
    await FileService.createBackup(state.currentFilePath);
  }, [state.currentFilePath]);

  const exportDocument = useCallback(async (
    content: string,
    format: 'pdf' | 'epub' | 'docx' | 'html' | 'md',
    outputPath: string
  ): Promise<FileOperation> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await FileService.exportDocument(
        content,
        { format, include_metadata: true },
        outputPath
      );
      
      setState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const setContentChanged = useCallback((content: string) => {
    setState(prev => ({ ...prev, isDirty: true }));
    scheduleAutoSave(content);
  }, [scheduleAutoSave]);

  return {
    ...state,
    createNewDocument,
    openFile,
    saveFile,
    createBackup,
    exportDocument,
    setContentChanged,
  };
}
