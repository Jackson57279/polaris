# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polaris is a cloud IDE inspired by Cursor AI, built with Next.js 16, React 19, and TypeScript. The project supports **dual deployment modes**: browser-based (with WebContainer) and Electron desktop app (with native file system). Key features include AI-powered code editing, real-time collaboration, conversation-based AI assistant, and in-browser/native code execution.

**Current Branch Context:** `electron-desktop-integration-polaris-ide` - This branch introduces dual-mode Polaris IDE with standalone Next.js server, IPC/native FS, auto-updater, and desktop CI/CD.

## Development Commands

### Web Development
```bash
# Install dependencies
npm install

# Start all required services (run in separate terminals)
npx convex dev              # Start Convex real-time DB
npm run dev                 # Start Next.js dev server (localhost:3000)
npx inngest-cli@latest dev  # Start Inngest background jobs

# Build & deployment
npm run build               # Production build
npm run start               # Production server

# Testing
npm run test                # Run Vitest unit tests
npm run test:ui             # Vitest UI
npm run test:coverage       # Coverage report
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Playwright UI mode

# Linting
npm run lint                # ESLint
```

### Electron Desktop Development
```bash
# Development (starts Next.js dev server + Electron)
npm run electron:dev        # Full Electron dev mode with hot reload

# Individual commands
npm run electron:dev:next     # Next.js dev server only
npm run electron:dev:electron # Electron wrapper (waits for Next.js)
npm run electron:compile      # Compile TypeScript to dist-electron/

# Building
npm run electron:build        # Full build (Next.js + Electron app)
npm run electron:build:next   # Build Next.js in standalone mode
npm run electron:build:app    # Package Electron app
npm run electron:build:win    # Windows-specific build
npm run electron:build:linux  # Linux-specific build
npm run electron:pack         # Build without installers (faster for testing)

# Electron testing
npm run test:electron       # Vitest tests for Electron-specific code
```

**Critical:** When working on Electron features, always compile TypeScript (`npm run electron:compile`) before running Electron in dev mode.

## Architecture & Code Organization

### High-Level Architecture

**Dual-Mode System:**
- **Browser Mode:** Uses WebContainer API for in-browser code execution with sandboxed Node.js environment
- **Electron Mode:** Native desktop app with direct file system access via IPC, standalone Next.js server managed by Electron main process

**Data Flow:**
1. **Frontend (Next.js):** React components, CodeMirror editor, UI state (Zustand)
2. **Backend (Convex):** Real-time database for projects/files/conversations/messages with optimistic updates
3. **Background Jobs (Inngest):** Async AI operations (project generation, message processing) to keep UI non-blocking
4. **AI Layer:** Claude Sonnet 4 (preferred) or Gemini 2.0 Flash with streaming responses
5. **Electron Bridge (Desktop Only):** IPC handlers for native file system, dialogs, notifications, auto-updates

### Directory Structure

```
polaris/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes (messages, suggestion, quick-edit, github, paddle)
│   │   └── projects/[projectId]/ # Project IDE page
│   ├── components/
│   │   ├── ai-elements/          # AI conversation UI (message, reasoning, tool, code-block)
│   │   └── ui/                   # shadcn/ui components
│   ├── features/                 # Feature-based modules
│   │   ├── auth/                 # Clerk authentication
│   │   ├── conversations/        # AI chat system + Inngest message processor
│   │   ├── editor/               # CodeMirror setup + custom extensions
│   │   │   └── extensions/       # Selection tooltip, suggestions, quick-edit, minimap
│   │   ├── preview/              # WebContainer + terminal (xterm.js)
│   │   └── projects/             # File explorer, GitHub import/export
│   ├── inngest/                  # Background job definitions (client + functions)
│   └── lib/                      # Utilities, AI providers, AI tools, Electron bridges
│       └── electron/             # Electron-specific: file-system-bridge, ipc-client, environment
│
├── electron/                     # Electron desktop app
│   ├── main/                     # Main process
│   │   ├── index.ts              # Entry point, app lifecycle, protocol registration
│   │   ├── server-manager.ts     # Manages standalone Next.js server
│   │   ├── window-manager.ts     # Window creation and management
│   │   ├── auto-updater.ts       # electron-updater integration
│   │   ├── menu.ts               # Application menu
│   │   └── ipc/                  # IPC handlers (file-system, dialog, window, notification)
│   ├── preload/                  # Preload scripts (bridge between main/renderer)
│   └── resources/                # App icons and static assets
│
├── convex/                       # Convex backend
│   ├── schema.ts                 # DB schema (users, projects, files, conversations, messages)
│   ├── auth.ts                   # Clerk authentication
│   ├── projects.ts               # Project CRUD operations
│   ├── files.ts                  # File/folder operations
│   ├── conversations.ts          # Conversation management
│   └── system.ts                 # Internal API for Inngest (path-based file ops)
│
├── tests/                        # Test files
│   └── e2e/                      # Playwright E2E tests
│
├── electron-builder.yml          # Electron packaging config
├── next.config.ts                # Next.js config (standalone output for Electron)
├── vitest.config.ts              # Vitest config (web)
├── vitest.electron.config.ts     # Vitest config (Electron)
└── playwright.config.ts          # Playwright E2E config
```

