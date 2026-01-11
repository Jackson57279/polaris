# Quick Start - Stack Auth Migration

## 🚀 Get Running in 3 Steps

### Step 1: Install Package (2 min)
```bash
npm install @stackframe/stack --legacy-peer-deps
```

### Step 2: Setup Stack Auth (5 min)
1. Go to https://app.stack-auth.com → Create project
2. Get your keys from dashboard
3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_STACK_PROJECT_ID=xxx
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=xxx
   STACK_SECRET_SERVER_KEY=xxx
   ```

### Step 3: Start Dev Servers (2 min)
```bash
# Terminal 1
npx convex dev

# Terminal 2
npm run dev
```

## ✅ Test It Works
1. Go to http://localhost:3000
2. Click "Sign in"
3. Create account at `/handler/sign-up`
4. Should land on dashboard ✨

## 📚 Full Documentation
- **Quick Reference**: This file
- **Detailed Setup**: `NEXT_STEPS.md`
- **Migration Guide**: `MIGRATION_GUIDE.md`
- **Full Summary**: `STACK_AUTH_MIGRATION_SUMMARY.md`

## ⚠️ Troubleshooting
- **"Cannot find module"** → Run `npm install @stackframe/stack --legacy-peer-deps`
- **"Unauthorized everywhere"** → Check `.env.local` has correct keys, restart server
- **"Convex errors"** → Make sure `npx convex dev` is running

## 📞 Need Help?
- Stack Auth Discord: https://discord.stack-auth.com
- Stack Auth Docs: https://docs.stack-auth.com

---

**That's it!** You're ready to test the new auth system. 🎉
