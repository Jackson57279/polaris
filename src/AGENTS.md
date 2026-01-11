# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
Frontend code for Polaris IDE, built with Next.js 16, React 19, and TypeScript.

## STRUCTURE
```
src/
├── app/                 # Next.js pages and API routes
├── components/          # Shared UI components (ui/, ai-elements/)
├── features/            # Feature-based architecture (auth, conversations, editor, preview, projects)
├── hooks/               # Custom React hooks
├── inngest/             # Background job client
├── lib/                 # Utilities and integrations
└── types/               # TypeScript type definitions
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Authentication** | `src/features/auth/` | Stack Auth integration (migrated from Clerk) |
| **AI Conversations** | `src/features/conversations/` | Chat interface and message handling |
| **Code Editor** | `src/features/editor/` | CodeMirror setup and extensions |
| **Project Management** | `src/features/projects/` | Dashboard and IDE pages |
| **UI Components** | `src/components/ui/` | shadcn/ui components |
| **AI Elements** | `src/components/ai-elements/` | AI-specific UI components |
| **Background Jobs** | `src/inngest/` | Client for Inngest workflows |
| **Utilities** | `src/lib/` | Helpers, integrations (Paddle, GitHub, Firecrawl) |

## CONVENTIONS
- **Feature organization**: `src/features/` for domain logic (auth, editor, projects, conversations)
- **Component structure**: `src/components/ui/` for shared UI, `src/components/ai-elements/` for AI components
- **Path aliases**: `@/*` maps to `./src/*`
- **TypeScript strict mode**: Enabled
- **No inline styles**: Use Tailwind CSS classes exclusively

## ANTI-PATTERNS (THIS PROJECT)
- **No direct Convex mutations**: All DB operations go through Inngest background jobs
- **No synchronous file operations**: All file handling is async
- **No hard-coded AI keys**: Use environment variables</content>
<parameter name="filePath">src/AGENTS.md