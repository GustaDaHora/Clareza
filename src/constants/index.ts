// src/constants/index.ts
import { 
  CheckCircle, 
  Wand2, 
  Volume2, 
  Minimize2, 
  Maximize2, 
  Shield, 
  Sparkles, 
  Lightbulb 
} from 'lucide-react';

import { Tool } from '../types';
import { PROMPTS } from './prompts';

export const TOOLTIP_DELAY = 1000;
export const DEFAULT_CONTENT = '<p>Comece a escrever aqui...</p>';

export const TOOLS: Tool[] = [
  {
    id: 'grammar',
    name: 'Correção Gramatical',
    icon: CheckCircle,
    description: 'Revise exclusivamente erros gramaticais (ortografia, pontuação, concordância, coesão e fluxo), preservando a ideia e a voz do autor.',
    prompt: PROMPTS.grammarCorrection,
  },
  {
    id: 'style',
    name: 'Melhorias de Estilo',
    icon: Wand2,
    description: 'Reescreve o texto para melhorar clareza, concisão e impacto, sem alterar ideias ou tom do autor.',
    prompt: PROMPTS.styleImprovements,
  },
  {
    id: 'tone',
    name: 'Ajuste de Tom',
    icon: Volume2,
    description: 'Adapta exclusivamente o tom da escrita (formal, casual, persuasivo etc.) mantendo conteúdo e intenção.',
    prompt: PROMPTS.toneAdjustment,
  },
  {
    id: 'simplify',
    name: 'Simplificar Texto',
    icon: Minimize2,
    description: 'Torna trechos complexos mais simples e acessíveis sem omitir informações relevantes.',
    prompt: PROMPTS.simplifyText,
  },
  {
    id: 'expand',
    name: 'Expandir Texto',
    icon: Maximize2,
    description: 'Expande ideias existentes com mais detalhes e exemplos, preservando a essência original.',
    prompt: PROMPTS.expandText,
  },
  {
    id: 'originality',
    name: 'Verificação de Originalidade',
    icon: Shield,
    description: 'Identifica trechos repetitivos, clichês ou genéricos e sugere alternativas mais autênticas.',
    prompt: PROMPTS.originalityCheck,
  },
  {
    id: 'generate',
    name: 'Sugestões Generativas',
    icon: Sparkles,
    description: 'Gera rascunhos alternativos e ideias criativas para brainstorming sem substituir o texto original.',
    prompt: PROMPTS.generativeSuggestions,
  },
  {
    id: 'consistency',
    name: 'Outras Sugestões',
    icon: Lightbulb,
    description: 'Analisa consistência, fluxo lógico e clareza narrativa, sugerindo melhorias estruturais.',
    prompt: PROMPTS.otherSuggestions,
  },
];
