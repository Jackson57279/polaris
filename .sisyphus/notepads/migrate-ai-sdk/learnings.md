# Migrate AI SDK - Learnings & Conventions

## Completed Tasks

### Task 1: Retry Utilities and SSE Helpers ✅
- **Files**: `src/lib/retry.ts`, `src/lib/streaming.ts`
- **Status**: Already implemented
- **Notes**: 
  - `withRetry()` supports exponential backoff (baseDelay * 2^attempt)
  - SSE helpers provide `createSSEResponse()`, `writeSSEEvent()`, `createSSEStream()`
  - Event types: 'text', 'toolCall', 'toolResult', 'error', 'complete'

### Task 2: Streaming API Route for Messages ✅
- **File**: `src/app/api/messages/stream/route.ts`
- **Status**: Already implemented
- **Features**:
  - Uses `streamTextWithToolsPreferCerebras()` for AI generation
  - Streams text chunks via SSE with 100ms throttling
  - Persists tool calls and results to Convex
  - Retry logic with 3 attempts, 1s base delay
  - Error handling with proper SSE error events

### Task 3: Project Generation Polling API 🔄
- **Files**: 
  - `src/app/api/projects/generate/route.ts` (needs update - still uses Trigger.dev)
  - `src/app/api/projects/generate/status/[projectId]/route.ts` (already exists)
- **Status**: Status endpoint complete, main route needs migration from Trigger.dev

## Key Implementation Patterns

### SSE Event Format
```typescript
{type: 'text', content: string}
{type: 'toolCall', toolCall: {id, name, args}}
{type: 'toolResult', toolResult: {id, result}}
{type: 'error', error: string}
{type: 'complete'}
```

### Retry Configuration
```typescript
{
  maxAttempts: 3,
  baseDelay: 1000,  // 1s, 2s, 4s exponential
  onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error.message}`)
}
```

### Convex Integration
- Always use `internalKey` from `process.env.POLARIS_CONVEX_INTERNAL_KEY`
- Type cast IDs: `conversationId as Id<"conversations">`
- Mutations: `api.system.createMessage`, `api.system.streamMessageContent`, etc.

## Migration Strategy

### From Trigger.dev to AI SDK
- Replace `tasks.trigger("process-message", {...})` with direct SSE streaming
- Replace `tasks.trigger("generate-project", {...})` with async processing + polling
- Remove `@trigger.dev/sdk/v3` imports
- Delete `trigger/` directory after migration

### Frontend Changes
- Chat: Switch from Convex subscription to EventSource SSE client
- Project Generation: Switch from run tracking to polling status endpoint

## Anti-Patterns to Avoid
- No direct Convex mutations from frontend (use API routes)
- No synchronous file operations
- No inline styles (Tailwind only)
