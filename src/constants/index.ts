// src/constants/index.ts
import { CheckCircle, Wand2, Volume2, Minimize2, Maximize2, Shield, Sparkles, Lightbulb } from 'lucide-react';
import { Tool } from '../types';

export const TOOLTIP_DELAY = 1000;
export const DEFAULT_CONTENT = '<p>Comece a escrever aqui...</p>';

export const TOOLS: Tool[] = [
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
