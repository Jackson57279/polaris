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
│   │   ├── api/paddle/    # Paddle checkout and portal APIs
│   │   ├── api/webhooks/paddle/  # Paddle webhook handler
│   │   └── billing/       # Billing dashboard pages
│   ├── components/billing/ # Pricing plans, subscription UI
│   ├── hooks/             # Custom hooks (useSubscription)
│   └── lib/               # Shared utilities (paddle.ts, paddle-server.ts)
├── convex/       # Backend database operations
│   ├── schema.ts  # Database schema with users table
│   └── users.ts   # User subscription queries and mutations
├── tests/        # Test files
└── public/       # Static assets
```

## PADDLE INTEGRATION

### Documentation
- [Paddle Billing API](https://developer.paddle.com/api-reference/overview)
- [Paddle Webhooks](https://developer.paddle.com/webhooks/overview)
- [Paddle.js](https://developer.paddle.com/paddlejs/overview)
- [Paddle Dashboard](https://paddle.com/billing/integration)

### Architecture
```
Clerk Auth → User Signs Up → Auto-create user in Convex (free tier, 10 projects)
     ↓
User clicks "Start Trial" → Paddle Checkout (7-day trial) → Webhook received
     ↓                                            ↓
Project Creation Check ←────────────────── Update user subscription status
     ↓
Enforce: 10 projects for free, unlimited for paid/trial users
```

### Environment Variables
```env
# Paddle Configuration
PADDLE_API_KEY=paddle_live_xxx
PADDLE_CLIENT_TOKEN=paddle_client_xxx
PADDLE_WEBHOOK_SECRET=paddle_webhook_xxx
NEXT_PUBLIC_PADDLE_ENVIRONMENT=production

# Pricing IDs
NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxx
NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxx
PADDLE_SANDBOX_MONTHLY_PRICE_ID=pri_sandbox_xxx
PADDLE_SANDBOX_YEARLY_PRICE_ID=pri_sandbox_xxx

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Schema (convex/schema.ts)
- **users table**: Clerk ID, email, Paddle customer/subscription IDs, subscription status, project limits, trial end date
- **projects table**: Linked to users via ownerId and userId for subscription tracking

### Subscription Tiers
| Tier | Projects | Price | Status |
|------|----------|-------|--------|
| Free | 10 | $0/mo | `free` |
| Pro Monthly | Unlimited | $29/mo | `active`/`trialing` |
| Pro Yearly | Unlimited | $290/yr | `active`/`trialing` |

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/paddle.ts` | Frontend Paddle.js integration |
| `src/lib/paddle-server.ts` | Backend Paddle API calls |
| `convex/users.ts` | User subscription queries/mutations |
| `convex/projects.ts` | Project creation with limits |
| `src/app/api/webhooks/paddle/route.ts` | Webhook event handler |
| `src/app/api/paddle/checkout/route.ts` | Checkout session creation |
| `src/hooks/useSubscription.ts` | React hook for subscription state |
| `src/components/billing/PricingPlans.tsx` | Pricing UI component |

### Webhook Events Handled
- `subscription.created` - New subscription
- `subscription.activated` - Subscription activated
- `subscription.trialing` - Trial started
- `subscription.trial_completed` - Trial ended, billing active
- `subscription.trial_canceled` - Trial canceled
- `subscription.updated` - Plan changed
- `subscription.paused` / `resumed` / `canceled` - Status changes
- `customer.created` - New Paddle customer

### Testing
```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode
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
| **Billing/Subscriptions** | `src/lib/paddle.ts`, `convex/users.ts` | Paddle integration |
| **Styling** | `src/components/ui/` | shadcn/ui components |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| RootLayout | Component | `src/app/layout.tsx` | App wrapper with providers |
| Home | Component | `src/app/page.tsx` | Projects dashboard |
| ConvexProvider | Component | `src/app/layout.tsx` | Database context |
| useAuth | Hook | `src/features/auth/` | Authentication state |
| useSubscription | Hook | `src/hooks/useSubscription.ts` | Subscription state |
| useFileOperations | Hook | `src/features/projects/` | File management |
| CodeMirrorEditor | Component | `src/features/editor/` | Main editor |
| FileExplorer | Component | `src/features/projects/components/file-explorer/` | File tree UI |
| PricingPlans | Component | `src/components/billing/` | Subscription pricing UI |

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
- **Subscription-based**: Project limits enforced per user tier

## COMMANDS
```bash
npm run dev       # Start development (Convex + Next.js + Inngest)
npm run build     # Build for production
npm run lint      # Run ESLint
npx convex dev    # Start Convex backend
npx inngest dev   # Start Inngest dev server
npm test          # Run tests
```

## NOTES
- **Part 1 of 2**: Core functionality complete, AI agent and WebContainer in Part 2
- **Sponsor technologies**: Uses Clerk, Convex, Inngest, Firecrawl, Sentry, Paddle
- **AI providers**: Claude Sonnet 4 preferred, Gemini 2.0 Flash as free alternative
- **Payment provider**: Paddle Billing with 7-day free trial
- **Project limits**: 10 free projects, unlimited for paid subscribers
- **Test setup**: Comprehensive tests in `tests/paddle-integration.test.ts`
- **Large project**: 1053 files, 552k lines, requires careful performance optimization
