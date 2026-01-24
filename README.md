# Polaris - Build a Cursor AI Alternative

This is the repository for a comprehensive [YouTube tutorial series](https://youtu.be/Xf9rHPNBMyQ) where we build a **fully-featured cloud IDE** from scratch.

[![Watch the Tutorial](https://img.shields.io/badge/YouTube-Watch%20Tutorial-red?style=for-the-badge&logo=youtube)](https://youtu.be/Xf9rHPNBMyQ)

> **Status:** ✅ **COMPLETE** - All 16 chapters implemented! The codebase includes AI Agent, WebContainer preview, GitHub integration, and AI project generation.

## What We're Building

Polaris is a browser-based IDE inspired by Cursor AI, featuring:

- Real-time collaborative code editing
- AI-powered code suggestions and quick edit (Cmd+K)
- Conversation-based AI assistant
- In-browser code execution with WebContainer
- GitHub import/export integration
- Multi-file project management

## Tech Stack

| Category      | Technologies                                                |
| ------------- | ----------------------------------------------------------- |
| **Frontend**  | Next.js 16, React 19, TypeScript, Tailwind CSS 4            |
| **Editor**    | CodeMirror 6, Custom Extensions, One Dark Theme             |
| **Backend**   | Convex (Real-time DB), Inngest (Background Jobs)            |
| **AI**        | AI SDK + Cerebras GLM-4.7 (primary, 1000 TPS) + OpenRouter fallback |
| **Auth**      | Stack Auth (with GitHub OAuth, M2M for Electron)            |
| **Execution** | WebContainer API, xterm.js                                  |
| **UI**        | shadcn/ui, Radix UI                                         |
| **Desktop**   | Electron (cross-platform app)                               |
| **Monitoring**| Sentry (Error Tracking & LLM Monitoring)                    |
| **Scraping**  | Firecrawl (Documentation scraping for AI)                   |

## Tutorial Contents (All 16 Chapters)

### Part 1: Foundation & Core Features (Chapters 1-12)

#### Phase 1: Foundation & Sponsor Technologies
- ✅ **Chapter 1:** Project Setup, UI Library & Theme
- ✅ **Chapter 2:** Stack Auth (Upgraded from Clerk) & Protected Routes
- ✅ **Chapter 3:** Convex Database & Real-time Setup
- ✅ **Chapter 4:** Inngest - Background Jobs & Non-Blocking UI
- ✅ **Chapter 5:** Firecrawl - Teaching AI with Live Documentation
- ✅ **Chapter 6:** Sentry - Error Tracking & LLM Monitoring
- ✅ **Chapter 7:** Projects Dashboard & Landing Page

#### Phase 2: File System & Editor
- ✅ **Chapter 8:** Project IDE Layout & Resizable Panes
- ✅ **Chapter 9:** File Explorer - Full Implementation
- ✅ **Chapter 10:** Code Editor & State Management

#### Phase 3: AI Features
- ✅ **Chapter 11:** AI Suggestions & Quick Edit (Cmd+K)
- ✅ **Chapter 12:** Conversation System

### Part 2: Advanced Features (Chapters 13-16)

- ✅ **Chapter 13:** AI Agent & Tools (AI SDK + Inngest, file management tools)
- ✅ **Chapter 14:** WebContainer, Terminal & Preview
- ✅ **Chapter 15:** GitHub Import & Export
- ✅ **Chapter 16:** AI Project Creation & Final Polish

## Getting Started

### Prerequisites

- Node.js 20.09+ (or 22+ recommended)
- npm, pnpm, or bun
- Accounts needed:
  - [Stack Auth](https://stack-auth.com) - Authentication (FREE)
  - [Convex](https://cwa.run/convex) - Database (FREE tier)
  - [Inngest](https://cwa.run/inngest) - Background jobs (FREE tier)
  - [Cerebras AI](https://inference.cerebras.ai) - AI API for GLM-4.7 (FREE tier available)
  - [OpenRouter](https://openrouter.ai) - AI API fallback (required for backup)
  - [GitHub](https://github.com) - OAuth for import/export (FREE)
  - [Firecrawl](https://cwa.run/firecrawl) - Web scraping (optional)
  - [Sentry](https://cwa.run/sentry) - Error tracking (optional)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/code-with-antonio/polaris.git
   cd polaris
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

4. Configure your `.env.local` with the required keys:

   ```env
   # Stack Auth (REQUIRED)
   NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_publishable_key
   STACK_SECRET_SERVER_KEY=your_stack_secret_key

   # Convex (REQUIRED)
   NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   CONVEX_DEPLOYMENT=prod:your-deployment-name
   POLARIS_CONVEX_INTERNAL_KEY=generate_a_random_string_here

   # AI Providers (BOTH REQUIRED)
   CEREBRAS_API_KEY=your_cerebras_api_key      # Primary - GLM-4.7 (1000 tokens/sec)
   OPENROUTER_API_KEY=your_openrouter_api_key  # Fallback - Used when Cerebras is busy

   # GitHub OAuth (REQUIRED for import/export)
   GITHUB_CLIENT_ID=your_github_oauth_client_id
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
   GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

   # Firecrawl (OPTIONAL)
   FIRECRAWL_API_KEY=your_firecrawl_api_key

   # Sentry (OPTIONAL)
   SENTRY_DSN=your_sentry_dsn
   
   # Paddle (OPTIONAL - for subscriptions)
   PADDLE_VENDOR_ID=your_paddle_vendor_id
   PADDLE_API_KEY=your_paddle_api_key
   PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
   ```

   **Setup Guide:**
   
   1. **Stack Auth**: 
      - Go to https://app.stack-auth.com
      - Create a new project
      - Copy Project ID, Publishable Key, and Secret Key
      - Enable GitHub OAuth in Stack Auth dashboard
   
   2. **Convex**:
      - Go to https://dashboard.convex.dev
      - Create a new project
      - Copy deployment URL
      - Generate a random string for `POLARIS_CONVEX_INTERNAL_KEY`
   
   3. **Cerebras** (Primary AI):
      - Go to https://inference.cerebras.ai
      - Sign up for free tier (1000 tokens/sec)
      - Generate API key
   
   4. **OpenRouter** (Fallback AI):
      - Go to https://openrouter.ai
      - Create account and add credits
      - Generate API key
   
   5. **GitHub OAuth**:
      - Go to GitHub Settings > Developer Settings > OAuth Apps
      - Create new OAuth app
      - Set callback URL to `http://localhost:3000/api/auth/github/callback`
      - Copy Client ID and Secret

5. Start the Convex development server:

   ```bash
   npx convex dev
   ```

6. In a new terminal, start the Next.js development server:

   ```bash
   npm run dev
   ```

7. In another terminal, start the Inngest dev server:

   ```bash
   npx inngest-cli@latest dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── messages/      # Conversation API
│   │   ├── suggestion/    # AI suggestions
│   │   └── quick-edit/    # Cmd+K editing
│   └── projects/          # Project pages
├── components/            # Shared components
│   ├── ui/               # shadcn/ui components
│   └── ai-elements/      # AI conversation components
├── features/
│   ├── auth/             # Authentication
│   ├── conversations/    # AI chat system
│   ├── editor/           # CodeMirror setup
│   │   └── extensions/   # Custom extensions
│   ├── preview/          # WebContainer (Part 2)
│   └── projects/         # Project management
├── inngest/              # Inngest client
└── lib/                  # Utilities

convex/
├── schema.ts             # Database schema
├── projects.ts           # Project queries/mutations
├── files.ts              # File operations
├── conversations.ts      # Conversation operations
└── system.ts             # Internal API for Inngest
```

## Features Implemented ✅

### 🎨 Code Editor
- Syntax highlighting for JS, TS, CSS, HTML, JSON, Markdown, Python
- Line numbers and code folding
- Minimap overview
- Bracket matching and indentation guides
- Multi-cursor editing
- Auto-save with debouncing
- Tab-based file navigation
- VSCode-style file icons

### 🤖 AI Features
- **Real-time code suggestions** with ghost text
- **Quick edit (Cmd+K)** - Select code + natural language instruction
- **AI Conversations** - Chat sidebar with message history
- **AI Agent with Tools** - Can read, write, delete files
- **Project Generation** - Generate entire projects from descriptions
- Cerebras GLM-4.7 (1000 tokens/sec) + OpenRouter fallback
- Tool usage logging and tracking
- Streaming responses

### 📁 File Management
- File explorer with folder hierarchy
- Create, rename, delete files and folders
- Real-time synchronization
- Optimistic UI updates
- Project structure navigation
- Import from GitHub repositories
- Export to GitHub repositories

### 💻 Code Execution
- **WebContainer** - In-browser Node.js runtime
- **Terminal** - Full xterm.js terminal with shell
- **Live Preview** - See your app running in real-time
- Execute npm commands
- Run development servers
- See console output

### 🔐 Authentication & Security
- Stack Auth with GitHub OAuth
- Protected routes
- Session management
- M2M authentication for Electron
- Secure token storage

### 🎯 Real-time & Background Jobs
- Convex-powered instant updates
- Inngest background processing
- Non-blocking AI generation
- Progress tracking for long operations
- Generation event logging

### 🖥️ Desktop Application
- Electron app for Windows, macOS, Linux
- Native file system access
- Auto-updater
- Window management
- Cross-platform support

### 📊 Monitoring & Analytics
- Sentry error tracking
- LLM monitoring via Inngest middleware
- Performance monitoring
- Generation logs

### 💎 Additional Features
- PWA support (installable web app)
- Paddle subscription integration
- Dark theme (Catppuccin)
- Resizable panes with Allotment
- Responsive design
- Keyboard shortcuts

## Scripts

### Web Application
```bash
npm run dev                 # Start Next.js development server
npm run build               # Build for production
npm run start               # Start production server
npm run lint                # Run ESLint
```

### Convex & Inngest
```bash
npx convex dev              # Start Convex development server
npm run dev:inngest         # Start Inngest dev server
```

### Testing
```bash
npm run test                # Run Vitest unit tests
npm run test:ui             # Run tests with UI
npm run test:coverage       # Run tests with coverage
npm run test:e2e            # Run Playwright e2e tests
npm run test:e2e:ui         # Run e2e tests with UI
```

### Electron Desktop App
```bash
npm run electron:dev        # Start Electron in development mode
npm run electron:build      # Build desktop app for current platform
npm run electron:build:win  # Build for Windows
npm run electron:build:linux # Build for Linux
```

## Tutorial Links

- **YouTube Playlist:** [Watch Full Series](https://youtu.be/Xf9rHPNBMyQ)
- **Part 1:** Chapters 1-12 (Foundation & Core Features)
- **Part 2:** Chapters 13-16 (AI Agent, WebContainer, GitHub)

## Migration Notes

This project was migrated from **Clerk** to **Stack Auth** and from **AgentKit** to **AI SDK + Inngest**. See:
- `STACK_AUTH_MIGRATION_SUMMARY.md` - Complete migration details
- `MIGRATION_GUIDE.md` - Step-by-step migration guide
- `FEATURE_AUDIT.md` - Complete feature audit

## Sponsors

A huge thank you to the sponsors who made this tutorial possible. Consider checking them out - they offer generous free tiers perfect for learning!

### Authentication

**[Stack Auth](https://stack-auth.com)** - Modern authentication with built-in OAuth and M2M support.

### Database

**[Convex](https://cwa.run/convex)** - The real-time database that makes building collaborative apps a breeze.

### Background Jobs

**[Inngest](https://cwa.run/inngest)** - Reliable background jobs and event-driven workflows.

### Web Scraping

**[Firecrawl](https://cwa.run/firecrawl)** - Turn any website into LLM-ready data.

### Error Tracking

**[Sentry](https://cwa.run/sentry)** - See what's broken and fix it fast.

### Code Review

**[CodeRabbit](https://cwa.run/coderabbit)** - AI-powered code reviews that catch bugs before your users do.

## Acknowledgments

- [Cursor](https://cursor.sh) - Inspiration for the project
- [Orchids](https://orchids.app) - Inspiration for the project
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [CodeMirror](https://codemirror.net) - Code editor
