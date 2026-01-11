# POLARIS KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
Cloud IDE platform built with Next.js 16, React 19, and Convex. Features real-time collaborative editing, AI code suggestions, WebContainer execution, and Electron desktop app.

## STRUCTURE
```
polaris/
├── src/                 # Frontend code (Next.js app router)
│   ├── app/            # Pages and API routes
│   │   ├── api/        # Paddle billing, GitHub, AI APIs
│   │   └── projects/   # Project IDE pages
│   ├── components/     # Shared UI components
│   ├── features/       # Feature-based architecture
│   ├── hooks/          # Custom React hooks
│   ├── inngest/        # Background job client
│   └── lib/            # Utilities and integrations
├── convex/             # Backend database operations
├── electron/           # Desktop app code
├── tests/              # Test files
└── public/             # Static assets
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Authentication** | `src/features/auth/` | Stack Auth integration (migrated from Clerk) |
| **Real-time DB** | `convex/` | Convex queries/mutations |
| **Code Editor** | `src/features/editor/` | CodeMirror setup, extensions |
| **AI Features** | `src/components/ai-elements/` | Suggestions, conversations, quick edit |
| **Project Management** | `src/features/projects/` | File explorer, project dashboard |
| **Background Jobs** | `src/inngest/` | Inngest workflows |
| **Billing/Subscriptions** | `src/lib/paddle.ts`, `convex/users.ts` | Paddle integration |
| **Styling** | `src/components/ui/` | shadcn/ui components |
| **Desktop App** | `electron/` | Electron main process, IPC handlers |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| RootLayout | Component | `src/app/layout.tsx` | App wrapper with providers |
| Home | Component | `src/app/page.tsx` | Projects dashboard |
| ConvexProvider | Component | `src/app/layout.tsx` | Database context |
| defineSchema | Function | `convex/schema.ts` | Database schema (users, projects, files, conversations) |
| verifyAuth | Function | `convex/auth.ts` | User authentication check |
| createProject | Mutation | `convex/projects.ts` | Create new project |

## PADDLE INTEGRATION

### Subscription Tiers
| Tier | Projects | Price | Status |
|------|----------|-------|--------|
| Free | 10 | $0/mo | `free` |
| Pro Monthly | Unlimited | $29/mo | `active`/`trialing` |
| Pro Yearly | Unlimited | $290/yr | `active`/`trialing` |

### Webhook Events Handled
- `subscription.created`, `subscription.activated`, `subscription.trialing`
- `subscription.updated`, `subscription.paused`/`resumed`/`canceled`
- `customer.created`

### Environment Variables
```env
# Paddle
PADDLE_API_KEY=, PADDLE_CLIENT_TOKEN=, PADDLE_WEBHOOK_SECRET=
NEXT_PUBLIC_PADDLE_ENVIRONMENT=production
NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=, NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID=

# AI Provider (choose one)
ANTHROPIC_API_KEY=  # Claude Sonnet 4 (preferred)
GOOGLE_GENERATIVE_AI_API_KEY=  # Gemini 2.0 Flash (free)

# Stack Auth
NEXT_PUBLIC_STACK_PUBLISHABLE_KEY=
STACK_SECRET_KEY=
```

## CONVENTIONS
- **Feature organization**: `src/features/` for domain logic (auth, editor, projects)
- **Component structure**: `src/components/ui/` for shared UI, `src/components/ai-elements/` for AI components
- **Path aliases**: `@/*` maps to `./src/*`
- **TypeScript strict mode**: Enabled
- **ESLint**: Next.js core web vitals + TypeScript config
- **Tailwind CSS**: v4 with PostCSS integration

## ANTI-PATTERNS (THIS PROJECT)
- **No direct Convex mutations**: All DB operations go through Inngest background jobs
- **No hard-coded AI keys**: Use environment variables
- **No manual state management**: Use Convex for real-time state
- **No inline styles**: Use Tailwind CSS classes exclusively
- **No synchronous file operations**: All file handling is async

## UNIQUE STYLES
- **AI-first design**: All components consider AI interaction
- **Real-time updates**: Optimistic UI with Convex synchronization
- **Multi-platform**: Web + Electron desktop app
- **Hybrid architecture**: Feature-based organization (not type-based)
- **Subscription-based**: Project limits enforced per user tier

## COMMANDS
```bash
npm run dev               # Start development (web only)
npm run dev:electron      # Start Electron desktop app
npm run build             # Build for production
npm run build:electron     # Build Electron app
npm run lint              # Run ESLint
npx convex dev            # Start Convex backend
npx inngest dev           # Start Inngest dev server
npm test                  # Run tests
```

## NOTES
- **Stack Auth**: Migrated from Clerk for authentication
- **Sponsor technologies**: Stack Auth, Convex, Inngest, Firecrawl, Sentry, Paddle
- **AI providers**: Claude Sonnet 4 preferred, Gemini 2.0 Flash as free alternative
- **Test setup**: Vitest for unit/integration, Playwright for E2E (not implemented yet)
- **Large project**: 1053 files, requires careful performance optimization
