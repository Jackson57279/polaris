# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
Reusable React components for AI-powered conversation interfaces.

## STRUCTURE
```
src/components/ai-elements/
├── message.tsx           # Core message UI with branching, actions
├── conversation.tsx      # Scrollable chat interface
├── prompt-input.tsx      # Advanced input with file uploads, speech
├── reasoning.tsx         # Collapsible reasoning display
├── suggestion.tsx        # Inline code suggestion buttons
├── shimmer.tsx           # Loading animations
├── tool.tsx              # UI for AI tool calls
├── canvas.tsx, node.tsx, edge.tsx  # Visual workflow components
├── inline-citation.tsx   # Source citations
└── checkpoint.tsx       # Progress tracking
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Message Display** | `message.tsx` | Core message UI with branching, actions, and attachments |
| **Conversation Layout** | `conversation.tsx` | Scrollable chat interface with auto-scroll and empty states |
| **User Input** | `prompt-input.tsx` | Advanced input with file uploads, speech recognition, and attachments |
| **AI Reasoning** | `reasoning.tsx` | Collapsible reasoning display with streaming indicators |
| **Code Suggestions** | `suggestion.tsx` | Inline code suggestion buttons |
| **Visual Feedback** | `shimmer.tsx` | Loading animations for AI responses |
| **Tool Integration** | `tool.tsx` | UI for AI tool calls and results |
| **Canvas/Flow** | `canvas.tsx`, `node.tsx`, `edge.tsx` | Visual workflow and diagram components |
| **Citation System** | `inline-citation.tsx` | Source citations in AI responses |
| **Execution Tracking** | `checkpoint.tsx` | Progress tracking for AI operations |

## CONVENTIONS
- **Context Providers**: Components use React Context for shared state (e.g., MessageBranchContext, ReasoningContext)
- **Streaming Support**: Built-in support for real-time streaming with loading states
- **Accessibility**: Full ARIA support with sr-only labels and keyboard navigation
- **File Handling**: Blob URL management with automatic cleanup to prevent memory leaks
- **Composition Pattern**: Modular components that compose together (e.g., PromptInput with sub-components)
- **TypeScript Strict**: Full type safety with discriminated unions and proper generics

## ANTI-PATTERNS (THIS PROJECT)
- **No direct API calls**: All data operations go through Convex/Inngest background jobs
- **No manual state management**: Use Convex for real-time state synchronization
- **No inline styles**: Strictly Tailwind CSS classes only
- **No hardcoded AI keys**: Environment variables for all AI provider configurations
- **No synchronous file operations**: All file handling is async with proper error boundaries
