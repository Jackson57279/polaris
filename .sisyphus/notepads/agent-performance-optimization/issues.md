# Agent Performance Optimization - Known Issues

## 2026-01-25T08:06:29.860Z - Pre-Implementation

### Issue 1: Inngest Dev Server Not Running

**Severity:** CRITICAL (BLOCKING)

**Description:**
The Inngest dev server is not running, which means the agent cannot process any messages at all. The `message/sent` event is triggered but never handled.

**Impact:**
- Agent appears completely broken
- No responses to user messages
- Silent failure (no error shown to user)

**Solution:**
- Document how to start Inngest dev server
- Add to README.md setup instructions
- Consider adding health check endpoint

**Command:**
```bash
npx inngest-cli@latest dev
```

---

### Issue 2: No Streaming Feedback

**Severity:** HIGH

**Description:**
All AI responses wait for complete generation before displaying to user. This creates a poor UX where users wait 10-30+ seconds with no feedback.

**Impact:**
- Perceived as slow/broken
- Users don't know if system is working
- High abandonment rate

**Solution:**
- Implement streaming with `streamText` from AI SDK
- Update Convex schema to support partial content
- Add streaming UI indicators

---

### Issue 3: Sequential Tool Execution

**Severity:** MEDIUM

**Description:**
Tools execute one-by-one even when independent. For example, reading 3 files takes 3x longer than necessary.

**Impact:**
- Slower responses
- Wasted time on I/O operations
- Poor scalability

**Solution:**
- Implement parallel execution with dependency detection
- Use `Promise.all()` for independent tools
- Maintain sequential execution for dependent operations

---

### Issue 4: Limited Tool Set

**Severity:** MEDIUM

**Description:**
Only 5 basic file operations available. No code intelligence, search, or terminal execution.

**Impact:**
- Agent can't answer "find all references" questions
- Can't run tests or builds
- Can't search codebase effectively

**Solution:**
- Add LSP tools (symbols, references, diagnostics)
- Add search tools (grep, AST-grep)
- Add terminal execution (with safety constraints)

---

### Issue 5: No Context Management

**Severity:** LOW

**Description:**
Agent doesn't automatically detect relevant files. Users must manually specify files or agent reads everything.

**Impact:**
- Token waste
- Slower responses
- Less relevant answers

**Solution:**
- Implement relevance scoring algorithm
- Auto-include related files based on imports/symbols
- Smart truncation for large files

---

### Issue 6: No Caching

**Severity:** LOW

**Description:**
Repeated queries (e.g., "read package.json") re-execute fully every time.

**Impact:**
- Wasted API calls
- Slower responses
- Higher costs

**Solution:**
- Implement LRU cache with file hash invalidation
- Cache file contents, diagnostics, project structure
- 5-minute TTL for most operations
