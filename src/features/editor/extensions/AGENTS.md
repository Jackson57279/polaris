# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
Custom CodeMirror extensions for syntax highlighting, UI, and functionality.

## STRUCTURE
```
src/features/editor/extensions/
├── language-extension.ts   # File extension-based language detection
├── theme.ts                # Custom font and scrollbar styling
├── selection-tooltip.ts    # Add to Chat and Quick Edit buttons
├── minimap.ts              # Code overview using @replit/codemirror-minimap
├── custom-setup.ts         # Core CodeMirror configuration
├── suggestion.ts           # AI suggestion integration
└── quick-edit.ts           # Cmd+K quick edit functionality
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Syntax highlighting** | `language-extension.ts` | File extension-based language detection for JS/TS/HTML/CSS/JSON/Markdown/Python |
| **Editor theme** | `theme.ts` | Custom font (IBM Plex Mono) and scrollbar styling |
| **Selection tooltip** | `selection-tooltip.ts` | Add to Chat and Quick Edit (⌘K) buttons on text selection |
| **Minimap** | `minimap.ts` | Code overview using @replit/codemirror-minimap |
| **Editor setup** | `custom-setup.ts` | Core CodeMirror configuration with line numbers, folding, autocompletion, keymaps |
| **AI Suggestions** | `suggestion.ts` | AI-powered inline code suggestions with ghost text |
| **Quick Edit** | `quick-edit.ts` | Cmd+K natural language code editing |

## CONVENTIONS
- **Extension pattern**: All features implemented as CodeMirror extensions
- **File-based language detection**: Language extensions loaded based on file extension
- **State fields**: Complex UI features use StateField for reactive updates
- **DOM manipulation**: Custom tooltips and UI elements created programmatically

## ANTI-PATTERNS (THIS PROJECT)
- **No direct DOM manipulation**: Use CodeMirror's widget system instead of manual DOM updates
- **No global state**: Keep extension state within CodeMirror's state management
- **No hardcoded themes**: Use CSS custom properties for theme customization
- **No blocking operations**: Extensions should be lightweight and non-blocking
