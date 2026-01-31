# Inngest to Trigger.dev Migration Plan

## TL;DR

> **Quick Summary**: Complete migration from Inngest to Trigger.dev v3 for better streaming, reduced errors, and dedicated compute for AI tasks.
>
> **Deliverables**:
> - Trigger.dev configuration and SDK setup
> - Migrated `processMessage` task with Realtime streaming
> - Migrated `generateProject` task with durable sequential steps
> - Updated API routes (`/api/messages`, `/api/projects/generate`)
> - Sentry error tracking integration
> - Removed Inngest dependencies
>
> **Estimated Effort**: Large (1-2 days)
> **Parallel Execution**: NO - sequential migration required
> **Critical Path**: Setup → Demo tasks → processMessage → generateProject → Cleanup

---

## Context

### Original Request
Migrate from Inngest to Trigger.dev due to error issues, desire for better streaming, and architectural preference.

### Interview Summary
**Key Decisions**:
- Complete migration (all at once, not gradual)
- All existing business logic preserved
- Keep Convex for database (only change job runner)
- Better streaming is a priority

**Metis Review Findings** (addressed):
- Streaming: Two approaches available - kept Convex mutations for simpler migration
- Cancellation: Must store Trigger.dev run ID in Convex
- Sentry: Official integration available via build extensions
- Sequential workflows: Use `triggerAndWait()` with idempotency keys

---

## Work Objectives

### Core Objective
Replace Inngest background job infrastructure with Trigger.dev v3 while preserving all functionality and improving streaming reliability.

### Concrete Deliverables
- `trigger.config.ts` - Trigger.dev configuration
- `trigger/init.ts` - SDK initialization with Sentry
- `trigger/tasks/process-message.ts` - AI conversation task
- `trigger/tasks/generate-project.ts` - Project generation task
- `trigger/tasks/demo-generate.ts` - Demo task (converted)
- `trigger/tasks/demo-error.ts` - Demo error task (converted)
- Updated `src/app/api/messages/route.ts`
- Updated `src/app/api/projects/generate/route.ts`
- Updated Convex schema (add `triggerRunId` to messages)

### Definition of Done
- [ ] `npm run dev` starts without Inngest
- [ ] `npx trigger.dev dev` runs tasks locally
- [ ] Sending message streams AI response in real-time
- [ ] Cancelling message stops processing immediately
- [ ] Project generation completes all 9 steps
- [ ] Errors are tracked in Sentry
- [ ] All Inngest dependencies removed from package.json

### Must Have
- Realtime streaming for AI responses
- Task cancellation support
- Sentry error tracking
- TypeScript type safety
- All existing functionality preserved

### Must NOT Have (Guardrails)
- No changes to business logic (same AI prompts, tools)
- No database schema changes beyond adding run ID
- No frontend changes (except streaming integration if needed)
- No hybrid Inngest/Trigger.dev state

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (Trigger.dev is new)
- **User wants tests**: Manual verification (complex streaming setup)
- **QA approach**: Manual verification with specific test scenarios

### Manual Verification Procedures

**Test 1: Message Processing**
```bash
# 1. Start dev servers
npm run dev
npx trigger.dev dev

# 2. Open app, start new conversation
# 3. Send message "Hello"
# 4. Verify: AI response streams in real-time
# 5. Verify: No errors in console
```

**Test 2: Message Cancellation**
```bash
# 1. Send long message
# 2. Click cancel button while processing
# 3. Verify: Processing stops
# 4. Verify: Message status changes to "cancelled"
```

**Test 3: Project Generation**
```bash
# 1. Click "Generate Project"
# 2. Enter description
# 3. Verify: All 9 steps complete
# 4. Verify: Files are created in Convex
# 5. Verify: Project appears in dashboard
```

**Test 4: Error Handling**
```bash
# 1. Trigger demo error (add temporary route)
# 2. Verify: Error appears in Sentry
# 3. Verify: Task shows as failed in Trigger.dev dashboard
```

---

## Execution Strategy

### Sequential Execution (NO Parallel)

All tasks must execute in sequence due to dependencies:

```
Phase 1: Foundation
└── Task 1: Setup Trigger.dev Configuration
    └── Creates base infrastructure for all other tasks

Phase 2: Convex Schema
└── Task 2: Add triggerRunId Field
    └── Required before API routes can store run IDs

Phase 3: Demo Validation
├── Task 3: Migrate demoGenerate
│   └── Validates basic task + Convex integration
└── Task 4: Migrate demoError
    └── Validates Sentry error tracking

Phase 4: Core Features
├── Task 5: Migrate processMessage
│   └── Most complex: streaming, tools, cancellation
└── Task 6: Migrate generateProject
    └── Sequential workflow with idempotency

Phase 5: API Updates
├── Task 7: Update /api/messages
└── Task 8: Update /api/projects/generate

Phase 6: Cleanup
└── Task 9: Remove Inngest
```

