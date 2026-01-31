# Migration: Trigger.dev → Vercel AI SDK with Tool Calls

> **TL;DR**: Remove Trigger.dev completely. Migrate chat to streaming API routes with SSE. Convert project generation to polling-based status updates. Implement full retry logic with exponential backoff.
>
> **Deliverables**:
> - New streaming API route for chat messages (`/api/messages/stream`)
> - New polling-based API for project generation (`/api/projects/generate`)
> - Updated frontend components for SSE streaming
> - Retry logic with exponential backoff
> - Removed Trigger.dev dependencies and configuration
>
> **Estimated Effort**: Large (6-8 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Setup → Stream API → Project Gen → Frontend → Cleanup

---

## Context

### Original Request
Migrate from Trigger.dev/Inngest to Vercel AI SDK with tool calls. Remove both and just use AI SDK with streaming.

### User Decisions
1. **Streaming Strategy**: Option B - API Routes with Response streaming (SSE)
2. **Project Generation**: Option B - Polling-based status updates
3. **Cancellation**: "Just stop the agent where it is" - AbortController on disconnect
4. **Frontend**: Migrate to streaming - consume SSE directly
5. **Retry**: Full retry with exponential backoff

### Architecture Changes

```
BEFORE (Trigger.dev):
Frontend → POST /api/messages → tasks.trigger() → Trigger.dev Worker
                                                    ↓
Frontend ← Convex subscription ← Convex mutations ← Stream

AFTER (AI SDK Streaming):
Frontend → POST /api/messages/stream → API Route
                                           ↓
Frontend ← SSE Stream ← streamText with tools ← AI SDK
                                           ↓
                                    Convex mutations (persistence)
```

---

## Work Objectives

### Core Objective
Remove Trigger.dev completely and migrate all AI processing to Vercel AI SDK with native streaming, while preserving all existing functionality.

### Concrete Deliverables
1. `src/app/api/messages/stream/route.ts` - SSE streaming endpoint for chat
2. `src/app/api/projects/generate/route.ts` - Polling-based project generation
3. `src/app/api/projects/generate/status/[projectId]/route.ts` - Status polling endpoint
4. `src/lib/retry.ts` - Exponential backoff retry utility
5. `src/lib/streaming.ts` - SSE streaming helpers
6. Updated `src/components/ai-elements/conversation.tsx` - SSE client
7. Updated `src/features/projects/components/ai-generate-dialog.tsx` - Polling UI
8. Removed `trigger/` directory and `@trigger.dev/sdk` dependency

### Definition of Done
- [x] Chat messages stream in real-time via SSE
- [x] Tool calls appear in stream with proper formatting
- [x] Project generation shows progress via polling
- [x] All AI operations retry on failure with exponential backoff
- [x] No Trigger.dev dependencies in package.json
- [x] No `triggerRunId` references in codebase
- [x] Frontend receives events within 100ms of AI generation
- [x] All existing tests pass (or are updated)

### Must Have
- Streaming chat with tool calls via SSE
- Polling-based project generation with progress tracking
- Full retry logic (3 attempts, exponential backoff: 1s, 2s, 4s)
- AbortController for request cancellation
- All existing tool definitions preserved
- Provider fallback (OpenRouter → Cerebras) maintained
- Convex persistence for message history

### Must NOT Have (Guardrails)
- No Trigger.dev dependencies remaining
- No changes to tool implementations
- No changes to AI prompts or system messages
- No changes to provider configuration
- No new AI features during migration
- No premature abstractions - keep code inline first

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright)
- **User wants tests**: Manual verification for this migration
- **QA approach**: Manual verification with specific commands

### Verification Procedures

**For Chat Streaming:**
```bash
# 1. Start development server
cd /home/dih/polaris-trigger-off/polaris && npm run dev

# 2. In another terminal, test SSE streaming
curl -N -X POST http://localhost:3000/api/messages/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "conversationId": "test-conv-id",
    "message": "Create a simple React counter component"
  }' \
  --max-time 120

# Expected: Stream of SSE events like:
# data: {"type":"text","content":"I'll"}
# data: {"type":"text","content":" create"}
# data: {"type":"toolCall","toolCall":{"id":"...","name":"writeFile","args":{...}}}
# data: {"type":"toolResult","toolResult":{"id":"...","result":"Successfully wrote..."}}
# data: {"type":"complete"}
```

