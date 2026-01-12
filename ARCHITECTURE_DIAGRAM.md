# Polaris IDE Architecture - Stack Auth + Paddle Integration

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         POLARIS IDE ARCHITECTURE                         │
│                      Stack Auth + Paddle Integration                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   STACK AUTH    │         │   PADDLE API    │         │  CONVEX DB      │
│   (External)    │         │   (External)    │         │  (Backend)      │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                            │
         │ JWT Token                 │ Webhook Events             │ Queries/
         │                           │                            │ Mutations
         ▼                           ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APPLICATION                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    AUTHENTICATION LAYER                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │    │
│  │  │StackProvider │  │StackTheme    │  │ConvexProvider│         │    │
│  │  │              │  │              │  │              │         │    │
│  │  │ - useUser()  │  │ - Dark mode  │  │ - setAuth()  │         │    │
│  │  │ - getToken() │  │ - UI styling │  │ - Real-time  │         │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                         API ROUTES                              │    │
│  │                                                                  │    │
│  │  /api/paddle/checkout  ─────► Create Paddle checkout           │    │
│  │     Input: { tier, useTrial }                                  │    │
│  │     Output: { checkoutUrl }                                    │    │
│  │     Custom Data: { stackUserId, tier }                         │    │
│  │                                                                  │    │
│  │  /api/paddle/portal  ────────► Open billing portal             │    │
│  │     Input: { customerId }                                      │    │
│  │     Output: { portalUrl }                                      │    │
│  │                                                                  │    │
│  │  /api/webhooks/paddle  ───────► Process Paddle events          │    │
│  │     - Verify signature                                          │    │
│  │     - Extract stackUserId                                      │    │
│  │     - Update Convex user                                       │    │
│  │                                                                  │    │
│  │  /api/messages  ──────────────► AI chat (auth required)        │    │
│  │  /api/suggestion  ────────────► Code suggestions               │    │
│  │  /api/projects/generate  ─────► AI project generation          │    │
│  │  /api/github/import  ─────────► GitHub import                  │    │
│  │  /api/github/export  ─────────► GitHub export                  │    │
│  │                                                                  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                      UI COMPONENTS                              │    │
│  │                                                                  │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │    │
│  │  │ Subscription    │  │ Pricing Plans   │  │ User Button    │ │    │
│  │  │ Manager         │  │                 │  │                │ │    │
│  │  │                 │  │ - Monthly: $29  │  │ - Profile      │ │    │
│  │  │ - Current plan  │  │ - Yearly: $290  │  │ - Settings     │ │    │
│  │  │ - Usage: 5/10   │  │ - 7-day trial   │  │ - Sign out     │ │    │
│  │  │ - Trial: 5 days │  │                 │  │                │ │    │
│  │  │ - Upgrade btn   │  │ [Start Trial]   │  └────────────────┘ │    │
│  │  └─────────────────┘  └─────────────────┘                     │    │
│  │                                                                  │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │    │
│  │  │ File Explorer   │  │ Code Editor     │  │ AI Chat        │ │    │
│  │  │                 │  │                 │  │                │ │    │
│  │  │ - Projects list │  │ - CodeMirror    │  │ - Conversations│ │    │
│  │  │ - File tree     │  │ - Suggestions   │  │ - Messages     │ │    │
│  │  │ - Create/delete │  │ - Quick edit    │  │ - Streaming    │ │    │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Sign Up to Subscription

