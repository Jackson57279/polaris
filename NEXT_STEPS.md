# Next Steps - Stack Auth Migration

## Critical Actions Required Before Testing

### 1. Install Stack Auth Package ⚠️ REQUIRED
```bash
npm install @stackframe/stack --legacy-peer-deps
```

**Note**: The `--legacy-peer-deps` flag is required due to a peer dependency conflict with the `ai` package version.

### 2. Setup Stack Auth Project

1. Go to https://app.stack-auth.com
2. Sign up or log in
3. Create a new project (name it "Polaris IDE" or similar)
4. Navigate to API Keys section
5. Copy these three values:
   - Project ID
   - Publishable Client Key  
   - Secret Server Key

### 3. Configure Environment Variables

Create or update `.env.local`:

```bash
# Stack Auth (REQUIRED)
NEXT_PUBLIC_STACK_PROJECT_ID=<paste-your-project-id>
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<paste-your-publishable-key>
STACK_SECRET_SERVER_KEY=<paste-your-secret-key>

# Convex (keep existing values)
NEXT_PUBLIC_CONVEX_URL=<your-existing-url>
CONVEX_DEPLOYMENT=<your-existing-deployment>
POLARIS_CONVEX_INTERNAL_KEY=<your-existing-key>

# AI Providers (keep existing values)
ANTHROPIC_API_KEY=<your-existing-key>
GOOGLE_GENERATIVE_AI_API_KEY=<your-existing-key>

# Paddle (keep existing values)
PADDLE_API_KEY=<your-existing-key>
PADDLE_CLIENT_TOKEN=<your-existing-token>
PADDLE_WEBHOOK_SECRET=<your-existing-secret>
# ... etc
```

### 4. Update Convex Schema

```bash
# In a separate terminal, start Convex
npx convex dev
```

This will:
- Detect the schema changes
- Add the new `stackUserId` field
- Create the `by_stack_user` index
- Keep the `by_clerk` index for backward compatibility

### 5. Start Development Server

```bash
npm run dev
```

Expected output:
```
✓ Ready in Xms
○ Local: http://localhost:3000
```

---

## Testing Sequence

### Phase 1: Basic Authentication
1. Navigate to `http://localhost:3000`
2. You should see "Unauthorized Access" screen
3. Click "Sign in" button
4. Should redirect to `/handler/sign-in`
5. Create a new account (sign up)
6. Verify email if required
7. Should redirect to dashboard

### Phase 2: User Session
1. Dashboard should show "Projects" list
2. User button/menu should work
3. Navigate to `/handler/account-settings`
4. Verify user info displays correctly
5. Log out and log back in
6. Session should persist

### Phase 3: API Routes
1. Try creating a new project
2. Try AI chat/conversations
3. Try code suggestions (if applicable)
4. Check browser console for errors
5. Check Network tab for failed requests

### Phase 4: Convex Operations
1. Open Convex dashboard
2. Check `users` table - should have new user with `stackUserId`
3. Create a project - should work normally
4. Check `projects` table - `ownerId` should equal `stackUserId`

### Phase 5: Paddle Integration (Optional)
1. Try starting a trial subscription
2. Check webhook receives `stackUserId` in custom data
3. Verify subscription status updates in Convex

---

## Common Issues & Fixes

### Issue: "Cannot find module '@stackframe/stack'"
**Fix**: Run `npm install @stackframe/stack --legacy-peer-deps`

### Issue: "Unauthorized" on all pages
**Fix**: 
- Check `.env.local` has correct Stack Auth keys
- Restart dev server after adding env vars
- Check browser console for auth errors

### Issue: Convex errors about missing fields
**Fix**:
- Make sure `npx convex dev` is running
- Schema should auto-update with new fields
- Check Convex dashboard for schema version

### Issue: "stackUserId is not defined"
**Fix**:
- Convex schema needs to be deployed
- Stop and restart `npx convex dev`
- Check `convex/schema.ts` has `stackUserId` field

### Issue: API routes return 401
**Fix**:
- Check Stack Auth project is active
- Verify API keys are correct
- Check `stackServerApp` configuration in `stack/server.ts`

---

## Verification Checklist

Run through this checklist:

- [ ] `npm install` completed successfully
- [ ] Stack Auth project created in dashboard
- [ ] All 3 Stack Auth env vars added to `.env.local`
- [ ] `npx convex dev` running without errors
- [ ] `npm run dev` starts without errors
- [ ] Can navigate to homepage
- [ ] Sign-up page loads at `/handler/sign-up`
- [ ] Can create new account
- [ ] Redirects to dashboard after sign-up
- [ ] User record created in Convex `users` table with `stackUserId`
- [ ] Can create a project
- [ ] Can access project details
- [ ] AI features work (if tested)
- [ ] Can log out
- [ ] Can log back in
- [ ] Session persists across page refreshes

---

## Optional: Linting and Type Checking

After basic functionality works:

```bash
# Check for TypeScript errors
npm run build

# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

Expected issues:
- Unused imports (can be removed)
- Type mismatches (may need adjustment)

---

## Optional: Run Tests

After manual testing works:

```bash
# Unit tests
npm run test

# E2E tests (may need updates for new auth flow)
npm run test:e2e

# Electron tests
npm run test:electron
```

**Note**: Some tests may fail and need updates for Stack Auth.

---

## Optional: Update Electron App

If testing Electron:

```bash
# Compile TypeScript
npm run electron:compile

# Run Electron dev mode
npm run electron:dev
```

The Electron app should:
1. Launch successfully
2. Show sign-in prompt
3. Use M2M token for server operations
4. Store user token after sign-in

---

## When Everything Works

1. Commit your changes:
```bash
git add .
git commit -m "feat: migrate from Clerk to Stack Auth

- Fix PWA initializer undefined error
- Replace Clerk with Stack Auth for web and Electron
- Add M2M authentication for desktop app
- Update all API routes and Convex backend
- Maintain backward compatibility with clerkId field"
```

2. Push to your branch:
```bash
git push origin electron-desktop-integration-polaris-ide
```

3. Create pull request (if needed)

4. Update deployment environment variables on hosting platform

5. Deploy!

---

## Rollback Instructions

If critical issues arise:

```bash
# Restore from backups
cp convex/schema.ts.backup convex/schema.ts
cp convex/users.ts.backup convex/users.ts

# Reinstall Clerk (if needed)
npm install @clerk/nextjs @clerk/themes

# Revert git changes
git reset --hard HEAD~1

# Or create revert commit
git revert HEAD
```

---

## Support

- **Stack Auth Issues**: https://discord.stack-auth.com
- **Convex Issues**: Check Convex dashboard logs
- **General Issues**: See `MIGRATION_GUIDE.md` for detailed help

---

## Summary

**You're almost done!** 🎉

The code migration is complete. Just need to:
1. Install the package
2. Configure Stack Auth project
3. Add environment variables
4. Test the flow

Estimated time: **15-30 minutes** for setup + testing.

Good luck! 🚀