**For Project Generation Polling:**
```bash
# 1. Start generation
curl -X POST http://localhost:3000/api/projects/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "description": "Simple React todo app with TypeScript",
    "projectName": "Test Project"
  }'

# Expected: {"projectId":"...","status":"processing"}

# 2. Poll for status
curl http://localhost:3000/api/projects/generate/status/PROJECT_ID \
  -H "Cookie: YOUR_AUTH_COOKIE"

# Expected: {"status":"processing","progress":45,"currentStep":"generate-components","events":[...]}
```

**For Retry Logic:**
```bash
# Test retry by temporarily breaking provider config
# Should see 3 attempts in logs with delays: 1s, 2s, 4s
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Start Immediately):
├── Task 1: Setup retry utilities and SSE helpers
├── Task 2: Create streaming API route for messages
└── Task 3: Create project generation polling API

Wave 2 (Integration - After Wave 1):
├── Task 4: Update frontend conversation component for SSE
├── Task 5: Update AI generate dialog for polling
└── Task 6: Add AbortController cancellation

Wave 3 (Cleanup - After Wave 2):
├── Task 7: Remove Trigger.dev dependencies
├── Task 8: Update documentation
└── Task 9: Final verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 5 | 2 |
| 4 | 2 | None | 5 |
| 5 | 3 | None | 4 |
| 6 | 2 | None | 4, 5 |
| 7 | 4, 5, 6 | None | None |
| 8 | 7 | None | None |
| 9 | 7, 8 | None | None |

---

## TODOs

### Wave 1: Foundation

#### Task 1: Create Retry Utilities and SSE Helpers

**What to do**:
- Create `src/lib/retry.ts` with exponential backoff
- Create `src/lib/streaming.ts` with SSE helpers
- Implement AbortController wrapper

**Must NOT do**:
- Don't integrate yet - just utilities
- Don't modify existing code

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`
- Reason: Simple utility functions, straightforward implementation

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3)
- **Blocks**: Tasks 2, 3
- **Blocked By**: None

**References**:
- Pattern: Look at existing utility files in `src/lib/` for style
- API: Use standard Web Streams API (ReadableStream, TransformStream)

**Acceptance Criteria**:
```typescript
// retry.ts should export:
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (error: Error, attempt: number) => void;
  }
): Promise<T>

// Test:
let attempts = 0;
await withRetry(async () => {
  attempts++;
  if (attempts < 3) throw new Error('fail');
  return 'success';
}, { maxAttempts: 3, baseDelay: 100 });
// Assert: attempts === 3, total delay ~300ms (100 + 200)
```

**Commit**: YES
- Message: `feat(lib): add retry utilities with exponential backoff`
- Files: `src/lib/retry.ts`, `src/lib/streaming.ts`

---

#### Task 2: Create Streaming API Route for Messages

**What to do**:
- Create `src/app/api/messages/stream/route.ts`
- Implement SSE streaming with AI SDK
- Integrate existing tool definitions
- Add retry logic
- Stream tool calls and results
- Persist to Convex

**Must NOT do**:
- Don't delete old `/api/messages/route.ts` yet (keep for comparison)
- Don't change tool definitions
- Don't change AI prompts

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `git-master`, `playwright`
- Reason: Complex streaming logic, needs to handle edge cases

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3)
- **Blocks**: Task 4, 6
- **Blocked By**: Task 1

**References**:
- Current implementation: `trigger/tasks/process-message.ts:53-180`
- Tool creation: `src/lib/ai-tools.ts:25-200`
- Streaming: `src/lib/generate-text-with-tools.ts:420-463`
- Provider fallback: `src/lib/generate-text-with-tools.ts:343-401`

