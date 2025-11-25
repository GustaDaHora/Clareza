# Clareza

Um editor de texto inteligente com IA integrada, alimentado pelo Google Gemini CLI.

## 📋 Pré-requisitos

Antes de começar, você precisará ter instalado:

1. **[Bun](https://bun.sh/)** - Runtime JavaScript rápido e gerenciador de pacotes
   - Windows: `powershell -c "irm bun.sh/install.ps1|iex"`
   - macOS/Linux: `curl -fsSL https://bun.sh/install | bash`

2. **[Rust](https://rustup.rs/)** - Necessário para compilar o Tauri (backend)
   - Siga as instruções em [rustup.rs](https://rustup.rs/)

## 🚀 Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/GustaDaHora/Clareza.git
   cd Clareza
   ```

2. **Instale as dependências**
   ```bash
   bun install
   ```

3. **Configuração do Gemini CLI**
   
   O aplicativo irá guiá-lo através da configuração do Gemini CLI na primeira execução:
   - Verificação de dependências
   - Instalação automática do Gemini CLI (se necessário)
   - Autenticação com sua conta Google

## 💻 Desenvolvimento

Execute o aplicativo em modo de desenvolvimento:

```bash
bun run tauri:dev
```

Este comando irá:
- Iniciar o servidor de desenvolvimento Vite
- Compilar o backend Rust
- Abrir a janela do aplicativo

## 🏗️ Build

Para criar um build de produção:

```bash
bun run build
```

Para criar um executável Tauri:

```bash
bun run tauri:build
```

Os arquivos compilados estarão disponíveis em `src-tauri/target/release/`.

## 📝 Scripts Disponíveis

- `bun run dev` - Inicia apenas o servidor Vite (frontend)
- `bun run build` - Compila o frontend para produção
- `bun run preview` - Pré-visualização do build de produção
- `bun run tauri:dev` - Modo de desenvolvimento completo (Tauri + Vite)
- `bun run tauri:build` - Build de produção do aplicativo Tauri
- `bun run lint` - Executa o linter ESLint
- `bun run format` - Formata o código com Prettier

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Rust + Tauri
- **Runtime**: Bun
- **IA**: Google Gemini CLI

## 📖 Sobre o Projeto

Clareza é um editor de texto inteligente que utiliza a IA do Google Gemini para:
- Correção gramatical em tempo real
- Ajustes de tom (formal/informal)
- Sugestões de estilo e clareza
- Revisão de documentos completos

Tudo funcionando localmente na sua máquina, garantindo privacidade total dos seus textos.

## 📄 Licença

Apache-2.0 License - veja o arquivo [LICENSE](LICENSE) para detalhes.
