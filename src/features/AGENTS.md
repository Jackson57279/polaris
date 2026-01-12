# POLARIS FEATURES KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
Feature-based architecture organizing domain logic into self-contained modules.

## STRUCTURE
```
src/features/
├── auth/                 # Authentication with Stack Auth
├── conversations/        # AI chat and conversation features
├── editor/               # Code editor with CodeMirror and extensions
├── preview/              # Code preview and rendering functionality
└── projects/             # Project management and file explorer
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Authentication** | `auth/` | Stack Auth integration (migrated from Clerk) |
| **Code Editing** | `editor/` | CodeMirror setup, language extensions |
| **AI Conversations** | `conversations/` | Chat interface, AI interactions |
| **Project Management** | `projects/` | File explorer, project dashboard |
| **Preview** | `preview/` | Code preview, rendering |

## CONVENTIONS
- **Self-contained features**: Each feature directory contains components, hooks, and business logic
- **Feature isolation**: Minimize dependencies between features; prefer duplication over tight coupling
- **Background jobs**: No direct Convex mutations; all DB operations through Inngest workflows

## ANTI-PATTERNS (THIS PROJECT)
- **Cross-feature imports**: Avoid importing logic from other feature directories
- **Shared feature utilities**: Keep common code in `src/lib/` or `src/components/` instead of features
- **Direct database operations**: Never call Convex mutations directly from features