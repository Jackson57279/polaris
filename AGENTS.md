# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-05
**Commit:** a62566a3
**Branch:** 001-initial-setup

## OVERVIEW
Cloud IDE platform built with Next.js 16, React 19, and Convex. Features real-time collaborative editing, AI code suggestions, and WebContainer execution.

## STRUCTURE
```
polaris/
├── src/          # Frontend code (Next.js app router)
│   ├── app/      # Pages and API routes
│   ├── components/ui/    # shadcn/ui components
│   ├── components/ai-elements/  # AI conversation UI
│   ├── features/ # Feature modules (auth, editor, conversations)
│   └── lib/      # Shared utilities
├── convex/       # Backend database operations
├── .next/        # Next.js build output
└── public/       # Static assets
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Authentication** | `src/features/auth/` | Clerk integration, protected routes |
| **Real-time DB** | `convex/` | Convex queries/mutations |
| **Code Editor** | `src/features/editor/` | CodeMirror setup, extensions |
| **AI Features** | `src/components/ai-elements/` | Suggestions, conversations, quick edit |
| **Project Management** | `src/features/projects/` | File explorer, project dashboard |
| **Background Jobs** | `src/inngest/` | Inngest workflows |
| **Styling** | `src/components/ui/` | shadcn/ui components |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| RootLayout | Component | `src/app/layout.tsx` | App wrapper with providers |
| Home | Component | `src/app/page.tsx` | Projects dashboard |
| ConvexProvider | Component | `src/app/layout.tsx` | Database context |
| useAuth | Hook | `src/features/auth/` | Authentication state |
| useFileOperations | Hook | `src/features/projects/` | File management |
| CodeMirrorEditor | Component | `src/features/editor/` | Main editor |
| FileExplorer | Component | `src/features/projects/components/file-explorer/` | File tree UI |

## CONVENTIONS
- **Path aliases**: `@/*` maps to `./src/*`
- **Feature organization**: `src/features/` for domain logic
- **Component structure**: `src/components/ui/` for shared UI
- **TypeScript strict mode**: Enabled in tsconfig.json
- **ESLint**: Next.js core web vitals + TypeScript config
- **Tailwind CSS**: v4 with PostCSS integration

## ANTI-PATTERNS (THIS PROJECT)
- **No direct Convex mutations**: All DB operations go through Inngest background jobs
- **No hard-coded AI keys**: Use environment variables for API keys
- **No manual state management**: Use Convex for real-time state
- **No inline styles**: Use Tailwind CSS classes exclusively

## UNIQUE STYLES
- **AI-first design**: All components consider AI interaction
- **Real-time updates**: Optimistic UI with Convex synchronization
- **Accessibility**: All interactive elements follow ARIA standards
- **Dark theme**: One Dark theme for code editor
- **Responsive layout**: Resizable panels with Allotment

## COMMANDS
```bash
npm run dev       # Start development (Convex + Next.js + Inngest)
npm run build     # Build for production
npm run lint      # Run ESLint
npx convex dev    # Start Convex backend
npx inngest dev   # Start Inngest dev server
```

## NOTES
- **Part 1 of 2**: Core functionality complete, AI agent and WebContainer in Part 2
- **Sponsor technologies**: Uses Clerk, Convex, Inngest, Firecrawl, Sentry
- **AI providers**: Claude Sonnet 4 preferred, Gemini 2.0 Flash as free alternative
- **No test setup**: Testing infrastructure not yet implemented (Part 2)
- **Large project**: 1053 files, 552k lines, requires careful performance optimization