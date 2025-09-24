'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDocument: (data: NewDocumentData) => void;
}

export interface NewDocumentData {
  title: string;
  authors: string;
  // language: string
  description: string;
  keywords: string;
}

export default function NewDocumentModal({ isOpen, onClose, onCreateDocument }: NewDocumentModalProps) {
  const [newDocumentData, setNewDocumentData] = useState<NewDocumentData>({
    title: '',
    authors: '',
    // language: "",
    description: '',
    keywords: '',
  });

  const handleCreateDocument = () => {
    onCreateDocument(newDocumentData);
    setNewDocumentData({
      title: '',
      authors: '',
      // language: "",
      description: '',
      keywords: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-600 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Novo Documento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newDocumentData.title}
              onChange={(e) => setNewDocumentData({ ...newDocumentData, title: e.target.value })}
              className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o título do documento"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Autor(es) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newDocumentData.authors}
              onChange={(e) => setNewDocumentData({ ...newDocumentData, authors: e.target.value })}
              className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o(s) nome(s) do(s) autor(es)"
            />
          </div>
          {/* <div>
            <label className="block text-sm font-medium text-white mb-2">Idioma</label>
            <select
              value={newDocumentData.language}
              onChange={(e) => setNewDocumentData({ ...newDocumentData, language: e.target.value })}
              className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um idioma</option>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
              <option value="fr">Francês</option>
            </select>
          </div> */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Descrição / Resumo</label>
            <textarea
              value={newDocumentData.description}
              onChange={(e) => setNewDocumentData({ ...newDocumentData, description: e.target.value })}
              className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Breve descrição do documento"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Palavras-chave / Tags</label>
            <input
              type="text"
              value={newDocumentData.keywords}
              onChange={(e) => setNewDocumentData({ ...newDocumentData, keywords: e.target.value })}
              className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Separe as palavras-chave por vírgulas"
            />
          </div>
        </div>
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateDocument}
            disabled={!newDocumentData.title.trim() || !newDocumentData.authors.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Criar Documento
          </button>
        </div>
      </div>
    </div>
  );
}
