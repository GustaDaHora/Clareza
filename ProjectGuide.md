# 📘 Especificação do Projeto – Editor de Texto Inteligente

## 1. Ideia Principal

Criar um aplicativo desktop open source, local e cross-platform (Windows, macOS, Linux, e futuramente iOS/Android via Tauri 2.0) que funcione como um “Grammarly em português” e futuramente com qualquer idioma, utilizando o Google Gemini CLI como motor de revisão de texto.

- O app será feito em Tauri (Rust + React + Vite + Tailwind).
- O editor de texto principal será o CodeMirror  (mesmo do Obsidian).
- O fluxo de revisão será baseado em prompts pré-definidos, enviados ao Gemini CLI pelo backend em Rust.

---

## 2. Fluxo de Instalação e Configuração

Ao instalar o aplicativo, o usuário passará por uma checagem inicial de dependências:

1. Verificação de Bun
   - O backend em Rust executa `bun --version`.
   - Se não estiver instalado, o app exibe um botão "Instalar Bun".
   - Esse botão abre o site oficial do Bun com instruções de instalação.

2. Verificação de Node.js (Opcional)
   - O backend executa `node -v`.
   - O Node.js é opcional, pois o Bun é o runtime principal.
   - Exibido apenas para informação.

3. Verificação de NPM (Opcional)
   - O backend executa `npm -v`.
   - O npm é opcional, pois o Bun substitui sua funcionalidade.
   - Exibido apenas para informação.

4. Verificação do Gemini CLI
   - O backend executa `gemini --version` (ou o comando equivalente).
   - Se não estiver instalado, botão "Instalar Gemini CLI" → backend baixa e instala via `bun install -g @google/gemini-cli`.
   - Sistema prioriza Bun, mas pode usar npm se disponível.

5. Verificação de Login
   - O backend executa `gemini auth status`.
   - Se não logado, ele inicia o Gemini CLI em modo `auth login`.
   - O Gemini CLI abrirá o navegador padrão para autenticação via conta Google.
   - O backend pode simular o "Enter" na opção padrão 1 (Google).

👉 O backend em Rust será responsável por executar subprocessos e reportar status ao frontend (React).
👉 Dependências principais: **Bun** (obrigatório) e **Gemini CLI** (obrigatório).
👉 Node.js e npm são opcionais e mantidos apenas para compatibilidade.

---

## 3. Fluxo de Uso do Aplicativo

Depois de configurado:

1. Tela Inicial
   - Botão “Novo Documento”.
   - Lista de documentos recentes.

2. Editor de Texto
   - Editor com um componente de editor que suporte a formatação em tempo real do Markdown.
   - Barra lateral com botões de ação:
     - “Corrigir Gramática”
     - “Tornar mais Formal”
     - “Tornar mais Informal”
     - “Revisar Arquivo” (usando `@arquivo` do Gemini CLI)

   - Área de resposta lateral → mostra sugestões, diffs ou substituições propostas.

3. Comunicação com Gemini CLI
   - O frontend envia para o backend Rust um comando.
   - Backend monta o prompt conforme a ação escolhida.
   - Backend roda Gemini CLI com subprocesso, envia o prompt via stdin.
   - Captura a saída (stdout) e retorna ao frontend.
   - Frontend exibe no painel lateral → usuário pode “Aceitar” ou “Ignorar” as sugestões.

---

## 4. Arquitetura Técnica

- Frontend (UI):
  - React + Vite + TypeScript + Tailwind.
  - CodeMirror para edição.
  - Componentes:
    - Editor principal.
    - Barra lateral de ações.
    - Painel de resultados (sugestões).

- Backend (Rust – Tauri):
  - Responsável por:
    - Verificar dependências (Bun, Gemini CLI, opcionalmente Node/npm).
    - Instalar dependências sob comando do usuário.
    - Rodar Gemini CLI via subprocessos (`Command`).
    - Tratar stdout/stderr e retornar para o frontend.
    - Automatizar login no Gemini (responder opção 1).

## 5. Diferenciais

- 100% local: nenhuma comunicação com servidores externos além do Gemini CLI instalado na máquina do usuário.
- Open source: transparência total do código.
- Privacidade: o texto do usuário nunca sai da máquina.
- Extensível: prompts customizáveis → usuário pode adicionar suas próprias transformações (ex: “reescreva como poesia”).
