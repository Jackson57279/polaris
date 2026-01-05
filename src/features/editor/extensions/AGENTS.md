# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-05
**Commit:** a62566a3
**Branch:** 001-initial-setup

## OVERVIEW
Custom CodeMirror extensions for syntax highlighting, UI, and functionality.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Syntax highlighting** | `language-extension.ts` | File extension-based language detection for JS/TS/HTML/CSS/JSON/Markdown/Python |
| **Editor theme** | `theme.ts` | Custom font (IBM Plex Mono) and scrollbar styling |
| **Selection tooltip** | `selection-tooltip.ts` | Add to Chat and Quick Edit (⌘K) buttons on text selection |
| **Minimap** | `minimap.ts` | Code overview using @replit/codemirror-minimap |
| **Editor setup** | `custom-setup.ts` | Core CodeMirror configuration with line numbers, folding, autocompletion, keymaps |

## CONVENTIONS
- **Extension pattern**: All features implemented as CodeMirror extensions
- **File-based language detection**: Language extensions loaded based on file extension
- **State fields**: Complex UI features use StateField for reactive updates
- **DOM manipulation**: Custom tooltips and UI elements created programmatically

## ANTI-PATTERNS (THIS PROJECT)
- **No direct DOM manipulation**: Use CodeMirror's widget system instead of manual DOM updates
- **No global state**: Keep extension state within CodeMirror's state management
- **No hardcoded themes**: Use CSS custom properties for theme customization
- **No blocking operations**: Extensions should be lightweight and non-blocking</content>
<parameter name="filePath">src/features/editor/extensions/AGENTS.md