```
STEP 1: USER SIGNS UP
┌────────────┐
│   User     │  Opens /handler/sign-up
└──────┬─────┘
       │
       ▼
┌────────────────┐
│  Stack Auth    │  Creates account
│  Dashboard     │  Returns: stackUserId = "stack_user_123"
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Convex DB     │  Mutation: getOrCreateUser()
│  users table   │  Inserts: {
└────────────────┘    stackUserId: "stack_user_123",
                      email: "user@example.com",
                      subscriptionStatus: "free",
                      projectLimit: 10
                    }

───────────────────────────────────────────────────────────────

STEP 2: USER STARTS TRIAL
┌────────────┐
│   User     │  Clicks "Start 7-Day Free Trial"
└──────┬─────┘
       │
       ▼
┌────────────────┐
│  POST /api/    │  { tier: "pro_monthly", useTrial: true }
│  paddle/       │  
│  checkout      │  requireAuth() → user.id = "stack_user_123"
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Paddle API    │  paddleCheckout.create({
│                │    items: [{ priceId: "pri_xxx" }],
│                │    customer: { email: "user@example.com" },
│                │    customData: {
│                │      stackUserId: "stack_user_123",  ← CRITICAL!
│                │      tier: "pro_monthly",
│                │      useTrial: "true"
│                │    }
│                │  })
└────────┬───────┘
         │
         ▼
┌────────────────┐
│   Browser      │  Redirects to Paddle checkout page
│                │  User enters payment details
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Paddle        │  Processes payment
│                │  Creates subscription: sub_xyz
│                │  Creates customer: ctm_abc
└────────┬───────┘
         │
         │ Sends webhook
         ▼

───────────────────────────────────────────────────────────────

STEP 3: WEBHOOK PROCESSING
┌────────────────┐
│  POST /api/    │  Event: subscription.trialing
│  webhooks/     │  Data: {
│  paddle        │    id: "sub_xyz",
│                │    customerId: "ctm_abc",
│                │    status: "trialing",
│                │    customData: {
│                │      stackUserId: "stack_user_123",  ← Extract this!
│                │      tier: "pro_monthly"
│                │    },
│                │    currentBillingPeriod: {
│                │      endsAt: "2026-01-17T00:00:00Z"
│                │    }
│                │  }
└────────┬───────┘
         │
         │ 1. Verify webhook signature
         │ 2. Extract stackUserId from customData
         ▼
┌────────────────┐
│  Convex Query  │  getUserByStackUserId({
│                │    stackUserId: "stack_user_123"
│                │  })
│                │  Returns: user object
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Convex        │  updateSubscription({
│  Mutation      │    stackUserId: "stack_user_123",
│                │    paddleCustomerId: "ctm_abc",
│                │    paddleSubscriptionId: "sub_xyz",
│                │    subscriptionStatus: "trialing",
│                │    subscriptionTier: "pro_monthly",
│                │    projectLimit: -1,  ← UNLIMITED!
│                │    trialEndsAt: 1736726400000
│                │  })
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  User Record   │  Updated in Convex:
│  Updated!      │  {
│                │    stackUserId: "stack_user_123",
│                │    paddleCustomerId: "ctm_abc",
│                │    paddleSubscriptionId: "sub_xyz",
│                │    subscriptionStatus: "trialing",
│                │    projectLimit: -1
│                │  }
└────────────────┘

───────────────────────────────────────────────────────────────

STEP 4: USER CREATES PROJECTS
┌────────────┐
│   User     │  Creates project #1, #2, #3... #50!
└──────┬─────┘
       │
       ▼
┌────────────────┐
│  Convex Query  │  getSubscription()
│                │  Returns: {
│                │    isPro: true,
│                │    isInTrial: true,
│                │    projectLimit: -1,
│                │    canCreateProject: true  ✓
│                │  }
└────────────────┘

User can create unlimited projects! 🎉
```

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      CONVEX TABLES                           │
└─────────────────────────────────────────────────────────────┘

users
├── stackUserId: "stack_user_123"  [INDEX: by_stack_user]
├── paddleCustomerId: "ctm_abc"    [INDEX: by_paddle_customer]
├── paddleSubscriptionId: "sub_xyz" [INDEX: by_paddle_subscription]
├── subscriptionStatus: "trialing"
├── projectLimit: -1
└── ...

    │
    │ One-to-Many
    ▼

projects
├── ownerId: "stack_user_123"  [INDEX: by_owner]
├── userId: Id<"users">        [INDEX: by_user]
├── name: "My Awesome Project"
└── ...

    │
    │ One-to-Many
    ▼

files
├── projectId: Id<"projects">  [INDEX: by_project]
├── name: "index.tsx"
├── content: "..."
└── ...

    │
    │ One-to-Many
    ▼

conversations
├── projectId: Id<"projects">  [INDEX: by_project]
└── ...

    │
    │ One-to-Many
    ▼

