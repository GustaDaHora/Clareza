# 📘 Especificação do Projeto – Editor de Texto com Gemini CLI

## 1. Ideia Principal

Criar um aplicativo desktop open source, local e cross-platform (Windows, macOS, Linux, e futuramente iOS/Android via Tauri 2.0) que funcione como um “Grammarly em português”, utilizando o Google Gemini CLI como motor de revisão de texto.

- O app será feito em Tauri (Rust + React + Vite + Tailwind).
- O editor de texto principal será o Monaco Editor (mesmo do VS Code).
- O fluxo de revisão será baseado em prompts pré-definidos, enviados ao Gemini CLI pelo backend em Rust.

---

## 2. Fluxo de Instalação e Configuração

Ao instalar o aplicativo, o usuário passará por uma checagem inicial de dependências:

1. Verificação de Node.js
   - O backend em Rust executa `node -v`.
   - Se não estiver instalado, o app exibe um botão “Instalar Node.js”.
   - Esse botão dispara um comando Rust que baixa e instala o Node.js compatível com o SO.

2. Verificação de NPM
   - O backend executa `npm -v`.
   - Se não estiver instalado, oferece botão para instalar via Node.js installer.

3. Verificação do Gemini CLI
   - O backend executa `gemini --version` (ou o comando equivalente).
   - Se não estiver instalado, botão “Instalar Gemini CLI” → backend baixa e instala via `npm install -g @google/gemini-cli`.

4. Verificação de Login
   - O backend executa `gemini auth status`.
   - Se não logado, ele inicia o Gemini CLI em modo `auth login`.
   - O Gemini CLI abrirá o navegador padrão para autenticação via conta Google.
   - O backend pode simular o “Enter” na opção padrão 1 (Google).

👉 O backend em Rust será responsável por executar subprocessos (`std::process::Command`) e reportar status ao frontend (React).

---

## 3. Fluxo de Uso do Aplicativo

Depois de configurado:

1. Tela Inicial
   - Botão “Novo Documento”.
   - Lista de documentos recentes.

2. Editor de Texto (Monaco Editor)
   - Editor com suporte a highlight e integração futura com sugestões inline.
   - Barra lateral com botões de ação:
     - “Corrigir Gramática”
     - “Tornar mais Formal”
     - “Tornar mais Informal”
     - “Revisar Arquivo” (usando `@arquivo` do Gemini CLI)

   - Área de resposta lateral → mostra sugestões, diffs ou substituições propostas.

3. Comunicação com Gemini CLI
   - O frontend envia para o backend Rust um comando `invoke("processar_texto", { texto, acao })`.
   - Backend monta o prompt conforme a ação escolhida.
   - Backend roda Gemini CLI com subprocesso, envia o prompt via stdin.
   - Captura a saída (stdout) e retorna ao frontend.
   - Frontend exibe no painel lateral → usuário pode “Aceitar” ou “Ignorar” as sugestões.

---

## 4. Arquitetura Técnica

- Frontend (UI):
  - React + Vite + TypeScript + Tailwind.
  - Monaco Editor para edição.
  - Componentes:
    - Editor principal.
    - Barra lateral de ações.
    - Painel de resultados (sugestões).

- Backend (Rust – Tauri):
  - Responsável por:
    - Verificar dependências (Node, NPM, Gemini CLI).
    - Instalar dependências sob comando do usuário.
    - Rodar Gemini CLI via subprocessos (`Command`).
    - Tratar stdout/stderr e retornar para o frontend.
    - Automatizar login no Gemini (responder opção 1).

---

## 5. Roadmap MVP

1. MVP 1: Setup + Editor
   - Editor Monaco + botão “Revisar Gramática”.
   - Backend rodando Gemini CLI e retornando resposta crua.

2. MVP 2: Dependência Automática
   - Checagem de Node/NPM/Gemini CLI.
   - Botões de instalação automática.
   - Login automático no Gemini CLI.

3. MVP 3: Experiência de Escrita
   - Barra lateral com múltiplas ações.
   - Exibição de sugestões em painel lateral.
   - Exportar documento em `.md` e `.docx`.

4. MVP 4: Refinamento
   - Destaque inline de erros no Monaco Editor.
   - Sugestões “click-to-apply”.
   - Histórico de revisões.

---

## 6. Diferenciais

- 100% local: nenhuma comunicação com servidores externos além do Gemini CLI instalado na máquina do usuário.
- Open source: transparência total do código.
- Privacidade: o texto do usuário nunca sai da máquina.
- Extensível: prompts customizáveis → usuário pode adicionar suas próprias transformações (ex: “reescreva como poesia”).