**Acceptance Criteria**:
```bash
# Start dev server first
cd /home/dih/polaris-trigger-off/polaris && npm run dev

# Test streaming endpoint
curl -N -X POST http://localhost:3000/api/messages/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "conversationId": "YOUR_CONV_ID",
    "message": "Say hello"
  }' \
  --max-time 60 | tee /tmp/stream.log

# Assert: Response headers include "Content-Type: text/event-stream"
# Assert: Stream contains events:
#   - data: {"type":"text","content":"..."}
#   - data: {"type":"complete"}
# Assert: No errors in terminal logs
# Assert: Message saved to Convex with status "completed"
```

**Commit**: YES
- Message: `feat(api): add streaming message endpoint with SSE`
- Files: `src/app/api/messages/stream/route.ts`

---

#### Task 3: Create Project Generation Polling API

**What to do**:
- Modify `src/app/api/projects/generate/route.ts` to start async job
- Create `src/app/api/projects/generate/status/[projectId]/route.ts`
- Implement background processing via setImmediate/async pattern
- Store progress in Convex
- Add retry logic for each generation step

**Must NOT do**:
- Don't use Trigger.dev (remove tasks.trigger call)
- Don't change generation steps sequence
- Don't block the HTTP response

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `git-master`
- Reason: Complex multi-step async processing, state management

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2)
- **Blocks**: Task 5
- **Blocked By**: Task 1

**References**:
- Current implementation: `trigger/tasks/generate-project.ts:29-183`
- API route: `src/app/api/projects/generate/route.ts:17-105`
- Generation events: `convex/system.ts:419-445`
- Convex mutations: `convex/system.ts` (appendGenerationEvent, etc.)

**Acceptance Criteria**:
```bash
# Start generation (should return immediately)
curl -X POST http://localhost:3000/api/projects/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "description": "Create a simple React counter",
    "projectName": "Test Counter"
  }'

# Expected: {"projectId":"...","status":"processing"}

# Poll for status every 2 seconds
for i in {1..30}; do
  curl -s http://localhost:3000/api/projects/generate/status/PROJECT_ID \
    -H "Cookie: YOUR_AUTH_COOKIE" | jq '.'
  sleep 2
done

# Assert: Progress increases over time
# Assert: Status changes from "processing" to "completed"
# Assert: Events array shows all 9 steps
# Assert: Files are created in the project
```

**Commit**: YES
- Message: `feat(api): convert project generation to polling-based`
- Files: `src/app/api/projects/generate/route.ts`, `src/app/api/projects/generate/status/[projectId]/route.ts`

---

### Wave 2: Frontend Integration

#### Task 4: Update Conversation Component for SSE

**What to do**:
- Modify `src/components/ai-elements/conversation.tsx`
- Replace Convex subscription with EventSource
- Handle SSE events (text, toolCall, toolResult, complete, error)
- Maintain scroll-to-bottom behavior
- Handle reconnection on disconnect

**Must NOT do**:
- Don't change UI layout or styling
- Don't add new features
- Don't break existing message display logic

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `git-master`, `playwright`
- Reason: Frontend UI changes, need to test streaming behavior

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 5)
- **Blocks**: None
- **Blocked By**: Task 2

**References**:
- Current component: `src/components/ai-elements/conversation.tsx`
- Message component: `src/components/ai-elements/message.tsx`
- Tool component: `src/components/ai-elements/tool.tsx`

**Acceptance Criteria**:
```bash
# Automated test with Playwright:
# 1. Navigate to project conversation
# 2. Type message and send
# 3. Assert: Response appears word-by-word (streaming)
# 4. Assert: Tool calls appear with animation
# 5. Assert: Scroll stays at bottom
# 6. Assert: Message saved to history
```

**Commit**: YES
- Message: `feat(ui): integrate SSE streaming in conversation component`
- Files: `src/components/ai-elements/conversation.tsx`

---

#### Task 5: Update AI Generate Dialog for Polling