messages
├── conversationId: Id<"conversations">
├── projectId: Id<"projects">
└── ...
```

## Query Patterns

```
┌─────────────────────────────────────────────────────────────┐
│                   COMMON QUERY PATTERNS                      │
└─────────────────────────────────────────────────────────────┘

1. Find User by Stack Auth ID
   ─────────────────────────────
   ctx.db.query('users')
     .withIndex('by_stack_user', (q) => 
       q.eq('stackUserId', 'stack_user_123')
     )
     .first()

   Used in: Webhooks, user lookup, auth verification


2. Find User by Paddle Customer ID
   ──────────────────────────────────
   ctx.db.query('users')
     .withIndex('by_paddle_customer', (q) => 
       q.eq('paddleCustomerId', 'ctm_abc')
     )
     .first()

   Used in: Webhooks (most subscription events)


3. Find Projects by Owner
   ───────────────────────
   ctx.db.query('projects')
     .withIndex('by_owner', (q) => 
       q.eq('ownerId', 'stack_user_123')
     )
     .collect()

   Used in: Project listing, count, limit checks


4. Update Subscription
   ───────────────────
   ctx.db.patch(userId, {
     subscriptionStatus: 'trialing',
     projectLimit: -1,
     ...
   })

   Used in: Webhooks, subscription changes
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│               WEB AUTHENTICATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. User visits any page
   └─► StackProvider checks auth
       ├─► Authenticated → Load app
       └─► Not authenticated → Show UnauthenticatedView

2. User clicks "Sign In"
   └─► Redirect to /handler/sign-in
       └─► Stack Auth UI component

3. User signs in/up
   └─► Stack Auth creates JWT
       └─► StackProvider stores token
           └─► Convex.setAuth(stackClientApp.getConvexClientAuth())
               └─► All Convex calls include JWT

4. API routes receive request
   └─► requireAuth() extracts JWT
       ├─► Valid → Continue with user object
       └─► Invalid → Return 401 Unauthorized

5. Convex queries/mutations
   └─► ctx.auth.getUserIdentity()
       ├─► Valid → Returns { subject: stackUserId }
       └─► Invalid → Throws error


┌─────────────────────────────────────────────────────────────┐
│            ELECTRON AUTHENTICATION FLOW                      │
└─────────────────────────────────────────────────────────────┘

1. Electron main process starts
   └─► getStackM2MToken(secretServerKey)
       └─► POST to Stack Auth API
           └─► Returns M2M access token

2. User opens desktop app
   ├─► If token stored → Auto-authenticate
   └─► If no token → Show sign-in

3. User signs in
   └─► storeAuthToken({ accessToken, expiresAt })
       └─► Saved in electron-store

4. File system operations
   └─► getConvexAuthForElectron()
       └─► Returns stored access token
           └─► Used for Convex calls

5. Token expiration
   └─► Check token.expiresAt < Date.now()
       ├─► Expired → Refresh or re-authenticate
       └─► Valid → Continue
```

## Key Integration Points

### 1. Stack Auth → Convex
```typescript
// Client-side
convex.setAuth(stackClientApp.getConvexClientAuth({}));

// Convex backend (auth.config.ts)
export default {
  providers: getConvexProvidersConfig({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
  }),
};

// Queries/mutations
const identity = await ctx.auth.getUserIdentity();
const stackUserId = identity.subject;  // Stack Auth user ID
```

### 2. Stack Auth → Paddle
```typescript
// Checkout
const { user, userId } = await requireAuth();

await paddleCheckout.create({
  customer: { email: user.primaryEmail },
  customData: {
    stackUserId: userId,  // ← Passed to Paddle
    tier,
  },
});
```

### 3. Paddle → Convex
```typescript
// Webhook
const stackUserId = customData?.stackUserId;

const user = await convex.query(api.users.getUserByStackUserId, {
  stackUserId
});

await convex.mutation(api.users.updateSubscription, {
  stackUserId,
  subscriptionStatus: 'trialing',
  projectLimit: -1,
});
```

## Summary

✅ **Stack Auth** provides authentication
✅ **Paddle** handles payments & subscriptions
✅ **Convex** stores user data & subscription status
✅ **stackUserId** is the golden thread connecting everything

**The system is production-ready!** 🚀