### Key Architectural Patterns

**1. Convex Real-Time Database**
- All data operations go through Convex queries/mutations (no direct DB access)
- Automatic optimistic UI updates and real-time synchronization
- Every operation requires Clerk authentication via `verifyAuth()`
- Ownership validation: `project.ownerId === identity.subject`

**2. Inngest Background Jobs**
- AI operations run in background to keep UI responsive
- Event-driven: `project/generate`, `demo/generate`, `demo/error`
- Jobs receive `convexUrl`, `convexToken`, and `internalKey` for secure Convex access
- Example: `generateProject` function creates files using AI tools in background

**3. AI Integration**
- **Streaming:** AI SDK with streaming responses for real-time feedback
- **Tools:** AI agents use file tools (`readFile`, `writeFile`, `deleteFile`, `listFiles`, `getProjectStructure`)
- **Providers:** Anthropic Claude (preferred), Google Gemini, OpenRouter
- **Features:** Code suggestions (ghost text), quick edit (Cmd+K), conversation sidebar

**4. Electron Desktop Integration**
- **Server Manager:** Spawns standalone Next.js server in production, uses dev server in development
- **File System Bridge:** Unified API for native FS (Electron) and File System Access API (browser)
- **IPC Communication:** Type-safe IPC between main process (Node.js) and renderer (React)
- **Auto-Updater:** GitHub releases integration with electron-updater

**5. CodeMirror Editor Extensions**
- Language detection based on file extension (JS/TS/HTML/CSS/JSON/Markdown/Python)
- Custom extensions: selection tooltip (Add to Chat/Quick Edit), suggestions, minimap
- State management via CodeMirror StateField for reactive UI

**6. WebContainer (Browser Mode)**
- In-browser Node.js runtime using WebAssembly
- Requires COOP/COEP headers for SharedArrayBuffer (configured in `next.config.ts`)
- File sync between Convex DB and WebContainer
- Terminal (xterm.js) for command execution

## Environment Variables

Required `.env.local` variables:
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex Database
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
POLARIS_CONVEX_INTERNAL_KEY=  # Random string for internal API security

# AI Provider (choose one or both)
ANTHROPIC_API_KEY=            # Claude Sonnet 4 (preferred)
GOOGLE_GENERATIVE_AI_API_KEY= # Gemini 2.0 Flash (free alternative)