**What to do**:
- Modify `src/features/projects/components/ai-generate-dialog.tsx`
- Replace Trigger.dev run tracking with polling
- Show progress bar based on generation events
- Handle errors and retries
- Add cancel button (stops polling, calls abort)

**Must NOT do**:
- Don't change dialog UI design
- Don't modify generation logic

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `git-master`
- Reason: UI component updates, polling logic

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 4)
- **Blocks**: None
- **Blocked By**: Task 3

**References**:
- Current dialog: `src/features/projects/components/ai-generate-dialog.tsx`
- Generation events query: `convex/system.ts:419-445`

**Acceptance Criteria**:
```bash
# Playwright test:
# 1. Open AI generate dialog
# 2. Enter description
# 3. Click Generate
# 4. Assert: Progress bar increases
# 5. Assert: Steps shown (config → structure → components → ...)
# 6. Assert: Dialog closes on completion
# 7. Assert: Project files created
```

**Commit**: YES
- Message: `feat(ui): convert AI generate dialog to polling-based`
- Files: `src/features/projects/components/ai-generate-dialog.tsx`

---

#### Task 6: Add AbortController Cancellation

**What to do**:
- Add AbortController to streaming API route
- Listen for client disconnect (req.signal)
- Stop AI generation on disconnect
- Add cancel button to conversation UI

**Must NOT do**:
- Don't implement complex state cleanup
- "Just stop the agent where it is" - simple abort is fine

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`
- Reason: Simple AbortController integration

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 4, 5)
- **Blocks**: None
- **Blocked By**: Task 2

**References**:
- SSE cancellation pattern: Web Streams API
- Current cancel: `src/app/api/messages/route.ts:102-135`

**Acceptance Criteria**:
```bash
# Test cancellation:
curl -N -X POST http://localhost:3000/api/messages/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "conversationId": "test",
    "message": "Write a long essay"
  }' &
PID=$!
sleep 2
kill $PID

# Assert: Server logs show "Client disconnected, aborting generation"
# Assert: AI generation stops (check provider logs)
```

**Commit**: YES
- Message: `feat(api): add request cancellation via AbortController`
- Files: `src/app/api/messages/stream/route.ts`, `src/components/ai-elements/conversation.tsx`

---

### Wave 3: Cleanup

#### Task 7: Remove Trigger.dev Dependencies

**What to do**:
- Remove `@trigger.dev/sdk` from package.json
- Delete `trigger.config.ts`
- Delete `trigger/` directory
- Remove `dev:trigger` script from package.json
- Delete old `src/app/api/messages/route.ts` (replaced by stream version)
- Remove `triggerRunId` field from Convex schema
- Remove `updateMessageTriggerRunId` and related mutations

**Must NOT do**:
- Don't remove any other dependencies
- Don't break existing functionality

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`
- Reason: Cleanup task, straightforward deletions

**Parallelization**:
- **Can Run In Parallel**: NO
- **Blocks**: Task 8, 9
- **Blocked By**: Tasks 4, 5, 6

**References**:
- Trigger config: `trigger.config.ts`
- Trigger tasks: `trigger/tasks/`
- Schema: `convex/schema.ts`
- Package: `package.json:76`

**Acceptance Criteria**:
```bash
# Verify no Trigger.dev references remain:
grep -r "trigger.dev" src/ --include="*.ts" --include="*.tsx" || echo "No Trigger.dev references found"
grep -r "@trigger" convex/ --include="*.ts" || echo "No Trigger.dev references in Convex"
! grep "@trigger.dev/sdk" package.json

# Verify build succeeds:
npm run build
# Assert: Build completes without errors
```

**Commit**: YES
- Message: `chore(deps): remove Trigger.dev dependencies and configuration`
- Files: `trigger.config.ts`, `trigger/`, `package.json`, `convex/schema.ts`, etc.

---

#### Task 8: Update Documentation

**What to do**:
- Update `AGENTS.md` - remove Trigger.dev references
- Update `CLAUDE.md` - remove Inngest/Trigger.dev setup
- Update `README.md` - new architecture description
- Add comments to new API routes

