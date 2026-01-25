# Agent Performance Optimization - Architectural Decisions

## 2026-01-25T08:06:29.860Z - Planning Phase

### Decision 1: Streaming Implementation Strategy

**Options Considered:**
1. Server-Sent Events (SSE) from API route
2. Convex real-time subscriptions
3. WebSocket connection

**Decision:** Use Convex real-time subscriptions

**Rationale:**
- Already using Convex for all data
- Built-in optimistic updates
- No additional infrastructure needed
- Consistent with existing architecture

**Implementation:**
- Add `streamMessageContent` mutation to Convex
- Use `streamText` from AI SDK in Inngest function
- Frontend subscribes to message updates via Convex

---

### Decision 2: Tool Execution Parallelization

**Options Considered:**
1. Always parallel (risky - dependencies)
2. Always sequential (slow)
3. Smart dependency detection

**Decision:** Smart dependency detection with parallel execution

**Rationale:**
- Maximum performance for independent tools
- Safety for dependent operations (read before write)
- Configurable per tool

**Implementation:**
- Analyze tool call arguments for file path overlaps
- Execute independent tools with `Promise.all()`
- Queue dependent tools sequentially

---

### Decision 3: LSP Integration Approach

**Options Considered:**
1. Full TypeScript Language Service in backend
2. Lightweight symbol extraction
3. External LSP server

**Decision:** Full TypeScript Language Service in backend

**Rationale:**
- Most accurate code intelligence
- No external dependencies
- Can reuse existing TS installation
- Supports all LSP features (symbols, references, diagnostics)

**Trade-offs:**
- Higher memory usage
- Slower initial startup
- Worth it for accuracy

---

### Decision 4: Terminal Execution Safety

**Options Considered:**
1. No terminal execution (too restrictive)
2. Full terminal access (unsafe)
3. Whitelist with sandboxing

**Decision:** Strict whitelist with command validation

**Rationale:**
- Security is paramount
- Most common commands are safe (npm, git, build)
- Can expand whitelist as needed

**Whitelist:**
- Package managers: npm, bun, pnpm, yarn
- Version control: git
- Build tools: tsc, eslint, prettier, test
- Node runtime: node (with restrictions)

**Blocked:**
- File system: rm -rf, chmod, chown
- Network: curl, wget, ssh, scp
- Privilege escalation: sudo, su

---

### Decision 5: Context Management Strategy

**Options Considered:**
1. Include all files (token waste)
2. Manual file selection (poor UX)
3. Smart relevance detection

**Decision:** Smart relevance detection with scoring

**Rationale:**
- Reduces token usage
- Improves response quality
- Better than manual selection

**Scoring Factors:**
1. Direct imports/exports (weight: 10)
2. Shared symbols (weight: 7)
3. Recent edits (weight: 5)
4. File proximity (weight: 3)
5. Similar file types (weight: 2)

---

### Decision 6: Caching Strategy

**Options Considered:**
1. No caching (simple but slow)
2. Redis/external cache (complex)
3. In-memory LRU cache

**Decision:** In-memory LRU cache with file hash invalidation

**Rationale:**
- Simple implementation
- No external dependencies
- Automatic invalidation on file changes

**Cache Keys:**
- File contents: `file:{path}:{hash}`
- Project structure: `structure:{projectId}:{timestamp}`
- Diagnostics: `diagnostics:{path}:{hash}`

**TTL:**
- File contents: 5 minutes
- Diagnostics: 1 minute
- Project structure: 5 minutes