# Optional Services
FIRECRAWL_API_KEY=            # Web scraping for AI context
SENTRY_DSN=                   # Error tracking
```

## Important Conventions & Patterns

### Convex Backend
- **Authentication First:** Always call `verifyAuth()` before any database operation
- **Path-Based Operations:** Use `system.ts` internal API for path-based file operations (used by Inngest)
- **Recursive Operations:** Files/folders support recursive deletion via `deleteFile` mutation
- **Indexes:** Leverage indexes (`by_owner`, `by_project`, `by_parent`) for efficient queries

### React Components
- **Context Providers:** Use React Context for shared state (e.g., `MessageBranchContext`, `ReasoningContext`)
- **Zustand Stores:** Editor state managed via `useEditorStore` (open tabs, active file, etc.)
- **Streaming Support:** AI components handle streaming with loading states
- **Composition:** Modular components compose together (e.g., `PromptInput` with sub-components)

### Electron Development
- **Environment Detection:** Use `isElectron()` helper to detect Electron environment
- **IPC Handlers:** Register in `electron/main/ipc/index.ts`, expose via preload script
- **Type Safety:** Shared types in `electron/preload/types.ts` for IPC communication
- **Dual Mode Config:** `next.config.ts` conditionally outputs standalone build when `BUILD_ELECTRON=true`

### File System Operations
- **Unified API:** `FileSystemBridge` provides same interface for Electron and browser
- **Electron:** Uses IPC to native Node.js `fs` module
- **Browser:** Fallback to File System Access API (not fully implemented)
- **Path Validation:** All Electron file paths validated to prevent path traversal

### Testing
- **Unit Tests:** Vitest with happy-dom for React component testing
- **Electron Tests:** Separate Vitest config (`vitest.electron.config.ts`)
- **E2E Tests:** Playwright for full application testing
- **Coverage:** V8 coverage provider, excludes node_modules/convex/electron

## Security & Best Practices

- **No Client-Side Secrets:** All AI API keys server-side only
- **Path Traversal Protection:** Electron file operations validate paths against base directory
- **CORS Headers:** COOP/COEP headers for WebContainer SharedArrayBuffer (browser mode)
- **Internal API Key:** Inngest background jobs authenticate with `POLARIS_CONVEX_INTERNAL_KEY`
- **Clerk Authentication:** All Convex operations require authenticated user
- **Single Instance Lock:** Electron ensures only one app instance runs (see `app.requestSingleInstanceLock()`)

## Common Development Patterns

### Adding a New Convex Table
1. Define schema in `convex/schema.ts` with indexes
2. Create queries/mutations in dedicated file (e.g., `convex/newTable.ts`)
3. Add `verifyAuth()` to all operations
4. Update TypeScript types via `npx convex dev` auto-generation

### Adding a New AI Tool
1. Define tool in `src/lib/ai-tools.ts` using `tool()` from AI SDK
2. Add input schema with Zod
3. Implement `execute` function calling Convex mutations/queries
4. Include in `createFileTools()` return object

### Adding a New CodeMirror Extension
1. Create extension file in `src/features/editor/extensions/`
2. Use `StateField` for reactive state, `ViewPlugin` for DOM updates
3. Export as CodeMirror `Extension`
4. Import and add to extensions array in `src/features/editor/hooks/use-editor.ts`

### Adding Electron IPC Handler
1. Define handler in `electron/main/ipc/<category>.ts`
2. Register in `electron/main/ipc/index.ts`
3. Add types to `electron/preload/types.ts`
4. Expose via preload script in `electron/preload/index.ts`
5. Use in renderer via `window.electron.<category>.<method>()`

## Known Limitations (Current State)

Based on the README, some features are planned but not fully implemented:
- AI agent file modifications may show mock responses
- Message cancellation not implemented
- Past conversations dialog incomplete
- Code preview/execution may be partial
- GitHub integration may be in progress

## File Type Support

**Syntax Highlighting:** JavaScript, TypeScript, CSS, HTML, JSON, Markdown, Python
**Binary Files:** Stored in Convex `_storage` table (referenced by `storageId`)
**Text Files:** Content stored directly in `files.content` field

## Debugging Tips

- **Convex Logs:** Check Convex dashboard for real-time function logs
- **Inngest Logs:** Local dev UI at Inngest CLI output URL
- **Electron Logs:** Check `electron-log` output (console in dev, files in production)
- **Next.js Logs:** Standard Next.js dev server console output
- **Sentry:** Errors tracked in Sentry dashboard (if configured)

## Additional Notes

- **Monorepo Structure:** Not a monorepo - single Next.js app with Electron wrapper
- **Deployment:** Browser version can deploy to Vercel/any Next.js host; Electron builds via electron-builder
- **Auto-Updates:** Electron uses GitHub releases for updates (configured in `electron-builder.yml`)
- **TypeScript:** Strict mode enabled, uses path aliases (`@/*` maps to `src/*`)
