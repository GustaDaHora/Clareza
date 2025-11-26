// src/hooks/useFileHandler.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { FileService, FileOperation, DocumentMetadata } from '../services/fileService';

interface FileHandlerState {
  currentFilePath: string | undefined;
  isDirty: boolean;
  metadata: DocumentMetadata | undefined;
  isLoading: boolean;
  lastAutoSave: Date | undefined;
  versions: string[];
  currentVersionIndex: number;
}

export function useFileHandler() {
  const [state, setState] = useState<FileHandlerState>({
    currentFilePath: undefined,
    isDirty: false,
    metadata: undefined,
    isLoading: false,
    lastAutoSave: undefined,
    versions: [],
    currentVersionIndex: -1,
  });

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<string>('');

  // Auto-save functionality
  const scheduleAutoSave = useCallback(
    (content: string) => {
      pendingContent.current = content;

      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      autoSaveTimer.current = setTimeout(async () => {
        if (state.currentFilePath && state.isDirty) {
          try {
            await FileService.saveDocument(state.currentFilePath, pendingContent.current, state.metadata);

            setState((prev) => ({
              ...prev,
              isDirty: false,
              lastAutoSave: new Date(),
            }));
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      }, 3000); // Auto-save after 3 seconds of inactivity
    },
    [state.currentFilePath, state.isDirty, state.metadata],
  );

  // Clean up auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const fetchVersions = useCallback(async (path: string) => {
    try {
      const versions = await FileService.getDocumentVersions(path);
      setState(prev => ({ ...prev, versions, currentVersionIndex: versions.length - 1 }));
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  }, []); // Moved fetchVersions up to avoid forward reference in deps

  const createNewDocument = useCallback(async (title: string): Promise<FileOperation> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await FileService.createDocument(title);

      if (result.success) {
        setState(prev => ({
          ...prev,
          currentFilePath: undefined,
          isDirty: false,
          metadata: result.metadata || undefined,
          isLoading: false,
          versions: [],
          currentVersionIndex: -1,
        }));
      }

      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []); // Added missing deps array

  const openFile = useCallback(async (path: string): Promise<FileOperation> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await FileService.openDocument(path);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          currentFilePath: result.path || undefined,
          isDirty: false,
          metadata: result.metadata || undefined,
          isLoading: false,
        }));
        if (result.path) fetchVersions(result.path);
      }
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [fetchVersions]);

  const saveFile = useCallback(
    async (content: string, asNew = false): Promise<FileOperation> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const result =
          asNew || !state.currentFilePath
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
          if (result.path) fetchVersions(result.path);
        }

        return result;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [state.currentFilePath, state.metadata, fetchVersions],
  );

  const createBackup = useCallback(async (): Promise<void> => {
    if (!state.currentFilePath) {
      throw new Error('No file to backup');
    }

    await FileService.createBackup(state.currentFilePath);
  }, [state.currentFilePath]);

  const goToPreviousVersion = useCallback(async () => {
    if (!state.currentFilePath || state.currentVersionIndex <= 0) return;

    try {
      const version = state.versions[state.currentVersionIndex - 1];
      const result = await FileService.getDocumentVersion(state.currentFilePath, version);
      if (result.success) {
        setState(prev => ({
          ...prev,
          metadata: result.metadata || prev.metadata,
          currentVersionIndex: prev.currentVersionIndex - 1,
        }));
        return result.content;
      }
    } catch (error) {
      console.error('Failed to get previous version:', error);
    }
  }, [state.currentFilePath, state.currentVersionIndex, state.versions]);

  const goToNextVersion = useCallback(async () => {
    if (!state.currentFilePath || state.currentVersionIndex >= state.versions.length - 1) return;

    try {
      const version = state.versions[state.currentVersionIndex + 1];
      const result = await FileService.getDocumentVersion(state.currentFilePath, version);
      if (result.success) {
        setState(prev => ({
          ...prev,
          metadata: result.metadata || prev.metadata,
          currentVersionIndex: prev.currentVersionIndex + 1,
        }));
        return result.content;
      }
    } catch (error) {
      console.error('Failed to get next version:', error);
    }
  }, [state.currentFilePath, state.currentVersionIndex, state.versions]);

  const setContentChanged = useCallback(
    (content: string) => {
      setState((prev) => ({ ...prev, isDirty: true }));
      scheduleAutoSave(content);
    },
    [scheduleAutoSave],
  );

  return {
    ...state,
    createNewDocument,
    openFile,
    saveFile,
    createBackup,
    goToPreviousVersion,
    goToNextVersion,
    setContentChanged,
  };
}