# Clerk to Stack Auth Migration Guide

This document outlines the changes made during the migration from Clerk to Stack Auth.

## Summary of Changes

### 1. Authentication Provider
- **Before**: Clerk Auth (`@clerk/nextjs`)
- **After**: Stack Auth (`@stackframe/stack`)

### 2. Key Files Modified

#### Frontend Components
- `src/components/providers.tsx` - Updated to use `StackProvider` and Convex auth integration
- `src/features/auth/components/unauthenticated-view.tsx` - Uses Stack Auth sign-in links
- `src/app/layout.tsx` - No changes needed (providers handle everything)
- `src/app/loading.tsx` - Added for Suspense boundary

#### Authentication Configuration
- `stack/server.ts` - Stack Auth server configuration (NEW)
- `stack/client.ts` - Stack Auth client configuration (NEW)
- `src/app/handler/[...stack]/page.tsx` - Stack Auth handler routes (NEW)
- `src/lib/stack-auth-api.ts` - Helper functions for API routes (NEW)

#### Convex Backend
- `convex/auth.ts` - Updated with Stack Auth user ID extraction
- `convex/auth.config.ts` - Stack Auth Convex integration (NEW)
- `convex/schema.ts` - Added `stackUserId` field, kept `clerkId` for migration
- `convex/users.ts` - Updated all references from `clerkId` to `stackUserId`

#### API Routes (All Updated)
- `src/app/api/messages/route.ts`
- `src/app/api/suggestion/route.ts`
- `src/app/api/quick-edit/route.ts`
- `src/app/api/github/import/route.ts`
- `src/app/api/github/export/route.ts`
- `src/app/api/projects/generate/route.ts`
- `src/app/api/paddle/checkout/route.ts`
- `src/app/api/webhooks/paddle/route.ts`

#### Electron Desktop
- `src/lib/electron/stack-auth.ts` - Electron M2M authentication (NEW)

### 3. Database Schema Changes

The `users` table in Convex now has:
```typescript
{
  stackUserId: v.string(),      // NEW - Stack Auth user ID
  clerkId: v.optional(v.string()), // LEGACY - for migration period
  // ... rest of fields unchanged
}
```

**Indexes**:
- Added: `by_stack_user` on `stackUserId`
- Kept: `by_clerk` on `clerkId` (for migration period)

### 4. Environment Variables

#### Remove
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

#### Add
```bash
NEXT_PUBLIC_STACK_PROJECT_ID=<from Stack Auth dashboard>
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<from Stack Auth dashboard>
STACK_SECRET_SERVER_KEY=<from Stack Auth dashboard>
```

See `.env.example` for complete list.

### 5. Package Dependencies

#### Remove
```bash
npm uninstall @clerk/nextjs @clerk/themes
```

#### Add
```bash
npm install @stackframe/stack --legacy-peer-deps
```

## Migration Steps for Existing Users

### For Development Environment

1. **Create Stack Auth Account**
   - Go to https://app.stack-auth.com
   - Create a new project
   - Get your Project ID, Publishable Client Key, and Secret Server Key

2. **Update Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in Stack Auth credentials
   - Keep all other variables the same

3. **Deploy Convex Schema Changes**
   ```bash
   npx convex dev
   ```
   This will update the schema with the new `stackUserId` field.

4. **Run Migration Script** (if you have existing users)
   ```bash
   # Create a Convex function to migrate existing users
   # Map clerkId to stackUserId for each user
   ```

5. **Test Authentication Flow**
   ```bash
   npm run dev
   ```
   Navigate to `/handler/sign-in` to test the new auth flow.

### For Electron Desktop

1. **Set M2M Credentials**
   - Stack Auth M2M tokens are automatically generated using `STACK_SECRET_SERVER_KEY`
   - The Electron main process uses these for server-side operations

2. **User Authentication**
   - Users sign in via the web interface
   - Tokens are stored using `electron-store`
   - Desktop app uses stored tokens for Convex operations

### For Production Deployment

1. **Update Environment Variables** in your hosting platform:
   - Vercel/Netlify: Update via dashboard
   - Add all Stack Auth environment variables
   - Remove Clerk environment variables

2. **Deploy Convex Changes**
   ```bash
   npx convex deploy
   ```

3. **Deploy Next.js App**
   ```bash
   npm run build
   npm run start
   ```

## Breaking Changes

### API Routes
**Before** (Clerk):
```typescript
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

**After** (Stack Auth):
```typescript
import { requireAuth } from "@/lib/stack-auth-api";

export async function POST(request: Request) {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }
  // ...
}
```

### Convex Mutations/Queries
**Before** (Clerk):
```typescript
const identity = await verifyAuth(ctx);
const clerkId = identity.subject;

const user = await ctx.db
  .query('users')
  .withIndex('by_clerk', (q) => q.eq('clerkId', clerkId))
  .first();
```

**After** (Stack Auth):
```typescript
const identity = await verifyAuth(ctx);
const stackUserId = identity.subject; // or identity.sub

const user = await ctx.db
  .query('users')
  .withIndex('by_stack_user', (q) => q.eq('stackUserId', stackUserId))
  .first();
```

### React Components
**Before** (Clerk):
```typescript
import { useAuth, useUser } from "@clerk/nextjs";

function MyComponent() {
  const { userId } = useAuth();
  const { user } = useUser();
  // ...
}
```

**After** (Stack Auth):
```typescript
import { useUser } from "@stackframe/stack";

function MyComponent() {
  const user = useUser();
  const userId = user?.id;
  // ...
}
```

## Rollback Plan

If you need to rollback:

1. Revert Git commits to before the migration
2. Restore `clerkId` as primary field in Convex schema
3. Reinstall Clerk packages
4. Restore old environment variables
5. Redeploy

## Testing Checklist

- [ ] User sign-up works
- [ ] User sign-in works
- [ ] Protected routes redirect to sign-in
- [ ] API routes authenticate correctly
- [ ] Convex mutations work with new user IDs
- [ ] Paddle webhooks process correctly
- [ ] GitHub import/export works
- [ ] Electron desktop app authenticates
- [ ] Projects creation respects subscription limits
- [ ] Billing flow works end-to-end

## Support

For issues:
- Stack Auth Docs: https://docs.stack-auth.com
- Stack Auth Discord: https://discord.stack-auth.com
- Convex + Stack Auth: https://docs.stack-auth.com/docs/others/convex

## Notes

- The migration keeps `clerkId` as optional field for backward compatibility
- Both indexes (`by_clerk` and `by_stack_user`) are maintained temporarily
- Once all users are migrated, you can remove `clerkId` field and `by_clerk` index
- Stack Auth JWT format is compatible with Convex auth system
