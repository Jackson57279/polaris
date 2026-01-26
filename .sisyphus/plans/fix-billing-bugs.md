# Fix Billing & Subscription Bugs

## Context

### Original Request
User reported production issues:
1. Monthly checkout fails with 500 error, but yearly works
2. After subscribing to Pro (yearly), app still says user doesn't have Pro subscription
3. Console shows 404 errors for `/contact`, `/docs/features`, `/docs/faq`

### Root Cause Analysis
1. **Missing `/billing/success` page** - Checkout redirects to `/billing/success` which doesn't exist (404)
2. **No sync after checkout** - Even when yearly checkout succeeds, the subscription status is never synced to Convex because the success page doesn't exist
3. **Monthly product ID** - Likely `NEXT_PUBLIC_AUTUMN_PRO_MONTHLY_PRODUCT_ID` is not configured in production environment
4. **Dead links** - Pricing page links to pages that don't exist

---

## Work Objectives

### Core Objective
Fix the billing flow so users can successfully subscribe and have their subscription status properly recognized.

### Concrete Deliverables
- `/billing/success` page that syncs subscription after checkout
- Better error logging in checkout API
- Remove dead links from pricing page

### Definition of Done
- [ ] User can complete monthly checkout without 500 error
- [ ] After successful checkout, user is redirected to success page
- [ ] Success page syncs subscription and shows Pro status

### Must Have
- Success page must call `/api/autumn/sync` to update subscription status
- Better logging to diagnose product ID issues

### Must NOT Have (Guardrails)
- Don't modify Autumn/payment logic
- Don't change subscription pricing
- Don't add unnecessary pages (just fix what's broken)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (has test setup)
- **User wants tests**: Manual-only (production bug, needs quick fix)
- **Framework**: N/A - manual verification

---

## Task Flow

```
Task 1 (Create success page) → Task 2 (Add checkout logging) → Task 3 (Fix dead links)
```

## Parallelization

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | None | Independent |
| 2 | None | Independent |
| 3 | None | Independent |

All tasks can run in parallel.

---

## TODOs

- [x] 1. Create `/billing/success` page

  **What to do**:
  - Create `src/app/billing/success/page.tsx`
  - On mount, call `/api/autumn/sync` to sync subscription status
  - Show success message and loading state
  - Provide "Start Building" link to homepage
  - Provide "View Subscription" link to `/billing`
  - Handle sync errors gracefully with retry button

  **Must NOT do**:
  - Don't make additional API calls beyond sync
  - Don't redirect automatically (let user click)

  **Parallelizable**: YES (with 2, 3)

  **References**:
  - `src/app/api/autumn/sync/route.ts` - The sync API to call
  - `src/components/billing/subscription-manager.tsx:24-32` - Example of how sync is called
  - `src/app/api/autumn/checkout/route.ts:45` - Shows success_url is `/billing/success`
  - `src/app/billing/billing-content.tsx` - Similar page structure to follow

  **Acceptance Criteria**:
  - [ ] File exists: `src/app/billing/success/page.tsx`
  - [ ] Navigate to `/billing/success` in browser - should show success UI (not 404)
  - [ ] Check Network tab - should see POST to `/api/autumn/sync`
  - [ ] After sync completes, verify subscription status updated in Convex

  **Commit**: YES
  - Message: `fix(billing): add success page to sync subscription after checkout`
  - Files: `src/app/billing/success/page.tsx`

---

- [x] 2. Add logging to checkout API for debugging

  **What to do**:
  - Add console.log to show which tier is being requested
  - Add console.log to show the product ID being used
  - Log whether product ID is empty/undefined

  **Must NOT do**:
  - Don't change checkout logic
  - Don't expose sensitive data in logs

  **Parallelizable**: YES (with 1, 3)

  **References**:
  - `src/app/api/autumn/checkout/route.ts` - The checkout API route
  - Line 7-12: `getProductIdForTier` function
  - Line 33-36: Where product ID is checked

  **Acceptance Criteria**:
  - [ ] When checkout is called, logs show: tier requested, product ID resolved, whether it's empty
  - [ ] Check Vercel logs after a checkout attempt to see diagnostic info

  **Commit**: YES
  - Message: `fix(billing): add diagnostic logging to checkout API`
  - Files: `src/app/api/autumn/checkout/route.ts`

---

- [x] 3. Fix dead links in pricing page

  **What to do**:
  - Remove or update links to non-existent pages: `/docs/faq`, `/docs/features`, `/contact`
  - Option A: Remove the links entirely
  - Option B: Link to existing pages or `#` placeholder

  **Must NOT do**:
  - Don't create new documentation pages
  - Don't change pricing logic

  **Parallelizable**: YES (with 1, 2)

  **References**:
  - `src/app/pricing/pricing-content.tsx:261-269` - The dead links

  **Acceptance Criteria**:
  - [ ] Navigate to `/pricing` page
  - [ ] No 404 errors in console for link prefetch
  - [ ] Links either removed or point to valid pages

  **Commit**: YES
  - Message: `fix(pricing): remove links to non-existent pages`
  - Files: `src/app/pricing/pricing-content.tsx`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(billing): add success page to sync subscription after checkout` | `src/app/billing/success/page.tsx` | Navigate to page, check sync |
| 2 | `fix(billing): add diagnostic logging to checkout API` | `src/app/api/autumn/checkout/route.ts` | Check Vercel logs |
| 3 | `fix(pricing): remove links to non-existent pages` | `src/app/pricing/pricing-content.tsx` | No 404s on pricing page |

---

## Success Criteria

### Verification Commands
```bash
# Build check
bun run build  # Should pass

# Dev server
bun run dev    # Start server, then test manually
```

### Final Checklist
- [ ] `/billing/success` page exists and shows success UI
- [ ] Subscription syncs after checkout redirect
- [ ] No 404 errors on pricing page
- [ ] Checkout API logs diagnostic info for debugging

---

## IMPORTANT: Production Environment Check

After deploying, verify in production:
1. Check Vercel environment variables:
   - `NEXT_PUBLIC_AUTUMN_PRO_MONTHLY_PRODUCT_ID` - Must be set
   - `NEXT_PUBLIC_AUTUMN_PRO_YEARLY_PRODUCT_ID` - Must be set
2. If monthly product ID is missing/wrong, that's why monthly fails but yearly works
3. Check Vercel logs after attempting monthly checkout to see what product ID is resolved

## Pre-Deploy Note

The Convex types may be out of sync. Before deploying:
```bash
npx convex dev  # Run in separate terminal to regenerate types
```

This ensures `autumnCustomerId` and `by_autumn_customer` index are properly typed.
