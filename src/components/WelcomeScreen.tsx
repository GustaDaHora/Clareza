import { FileText, Plus, FolderOpen, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';

interface RecentFile {
    path: string;
    name: string;
    last_opened: string;
}

interface WelcomeScreenProps {
    onNewDocument: () => void;
    onOpenDocument: () => void;
    onOpenRecent: (path: string) => void;
}

export default function WelcomeScreen({
    onNewDocument,
    onOpenDocument,
    onOpenRecent,
}: WelcomeScreenProps) {
    const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        const fetchRecentFiles = async () => {
            try {
                const files = await invoke<RecentFile[]>('get_recent_files');
                setRecentFiles(files);
            } catch (error) {
                console.error('Failed to fetch recent files:', error);
            }
        };

        const fetchVersion = async () => {
            try {
                const appVersion = await getVersion();
                setVersion(appVersion);
            } catch (error) {
                console.error('Failed to fetch version:', error);
            }
        };

        fetchRecentFiles();
        fetchVersion();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 text-white">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-blue-600/20 rounded-2xl">
                            <FileText className="w-16 h-16 text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Clareza
                    </h1>
                    <p className="text-gray-400 text-lg">Editor de texto inteligente com IA</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <button
                        onClick={onNewDocument}
                        className="group relative p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl transition-all duration-300 text-left"
                    >
                        <div className="absolute top-6 right-6 p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <Plus className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Novo Documento</h3>
                        <p className="text-gray-400 text-sm">
                            Comece a escrever do zero com ajuda da IA
                        </p>
                    </button>

                    <button
                        onClick={onOpenDocument}
                        className="group relative p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-purple-500/50 rounded-xl transition-all duration-300 text-left"
                    >
                        <div className="absolute top-6 right-6 p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                            <FolderOpen className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Abrir Arquivo</h3>
                        <p className="text-gray-400 text-sm">
                            Edite seus arquivos Markdown existentes
                        </p>
                    </button>
                </div>

                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="p-4 border-b border-gray-700/50 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <h3 className="font-medium text-gray-300">Recentes</h3>
                    </div>

                    <div className="divide-y divide-gray-700/50">
                        {recentFiles.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Nenhum arquivo recente encontrado
                            </div>
                        ) : (
                            recentFiles.map((file) => (
                                <button
                                    key={file.path}
                                    onClick={() => onOpenRecent(file.path)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                        <div>
                                            <div className="font-medium text-gray-200 group-hover:text-white transition-colors">
                                                {file.name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate max-w-[300px]">
                                                {file.path}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(file.last_opened).toLocaleDateString()}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Version Label */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500">
                        Versão {version || '...'}
                    </p>
                </div>
            </div>
        </div>
    );
}
