// src/services/fileService.ts
import { invoke } from '@tauri-apps/api/core';

// Type definitions should be matching Rust structs
export interface DocumentMetadata {
  id: string;
  title: string;
  created_at: string;
  modified_at: string;
  word_count: number;
  character_count: number;
  language: string;
  tags: string[];
  version: number;
}

export interface FileOperation {
  success: boolean;
  message: string;
  path?: string;
  content?: string;
  metadata?: DocumentMetadata;
}

export interface BackupInfo {
  id: string;
  original_path: string;
  backup_path: string;
  created_at: string;
  size_bytes: number;
}

export interface RecentFile {
  path: string;
  title: string;
  last_opened: string;
  exists: boolean;
}

export class FileService {
  /**
   * Create a new document with metadata
   */
  static async createDocument(title: string): Promise<FileOperation> {
    try {
      return await invoke<FileOperation>('create_document', { title });
    } catch (error) {
      throw new Error(`Failed to create document: ${error}`);
    }
  }

  /**
   * Open an existing document from file system
   */
  static async openDocument(path: string): Promise<FileOperation> {
    try {
      return await invoke<FileOperation>('open_document', { path });
    } catch (error) {
      throw new Error(`Failed to open document: ${error}`);
    }
  }

  /**
   * Save document to existing path
   */
  static async saveDocument(path: string, content: string, metadata?: DocumentMetadata): Promise<FileOperation> {
    try {
      return await invoke<FileOperation>('save_document', {
        path,
        content,
        ...(metadata ? { metadata } : {}),
      });
    } catch (error) {
      throw new Error(`Failed to save document: ${error}`);
    }
  }

  /**
   * Save document to new location
   */
  static async saveDocumentAs(
    content: string,
    suggestedName?: string,
    metadata?: DocumentMetadata,
  ): Promise<FileOperation> {
    try {
      return await invoke<FileOperation>('save_document_as', {
        content,
        suggested_name: suggestedName || null,
        ...(metadata ? { metadata } : {}),
      });
    } catch (error) {
      throw new Error(`Failed to save document as: ${error}`);
    }
  }

  /**
   * Create a backup of the current document
   */
  static async createBackup(path: string): Promise<BackupInfo> {
    try {
      return await invoke<BackupInfo>('create_backup', { path });
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  /**
   * List all backups for a document
   */
  static async listBackups(originalPath: string): Promise<BackupInfo[]> {
    try {
      return await invoke<BackupInfo[]>('list_backups', {
        original_path: originalPath,
      });
    } catch (error) {
      throw new Error(`Failed to list backups: ${error}`);
    }
  }

  /**
   * Restore a document from backup
   */
  static async restoreBackup(backupPath: string, targetPath: string): Promise<FileOperation> {
    try {
      return await invoke<FileOperation>('restore_backup', {
        backup_path: backupPath,
        target_path: targetPath,
      });
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error}`);
    }
  }

  static async getDocumentVersions(path: string): Promise<string[]> {
    try {
      return await invoke<string[]>('get_document_versions', { path });
    } catch (error) {
      throw new Error(`Failed to get document versions: ${error}`);
    }
  }

  static async getDocumentVersion(path: string, version: string): Promise<FileOperation> {
    try {
      return await invoke<FileOperation>('get_document_version', { path, version });
    } catch (error) {
      throw new Error(`Failed to get document version: ${error}`);
    }
  }

  /**
   * Get recently opened files
   */
  static async getRecentFiles(): Promise<RecentFile[]> {
    try {
      return await invoke<RecentFile[]>('get_recent_files');
    } catch (error) {
      throw new Error(`Failed to get recent files: ${error}`);
    }
  }

  /**
   * Validate a file path
   */
  static async validatePath(path: string): Promise<boolean> {
    try {
      return await invoke<boolean>('validate_path', { path });
    } catch {
      return false;
    }
  }
}