### Critical Path
Total time = Sum of all tasks (no parallel speedup possible)

---

## TODOs

- [ ] 1. Setup Trigger.dev Configuration

  **What to do**:
  - Create `trigger.config.ts` with project configuration
  - Create `trigger/init.ts` with SDK initialization and Sentry
  - Install `@trigger.dev/sdk` package
  - Update `.env.local` with Trigger.dev credentials

  **Must NOT do**:
  - Do NOT remove Inngest yet (wait for cleanup task)
  - Do NOT modify existing functions yet

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Infrastructure setup requiring careful configuration
  - **Skills**: N/A (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Phase 1 (blocking)
  - **Blocks**: Task 2, 3, 4, 5, 6, 7, 8, 9
  - **Blocked By**: None

  **References**:
  - Trigger.dev docs: https://trigger.dev/docs
  - Current Inngest setup: `src/inngest/client.ts`
  - Sentry DSN: Already configured in project

  **Acceptance Criteria**:
  - [ ] `trigger.config.ts` created with TypeScript configuration
  - [ ] `trigger/init.ts` created with Sentry integration
  - [ ] `package.json` updated with `@trigger.dev/sdk`
  - [ ] `.env.local` has `TRIGGER_SECRET_KEY`
  - [ ] `npx trigger.dev dev` starts without errors
  
  **Commit**: YES
  - Message: `chore(trigger): setup Trigger.dev configuration`
  - Files: `trigger.config.ts`, `trigger/init.ts`, `package.json`, `.env.local`

---

- [ ] 2. Add triggerRunId to Convex Schema

  **What to do**:
  - Modify `convex/schema.ts` to add `triggerRunId` field to messages table
  - Create Convex migration if needed (optional for dev)

  **Must NOT do**:
  - Do NOT modify other fields
  - Do NOT remove existing indexes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple schema addition
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO (must wait for Task 1)
  - **Blocks**: Task 5, 6, 7, 8
  - **Blocked By**: Task 1

  **References**:
  - Current schema: `convex/schema.ts`
  - Messages table definition

  **Acceptance Criteria**:
  - [ ] `triggerRunId` field added to messages schema (optional string)
  - [ ] `npx convex dev` runs without schema errors
  
  **Commit**: YES
  - Message: `schema(messages): add triggerRunId field`
  - Files: `convex/schema.ts`

---

- [ ] 3. Migrate demoGenerate Task

  **What to do**:
  - Convert `demoGenerate` from Inngest to Trigger.dev task
  - Keep URL extraction and scraping logic
  - Keep AI generation logic
  - Test end-to-end

  **Must NOT do**:
  - Do NOT modify business logic (same prompt, same AI calls)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Simple conversion, proof of concept
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 4, 5, 6
  - **Blocked By**: Task 1, 2

  **References**:
  - Current implementation: `src/inngest/functions.ts:194-231`
  - Trigger.dev task docs: https://trigger.dev/docs/tasks

  **Acceptance Criteria**:
  - [ ] Task file created at `trigger/tasks/demo-generate.ts`
  - [ ] Task triggers successfully via test route
  - [ ] URL extraction works
  - [ ] Scraping works (if Firecrawl configured)
  - [ ] AI generation works
  
  **Commit**: YES
  - Message: `feat(trigger): migrate demoGenerate task`
  - Files: `trigger/tasks/demo-generate.ts`

---

- [ ] 4. Migrate demoError Task

  **What to do**:
  - Convert `demoError` from Inngest to Trigger.dev task
  - Verify Sentry captures the error
  - Verify task shows as failed in dashboard

  **Must NOT do**:
  - Do NOT catch the error (should propagate to Sentry)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 5, 6
  - **Blocked By**: Task 1, 3

  **References**:
  - Current implementation: `src/inngest/functions.ts:233-241`
  - Sentry integration: `trigger/init.ts` (from Task 1)

  **Acceptance Criteria**:
  - [ ] Task file created at `trigger/tasks/demo-error.ts`
  - [ ] Task triggers successfully
  - [ ] Error appears in Sentry
  - [ ] Task shows as failed in Trigger.dev dashboard
  
  **Commit**: YES
  - Message: `feat(trigger): migrate demoError task with Sentry`
  - Files: `trigger/tasks/demo-error.ts`

---

- [ ] 5. Migrate processMessage Task

  **What to do**:
  - Convert `processMessage` from Inngest to Trigger.dev task
  - Implement streaming via Convex mutations (keep existing pattern)
  - Implement tool calls (file, LSP, search, terminal, context)
  - Add cancellation support via run ID tracking
  - Add error handling with Sentry
  - Test with real AI conversation

  **Must NOT do**:
  - Do NOT change streaming approach (keep Convex mutations, not Trigger.dev streams)
  - Do NOT modify tool implementations (just how they're called)
  - Do NOT change throttling logic (100ms)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex task with streaming, tools, cancellation
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 7
  - **Blocked By**: Task 1, 2, 3, 4

  **References**:
  - Current implementation: `src/features/conversations/inngest/process-message.ts`
  - Tool creators: `src/lib/ai-tools.ts`, `src/lib/lsp-tools.ts`, etc.
  - Convex mutations: `convex/system.ts` (getMessageContext, streamMessageContent, etc.)
  - Cancellation pattern: `runs.cancel()` from Trigger.dev SDK

  **Acceptance Criteria**:
  - [ ] Task file created at `trigger/tasks/process-message.ts`
  - [ ] Task can be triggered from API route
  - [ ] AI response streams to Convex (visible in UI)
  - [ ] Tool calls work (file read/write, LSP, search, terminal)
  - [ ] Cancellation stops processing immediately
  - [ ] Errors are caught and sent to Sentry
  - [ ] Message status updates correctly (processing → complete/failed)
  
  **Commit**: YES
  - Message: `feat(trigger): migrate processMessage with streaming and cancellation`
  - Files: `trigger/tasks/process-message.ts`

---

- [ ] 6. Migrate generateProject Task

  **What to do**:
  - Convert `generateProject` from Inngest to Trigger.dev task
  - Use `triggerAndWait()` for durable sequential steps
  - Use idempotency keys for retry safety
  - Keep all 9 generation steps
  - Keep Convex HTTP client integration
  - Keep event logging

  **Must NOT do**:
  - Do NOT combine steps (keep 9 separate logical steps)
  - Do NOT remove logging
  - Do NOT change AI prompts or tool usage

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex sequential workflow with idempotency
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 8
  - **Blocked By**: Task 1, 2, 5

  **References**:
  - Current implementation: `src/inngest/functions.ts:25-191`
  - File tools: `src/lib/ai-tools.ts`
  - Idempotency docs: https://trigger.dev/docs/idempotency

  **Acceptance Criteria**:
  - [ ] Task file created at `trigger/tasks/generate-project.ts`
  - [ ] All 9 steps execute in sequence
  - [ ] Idempotency keys prevent duplicate work on retry
  - [ ] Files are created via AI tools
  - [ ] Events are logged to Convex
  - [ ] Project generation completes successfully
  - [ ] Step failures retry appropriately
  
  **Commit**: YES
  - Message: `feat(trigger): migrate generateProject with sequential steps`
  - Files: `trigger/tasks/generate-project.ts`

---

- [ ] 7. Update /api/messages Route

  **What to do**:
  - Replace `inngest.send()` with `tasks.trigger()`
  - Store returned run ID in Convex message record
  - Update DELETE handler to use `runs.cancel()`
  - Test message creation and cancellation

  **Must NOT do**:
  - Do NOT change request/response schemas
  - Do NOT change auth logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-medium`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 5

  **References**:
  - Current route: `src/app/api/messages/route.ts`
  - Trigger.dev SDK: `tasks.trigger()`, `runs.cancel()`
  - Convex mutations: `api.system.createMessage`, `api.system.cancelMessage`

  **Acceptance Criteria**:
  - [ ] POST handler triggers Trigger.dev task
  - [ ] Run ID is stored in Convex message record
  - [ ] DELETE handler cancels Trigger.dev run
  - [ ] Message status updates work correctly
  - [ ] No Inngest imports remain
  
  **Commit**: YES
  - Message: `refactor(api): update messages route for Trigger.dev`
  - Files: `src/app/api/messages/route.ts`

---

- [ ] 8. Update /api/projects/generate Route

  **What to do**:
  - Replace `inngest.send()` with `tasks.trigger()`
  - Store returned run ID (optional for projects)
  - Test project generation trigger

  **Must NOT do**:
  - Do NOT change billing/Autumn integration
  - Do NOT change project creation flow

  **Recommended Agent Profile**:
  - **Category**: `unspecified-medium`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:
  - Current route: `src/app/api/projects/generate/route.ts`
  - Task: `trigger/tasks/generate-project.ts`

  **Acceptance Criteria**:
  - [ ] POST handler triggers Trigger.dev task
  - [ ] Project generation starts successfully
  - [ ] No Inngest imports remain
  
  **Commit**: YES
  - Message: `refactor(api): update project generation route for Trigger.dev`
  - Files: `src/app/api/projects/generate/route.ts`

---

- [ ] 9. Remove Inngest Dependencies

  **What to do**:
  - Delete `src/inngest/client.ts`
  - Delete `src/inngest/functions.ts`
  - Delete `src/features/conversations/inngest/` directory
  - Delete `src/app/api/inngest/route.ts`
  - Remove `inngest` and `@inngest/middleware-sentry` from package.json
  - Update `package.json` scripts (remove `dev:inngest`)
  - Update documentation (CLAUDE.md, README.md)

  **Must NOT do**:
  - Do NOT delete until all other tasks complete
  - Do NOT break existing imports (should already be updated)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None (final task)
  - **Blocked By**: Task 7, 8

  **References**:
  - Files to delete listed above
  - Package.json: Remove inngest dependencies

  **Acceptance Criteria**:
  - [ ] All Inngest source files deleted
  - [ ] `package.json` dependencies updated
  - [ ] `npm install` runs without Inngest packages
  - [ ] App starts without Inngest
  - [ ] Documentation updated
  - [ ] No Inngest references in codebase (except migration notes)
  
  **Commit**: YES
  - Message: `chore(cleanup): remove Inngest dependencies and files`
  - Files: Deleted files, `package.json`, documentation

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `chore(trigger): setup Trigger.dev configuration` | trigger.config.ts, trigger/init.ts, package.json, .env.local | `npx trigger.dev dev` works |
| 2 | `schema(messages): add triggerRunId field` | convex/schema.ts | `npx convex dev` works |
| 3 | `feat(trigger): migrate demoGenerate task` | trigger/tasks/demo-generate.ts | Task runs successfully |
| 4 | `feat(trigger): migrate demoError task with Sentry` | trigger/tasks/demo-error.ts | Error appears in Sentry |
| 5 | `feat(trigger): migrate processMessage with streaming` | trigger/tasks/process-message.ts | Streaming works, cancellation works |
| 6 | `feat(trigger): migrate generateProject with steps` | trigger/tasks/generate-project.ts | All 9 steps complete |
| 7 | `refactor(api): update messages route` | src/app/api/messages/route.ts | Messages trigger correctly |
| 8 | `refactor(api): update project generation route` | src/app/api/projects/generate/route.ts | Projects generate correctly |
| 9 | `chore(cleanup): remove Inngest dependencies` | All Inngest files deleted | App runs without Inngest |

---

## Success Criteria

### Verification Commands

```bash
# 1. Install dependencies
npm install

# 2. Start development servers
npm run dev
npx trigger.dev dev

# 3. Run all test scenarios manually
# - Send message and verify streaming
# - Cancel message and verify stop
# - Generate project and verify completion
# - Trigger error and verify Sentry
```

### Final Checklist
- [ ] All "Must Have" present (streaming, cancellation, Sentry)
- [ ] All "Must NOT Have" absent (no Inngest code)
- [ ] All 9 tasks complete
- [ ] Manual verification passes all tests
- [ ] No Inngest references in codebase
- [ ] Documentation updated

---

## Environment Variables

### Add to `.env.local`:
```env
# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxxxxx  # From Trigger.dev dashboard
TRIGGER_API_URL=                              # Optional, for self-hosted
```

### Remove from `.env.local` (after migration):
```env
# Inngest (remove these)
# INNGEST_EVENT_KEY=
# INNGEST_SIGNING_KEY=
```

---

## Notes

### Key Architectural Decisions

1. **Streaming Approach**: Kept Convex mutations instead of Trigger.dev Realtime API
   - Rationale: Simpler migration, existing frontend subscriptions work
   - Trade-off: Slightly more latency than native streaming

2. **Cancellation**: Store Trigger.dev run ID in Convex
   - Rationale: Required for `runs.cancel()` API
   - Trade-off: Additional DB field

3. **Sequential Steps**: Use `triggerAndWait()` with idempotency keys
   - Rationale: Durable execution, step-level retries
   - Trade-off: More complex than single task

### Migration Risks (Mitigated)

| Risk | Mitigation |
|------|------------|
| Task timeout on long AI calls | Trigger.dev supports up to 68 years, no practical limits |
| Convex auth token expiration | Use longer-lived tokens or refresh pattern |
| Streaming reliability | Fallback to polling if needed (existing Convex subscriptions) |
| Deployment complexity | Clear step-by-step plan, validated with demo tasks first |

### Post-Migration

After migration completes:
1. Monitor Sentry for new error patterns
2. Monitor Trigger.dev dashboard for task performance
3. Consider migrating to native Trigger.dev Realtime streaming in future iteration
4. Update team documentation and onboarding
