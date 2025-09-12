'use client';

import { useState } from 'react';
import {
  CheckCircle,
  FileText,
  Save,
  FolderOpen,
  Plus,
  Wand2,
  Volume2,
  Minimize2,
  Maximize2,
  Lightbulb,
  Shield,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import DependencyCheckScreen from './components/dependency-check';
import NewDocumentModal, { type NewDocumentData } from './components/new-document';
import ExportModal, { type ExportData } from './components/export-modal';
import TextEditor from './components/Editor';

export default function ClarezaApp() {
  const [currentScreen, setCurrentScreen] = useState<'dependencies' | 'editor'>('dependencies');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [currentVersion, setCurrentVersion] = useState(1);
  const [maxVersion] = useState(3);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);

  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<string>('');

  const [editorContent, setEditorContent] = useState('<p>Comece a escrever aqui...</p>');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  const tools = [
    {
      id: 'grammar',
      name: 'Correção Gramatical',
      icon: CheckCircle,
      description: 'Detecta e corrige erros de gramática, ortografia, pontuação e sintaxe com sugestões precisas',
    },
    {
      id: 'style',
      name: 'Melhorias de Estilo',
      icon: Wand2,
      description: 'Sugere reescritas para tornar o texto mais conciso, claro e impactante',
    },
    {
      id: 'tone',
      name: 'Ajuste de Tom',
      icon: Volume2,
      description: 'Detecta o tom atual e sugere ajustes para formal, amigável, confiante ou envolvente',
    },
    {
      id: 'simplify',
      name: 'Simplificar Texto',
      icon: Minimize2,
      description: 'Reescreve trechos complexos de forma mais simples e acessível',
    },
    {
      id: 'expand',
      name: 'Expandir Texto',
      icon: Maximize2,
      description: 'Adiciona mais detalhes descritivos e expande ideias de forma natural',
    },
    {
      id: 'originality',
      name: 'Verificação de Originalidade',
      icon: Shield,
      description: 'Analisa padrões repetitivos e detecta frases clichês ou genéricas',
    },
    {
      id: 'generate',
      name: 'Sugestões Generativas',
      icon: Sparkles,
      description: 'Gera rascunhos alternativos e ideias para brainstorming baseados em prompts',
    },
    {
      id: 'consistency',
      name: 'Outras Sugestões',
      icon: Lightbulb,
      description: 'Verifica consistência, fluxo lógico e sugere melhorias narrativas',
    },
  ];

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

  const handleMouseEnter = (tooltipType: string) => {
    const timer = setTimeout(() => {
      setShowTooltip(tooltipType);
    }, 1000);
    setTooltipTimer(timer);
  };

  const handleMouseLeave = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
      setTooltipTimer(null);
    }
    setShowTooltip(null);
  };

  const handleExport = (format: string) => {
    setSelectedExportFormat(format);
    setShowExportModal(true);
    setShowExportMenu(false);
  };

  const handleCreateDocument = (data: NewDocumentData) => {
    console.log('Criando novo documento:', data);
    setShowNewDocumentModal(false);
  };

  const handleConfirmExport = (data: ExportData) => {
    console.log(`Exportando como ${selectedExportFormat}:`, data);
    setShowExportModal(false);
  };

  const handleDependenciesComplete = () => {
    setCurrentScreen('editor');
  };

  const handleNewDocument = () => {
    setEditorContent('<p>Novo documento...</p>');
    setCurrentFilePath(null);
  };

  const handleOpen = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });
      if (typeof selectedPath === 'string') {
        const content = await readTextFile(selectedPath);
        setEditorContent(content);
        setCurrentFilePath(selectedPath);
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  };

  const handleSaveAs = async () => {
    // try {
    //   const newPath = await save({
    //     filters: [{ name: 'Markdown', extensions: ['md'] }]
    //   });
    //   if (newPath) {
    //     await writeTextFile(newPath, editorContent);
    //     setCurrentFilePath(newPath);
    //     console.log("File saved successfully at new path!");
    //   }
    // } catch (error) {
    //   console.error("Error saving file:", error);
    // }
  };

  const handleSave = async () => {
    if (currentFilePath) {
      try {
        await writeTextFile(currentFilePath, editorContent);
        console.log("File saved successfully!");
      } catch (error) {
        console.error("Error saving file:", error);
      }
    } else {
      await handleSaveAs();
    }
  };

  if (currentScreen === 'dependencies') {
    return <DependencyCheckScreen onComplete={handleDependenciesComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Barra Superior */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-400" />
              <h1 className="text-lg font-semibold text-white">Clareza</h1>
            </div>
            <div className="flex items-center space-x-2 ml-8">
              <div className="relative">
                <button
                  onClick={handlePreviousVersion}
                  disabled={currentVersion === 1}
                  onMouseEnter={() => handleMouseEnter('previous')}
                  onMouseLeave={handleMouseLeave}
                  className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {showTooltip === 'previous' && (
                  <div className="absolute top-8 left-0 z-10 px-2 py-1 bg-gray-900 text-white text-xs rounded border border-gray-600 whitespace-nowrap">
                    Voltar para versão anterior
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-300 font-medium px-2">V{currentVersion}</span>
              <div className="relative">
                <button
                  onClick={handleNextVersion}
                  disabled={currentVersion === maxVersion}
                  onMouseEnter={() => handleMouseEnter('next')}
                  onMouseLeave={handleMouseLeave}
                  className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {showTooltip === 'next' && (
                  <div className="absolute top-8 right-0 z-10 px-2 py-1 bg-gray-900 text-white text-xs rounded border border-gray-600 whitespace-nowrap">
                    Avançar para próxima versão
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleNewDocument}
              className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Novo Documento</span>
            </button>
            <button onClick={handleOpen} className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors">
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm">Abrir</span>
            </button>
            <button onClick={handleSave} className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors">
              <Save className="w-4 h-4" />
              <span className="text-sm">Salvar</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Exportar</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20">
                  <div className="py-1">
                    {/* <button
                      onClick={() => handleExport('PDF')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => handleExport('EPUB')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      EPUB
                    </button> 
                    <button
                      onClick={() => handleExport('DOCX')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      DOCX
                    </button>*/}
                    <button
                      onClick={() => handleExport('Markdown')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      Markdown
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {showExportMenu && <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />}

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
      />

      <div className="flex flex-1">
        {/* Sidebar Esquerda */}
        <aside className="w-80 bg-gray-800 border-r border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white mb-4">Ferramentas de IA</h2>
            <div className="space-y-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="group relative">
                    <button
                      onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                        selectedTool === tool.id
                          ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                          : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{tool.name}</span>
                    </button>
                    <div className="absolute left-full ml-2 top-0 z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-600">
                      {tool.description}
                      <div className="absolute left-0 top-3 -ml-1 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-gray-600"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-white mb-3">Pedido Personalizado</h3>
            <div className="space-y-3">
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Descreva o que você gostaria que a IA faça com seu texto..."
                className="w-full p-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <button
                disabled={!customPrompt.trim()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Enviar Pedido</span>
              </button>
            </div>
          </div>
        </aside>
        {/* Área Principal do Editor */}
        <main className="flex-1">
          <div className="w-full h-full min-h-[500px] bg-gray-800">
            <TextEditor content={editorContent} onContentChange={setEditorContent} />
          </div>
        </main>
      </div>
    </div>
  );
}