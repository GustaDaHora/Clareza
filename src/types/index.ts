// Use DocumentMetadata from fileService for type consistency
export type { DocumentMetadata } from '../services/fileService';
// src/types/index.ts
import { LucideIcon } from 'lucide-react';

export type Toast = {
  id: string;
  message: string;
  type: 'error' | 'success';
};

export type FileResult = {
  success: boolean;
  message: string;
  content?: string;
  path?: string;
};

export type Tool = {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
};

export type NewDocumentData = {
  title: string;
};


