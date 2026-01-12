# PROJECTS FEATURE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
Project dashboard, file explorer, and IDE layout with resizable panes.

## STRUCTURE
```
src/features/projects/
├── components/           # Project views, dialogs, file explorer
├── hooks/                # Project and file operation hooks
└── utils/                # (Empty)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Project CRUD** | `hooks/use-projects.ts` | Create, read, rename projects |
| **File Operations** | `hooks/use-files.ts` | File/folder create, update, delete, rename |
| **File Explorer** | `components/file-explorer/` | Tree view, VSCode icons, context menus |
| **Project Dashboard** | `components/projects-view.tsx` | Landing page with create/import buttons |
| **IDE Layout** | `components/project-id-view.tsx` | Resizable panes, tab navigation |

## CONVENTIONS
- **Optimistic updates**: All mutations include optimistic UI updates for instant feedback
- **File tree hierarchy**: Recursive Tree components for nested folders
- **Keyboard shortcuts**: Cmd+K (generate), Cmd+I (import), Cmd+J (AI generate)
- **Background jobs**: No direct Convex mutations; all through Inngest workflows

## ANTI-PATTERNS (THIS FEATURE)
- **Direct file mutations**: Never call Convex directly; use Inngest for all file operations
- **Synchronous operations**: All file I/O must be async through background jobs
- **Inline file content**: Store file content in Convex; never embed in UI state</content>
<parameter name="filePath">src/features/projects/AGENTS.md