**Must NOT do**:
- Don't change code logic
- Don't add unnecessary documentation

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: `git-master`
- Reason: Documentation updates

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 9)
- **Blocks**: None
- **Blocked By**: Task 7

**References**:
- Current docs: `AGENTS.md`, `CLAUDE.md`, `README.md`

**Acceptance Criteria**:
```bash
# Verify documentation updated:
grep -i "trigger.dev\|inngest" AGENTS.md CLAUDE.md README.md || echo "Old references removed"
grep -i "ai sdk\|streaming" AGENTS.md || echo "New architecture documented"
```

**Commit**: YES
- Message: `docs: update architecture docs for AI SDK migration`
- Files: `AGENTS.md`, `CLAUDE.md`, `README.md`

---

#### Task 9: Final Verification

**What to do**:
- Run full test suite
- Manual end-to-end testing
- Verify all features work
- Check for console errors
- Verify build succeeds

**Must NOT do**:
- Don't fix unrelated issues
- Don't add new features

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `playwright`, `git-master`
- Reason: Comprehensive testing

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 8)
- **Blocks**: None
- **Blocked By**: Task 7

**Acceptance Criteria**:
```bash
# Full verification checklist:

# 1. Build succeeds
npm run build
# Assert: Exit code 0

# 2. Tests pass
npm test
# Assert: All tests pass

# 3. Lint passes
npm run lint
# Assert: No errors

# 4. Chat streaming works
# (Manual: Open project, send message, verify streaming)

# 5. Project generation works
# (Manual: Create AI project, verify progress, verify files)

# 6. Cancellation works
# (Manual: Start generation, click cancel, verify stopped)

# 7. Retry logic works
# (Manual: Temporarily break provider, verify 3 retries in logs)

# 8. No console errors
# (Manual: Check browser console and server logs)
```

**Commit**: YES
- Message: `chore: final verification and cleanup`
- Files: Any final fixes

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(lib): add retry utilities with exponential backoff` | `src/lib/retry.ts`, `src/lib/streaming.ts` | Unit tests pass |
| 2 | `feat(api): add streaming message endpoint with SSE` | `src/app/api/messages/stream/route.ts` | curl test passes |
| 3 | `feat(api): convert project generation to polling-based` | `src/app/api/projects/generate/route.ts`, `src/app/api/projects/generate/status/[projectId]/route.ts` | curl test passes |
| 4 | `feat(ui): integrate SSE streaming in conversation component` | `src/components/ai-elements/conversation.tsx` | Playwright test passes |
| 5 | `feat(ui): convert AI generate dialog to polling-based` | `src/features/projects/components/ai-generate-dialog.tsx` | Playwright test passes |
| 6 | `feat(api): add request cancellation via AbortController` | `src/app/api/messages/stream/route.ts`, `src/components/ai-elements/conversation.tsx` | Manual test passes |
| 7 | `chore(deps): remove Trigger.dev dependencies and configuration` | Multiple files | grep test passes, build succeeds |
| 8 | `docs: update architecture docs for AI SDK migration` | `AGENTS.md`, `CLAUDE.md`, `README.md` | Documentation review |
| 9 | `chore: final verification and cleanup` | Any final fixes | Full test suite passes |

---

## Success Criteria

### Verification Commands
```bash
# 1. No Trigger.dev references
grep -r "trigger.dev\|@trigger" src/ convex/ --include="*.ts" --include="*.tsx" | wc -l
# Expected: 0

# 2. Build succeeds
cd /home/dih/polaris-trigger-off/polaris && npm run build
# Expected: Exit code 0

# 3. Tests pass
npm test
# Expected: All pass

# 4. AI SDK is primary
grep "ai" package.json | head -1
# Expected: "ai": "^6.0.6"
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] Chat streaming works end-to-end
- [x] Project generation works with polling
- [x] Retry logic visible in logs
- [x] Cancellation stops processing
- [x] No Trigger.dev dependencies
- [x] All documentation updated
- [x] Build succeeds
- [x] Tests pass
