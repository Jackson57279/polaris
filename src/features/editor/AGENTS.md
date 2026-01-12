# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
CodeMirror 6 editor with custom extensions, tab management, and debounced auto-save.

## STRUCTURE
```
src/features/editor/
├── components/          # Editor UI components
├── extensions/          # Custom CodeMirror extensions
├── hooks/               # useEditor hook for tab operations
└── store/               # Zustand store for tab state
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **CodeMirror setup** | `components/code-editor.tsx` | EditorView initialization with extensions |
| **Tab state management** | `store/use-editor-store.ts` | Open/pinned tabs, active file tracking |
| **File auto-save** | `components/editor-view.tsx` | Debounced content updates (1500ms) |
| **Extension integration** | `extensions/custom-setup.ts` | Core CodeMirror config (line numbers, folding, autocompletion) |
| **Theme customization** | `extensions/theme.ts` | IBM Plex Mono font, scrollbar styling |

## CONVENTIONS
- **State management**: CodeMirror state for editor content, Zustand for tab state
- **Extension pattern**: All features implemented as CodeMirror extensions
- **Debounced saves**: Auto-save with 1500ms delay on content changes
- **Tab behavior**: Preview tabs convert to pinned on double-click
- **Language detection**: File extension-based syntax highlighting

## ANTI-PATTERNS (THIS PROJECT)
- **No direct DOM manipulation**: Use CodeMirror widgets for custom UI
- **No global editor state**: Keep state within CodeMirror or Zustand stores
- **No synchronous saves**: All file updates debounced and async
- **No manual theme styling**: Use CSS custom properties and EditorView.theme</content>
<parameter name="filePath">src/features/editor/AGENTS.md