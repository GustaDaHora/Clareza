'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import type { ExportData, DocumentMetadata } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFormat: string;
  onConfirmExport: (data: ExportData) => void | Promise<void>;
  metadata?: DocumentMetadata;
}

export default function ExportModal({ isOpen, onClose, selectedFormat, onConfirmExport }: ExportModalProps) {
  const [exportData, setExportData] = useState<ExportData>({
    title: '',
    authors: '',
    language: '',
    description: '',
    keywords: '',
    creator: '',
    producer: '',
    creationDate: '',
    modificationDate: '',
    pdfVersion: '',
    publisher: '',
    identifier: '',
    rights: '',
    publicationDate: '',
    coverage: '',
    contributors: '',
    category: '',
    comments: '',
    lastEditor: '',
    editingTime: '',
    documentVersion: '',
  });

  const handleConfirmExport = () => {
    onConfirmExport(exportData);
    setExportData({
      title: '',
      authors: '',
      language: '',
      description: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: '',
      modificationDate: '',
      pdfVersion: '',
      publisher: '',
      identifier: '',
      rights: '',
      publicationDate: '',
      coverage: '',
      contributors: '',
      category: '',
      comments: '',
      lastEditor: '',
      editingTime: '',
      documentVersion: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-600 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Exportar como {selectedFormat}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Campos Gerais */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Título <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={exportData.title}
                  onChange={(e) => setExportData({ ...exportData, title: e.target.value })}
                  className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Autor(es) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={exportData.authors}
                  onChange={(e) => setExportData({ ...exportData, authors: e.target.value })}
                  className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Idioma</label>
                <select
                  value={exportData.language}
                  onChange={(e) => setExportData({ ...exportData, language: e.target.value })}
                  className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione um idioma</option>
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">Inglês</option>
                  <option value="es">Espanhol</option>
                  <option value="fr">Francês</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Palavras-chave</label>
                <input
                  type="text"
                  value={exportData.keywords}
                  onChange={(e) => setExportData({ ...exportData, keywords: e.target.value })}
                  className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-white mb-2">Descrição / Resumo</label>
              <textarea
                value={exportData.description}
                onChange={(e) => setExportData({ ...exportData, description: e.target.value })}
                className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Campos Específicos por Formato */}
          {selectedFormat === 'PDF' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Configurações PDF</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Criador (Software)</label>
                  <input
                    type="text"
                    value={exportData.creator}
                    onChange={(e) => setExportData({ ...exportData, creator: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Clareza v1.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Produtor</label>
                  <input
                    type="text"
                    value={exportData.producer}
                    onChange={(e) => setExportData({ ...exportData, producer: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Data de Criação</label>
                  <input
                    type="datetime-local"
                    value={exportData.creationDate}
                    onChange={(e) => setExportData({ ...exportData, creationDate: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Data de Modificação</label>
                  <input
                    type="datetime-local"
                    value={exportData.modificationDate}
                    onChange={(e) => setExportData({ ...exportData, modificationDate: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Versão do PDF</label>
                  <select
                    value={exportData.pdfVersion}
                    onChange={(e) => setExportData({ ...exportData, pdfVersion: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione a versão</option>
                    <option value="1.4">PDF 1.4</option>
                    <option value="1.5">PDF 1.5</option>
                    <option value="1.6">PDF 1.6</option>
                    <option value="1.7">PDF 1.7</option>
                    <option value="2.0">PDF 2.0</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedFormat === 'EPUB' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Configurações EPUB</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Editora/Organização <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={exportData.publisher}
                    onChange={(e) => setExportData({ ...exportData, publisher: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Identificador Único <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={exportData.identifier}
                    onChange={(e) => setExportData({ ...exportData, identifier: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ISBN, DOI, UUID, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Direitos / Licença</label>
                  <input
                    type="text"
                    value={exportData.rights}
                    onChange={(e) => setExportData({ ...exportData, rights: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: © 2024, Creative Commons, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Data de Publicação</label>
                  <input
                    type="date"
                    value={exportData.publicationDate}
                    onChange={(e) => setExportData({ ...exportData, publicationDate: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Cobertura</label>
                  <input
                    type="text"
                    value={exportData.coverage}
                    onChange={(e) => setExportData({ ...exportData, coverage: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Local, período, contexto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Contribuidores</label>
                  <input
                    type="text"
                    value={exportData.contributors}
                    onChange={(e) => setExportData({ ...exportData, contributors: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tradutor, editor, ilustrador, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {selectedFormat === 'DOCX' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Configurações DOCX</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Categoria</label>
                  <input
                    type="text"
                    value={exportData.category}
                    onChange={(e) => setExportData({ ...exportData, category: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Último Editor</label>
                  <input
                    type="text"
                    value={exportData.lastEditor}
                    onChange={(e) => setExportData({ ...exportData, lastEditor: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Tempo Total de Edição</label>
                  <input
                    type="text"
                    value={exportData.editingTime}
                    onChange={(e) => setExportData({ ...exportData, editingTime: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 2h 30min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Versão do Documento</label>
                  <input
                    type="text"
                    value={exportData.documentVersion}
                    onChange={(e) => setExportData({ ...exportData, documentVersion: e.target.value })}
                    className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 1.0, v2.1, etc."
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-white mb-2">Comentários</label>
                <textarea
                  value={exportData.comments}
                  onChange={(e) => setExportData({ ...exportData, comments: e.target.value })}
                  className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmExport}
            disabled={
              !exportData.title.trim() ||
              !exportData.authors.trim() ||
              (selectedFormat === 'EPUB' && (!exportData.publisher.trim() || !exportData.identifier.trim()))
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Exportar {selectedFormat}
          </button>
        </div>
      </div>
    </div>
  );
}
