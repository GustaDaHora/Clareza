'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Download, FileText, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface DependencyCheck {
  name: string;
  status: 'checking' | 'installed' | 'missing';
  description: string;
  version?: string;
  error?: string;
}

interface DependencyResult {
  name: string;
  installed: boolean;
  version?: string;
  error?: string;
}

interface DependencyCheckScreenProps {
  onComplete: () => void;
}

interface DependencyCheck {
  name: string;
  status: 'checking' | 'installed' | 'missing';
  description: string;
  version?: string;
  error?: string;
}

interface DependencyResult {
  name: string;
  installed: boolean;
  version?: string;
  error?: string;
}

interface DependencyCheckScreenProps {
  onComplete: () => void;
}

export default function DependencyCheckScreen({ onComplete }: DependencyCheckScreenProps) {
  const [dependencies, setDependencies] = useState<DependencyCheck[]>([
    {
      name: 'Node.js',
      status: 'checking',
      description: 'Runtime JavaScript necessário para o backend',
    },
    {
      name: 'NPM',
      status: 'checking',
      description: 'Gerenciador de pacotes do Node.js',
    },
    {
      name: 'Gemini CLI',
      status: 'checking',
      description: 'Interface de linha de comando do Google Gemini',
    },
  ]);
  const [showError, setShowError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  useEffect(() => {
    const checkDependencies = async () => {
      setIsChecking(true);

      // Test basic connectivity first
      try {
        const pong = await invoke<string>('ping');
        console.log('Ping test:', pong);
      } catch (e) {
        console.error('Ping failed', e);
        setDependencies((prev) =>
          prev.map((dep) => ({
            ...dep,
            status: 'missing',
            error: 'Failed to connect to backend.',
          })),
        );
        setShowError(true);
        setIsChecking(false);
        return;
      }

      const checks: { name: string; command: string }[] = [
        { name: 'Node.js', command: 'check_node' },
        { name: 'NPM', command: 'check_npm' },
        { name: 'Gemini CLI', command: 'check_gemini' },
      ];

      for (const check of checks) {
        try {
          const result = await invoke<DependencyResult>(check.command);
          const depName = result.name;

          setDependencies((prev) =>
            prev.map((d) => {
              if (d.name.toLowerCase() === depName.toLowerCase()) {
                return {
                  ...d,
                  status: result.installed ? 'installed' : 'missing',
                  version: result.version,
                  error: result.error,
                };
              }
              return d;
            }),
          );

          if (!result.installed && depName.toLowerCase().includes('gemini')) {
            setShowError(true);
          }
        } catch (err: unknown) {
          setDependencies((prev) =>
            prev.map((d) => (d.name === check.name ? { ...d, status: 'missing', error: (err as Error).message } : d)),
          );
          if (check.name.toLowerCase().includes('gemini')) {
            setShowError(true);
          }
        }
      }

        // Se Gemini CLI estiver instalado, inicia o processo
        const geminiDep = dependencies.find(dep => dep.name === 'Gemini CLI');
        if (geminiDep && geminiDep.status === 'installed') {
          try {
            await invoke('start_gemini_cli');
            console.log('Gemini CLI iniciado com sucesso');
          } catch (e) {
            console.error('Falha ao iniciar Gemini CLI:', e);
          }
        }
      setIsChecking(false);
    };

    checkDependencies();
  }, []);

  const handleInstallGemini = () => {
    console.log('Iniciando instalação do Gemini CLI...');
    // You can implement actual installation logic here
  };

  const canProceed =
    dependencies.every((dep) => dep.status === 'installed') ||
    dependencies.filter((dep) => dep.status === 'installed').length >= 2;

  return (
    <div className="overflow-hidden min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <FileText className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Clareza</h1>
          <p className="text-gray-300">
            {isChecking ? 'Verificando dependências do sistema...' : 'Verificação concluída'}
          </p>
        </div>

        <div className="space-y-4">
          {dependencies.map((dep) => (
            <div key={dep.name} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-700">
              <div className="flex-shrink-0">
                {dep.status === 'checking' && <Circle className="w-5 h-5 text-gray-400 animate-pulse" />}
                {dep.status === 'installed' && <CheckCircle className="w-5 h-5 text-green-400" />}
                {dep.status === 'missing' && <X className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-white">{dep.name}</p>
                  {dep.version && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">v{dep.version}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{dep.description}</p>
                {dep.error && <p className="text-xs text-red-400 mt-1">Erro: {dep.error}</p>}
              </div>
              {dep.status === 'missing' && dep.name === 'Gemini CLI' && (
                <button
                  onClick={handleInstallGemini}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Instalar</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {showError && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">
              {dependencies.every((dep) => dep.status === 'missing')
                ? 'Não foi possível conectar ao backend. Verifique se o Tauri está funcionando corretamente.'
                : 'Algumas dependências estão faltando. O Gemini CLI é obrigatório para continuar.'}
            </p>
          </div>
        )}

        {!isChecking && canProceed && (
          <div className="mt-6">
            <button
              onClick={onComplete}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
