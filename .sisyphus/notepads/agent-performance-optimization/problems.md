# Agent Performance Optimization - Unresolved Problems

## 2026-01-25T08:06:29.860Z - Planning Phase

### Problem 1: TypeScript Language Service Memory Usage

**Description:**
Running a full TypeScript Language Service in the backend for LSP features could consume significant memory, especially for large projects.

**Concerns:**
- Memory usage could exceed Vercel/hosting limits
- Slow startup time for language service initialization
- Potential memory leaks with long-running processes

**Mitigation Options:**
1. Lazy initialization (only start when LSP tools are used)
2. Memory limits and automatic restart
3. Lightweight alternative (just AST parsing, no type checking)
4. External LSP server (separate process)

**Status:** UNRESOLVED - Need to test memory usage in production

---

### Problem 2: Terminal Execution Security

**Description:**
Even with a whitelist, terminal execution poses security risks. Malicious prompts could potentially exploit command injection.

**Concerns:**
- Command injection via crafted arguments
- Resource exhaustion (infinite loops, memory bombs)
- Unintended side effects (git push, npm publish)

**Mitigation Options:**
1. Strict argument validation and escaping
2. Timeout limits (30s max)
3. Output size limits (1MB max)
4. Dry-run mode for destructive commands
5. User confirmation for certain commands

**Status:** UNRESOLVED - Need security review before production

---

### Problem 3: Streaming with Inngest Background Jobs

**Description:**
Inngest functions run in background workers, making true streaming difficult. We're using Convex subscriptions as a workaround, but this adds latency.

**Concerns:**
- Latency between AI generation and Convex update
- Potential race conditions with rapid updates
- Network overhead for frequent mutations

**Mitigation Options:**
1. Batch updates (every 100ms instead of every token)
2. Use Inngest streaming (if available)
3. Direct API route streaming (bypass Inngest for conversations)

**Status:** UNRESOLVED - Current approach may be "good enough"

---

### Problem 4: Context Window Management

**Description:**
Relevance scoring is heuristic-based and may not always select the right files. Could miss important context or include irrelevant files.

**Concerns:**
- False positives (irrelevant files included)
- False negatives (important files missed)
- Difficulty tuning scoring weights

**Mitigation Options:**
1. User override (manual file selection)
2. Machine learning-based relevance (future)
3. Feedback loop (learn from user corrections)

**Status:** UNRESOLVED - Will need iteration based on real usage

---

### Problem 5: Cache Invalidation Complexity

**Description:**
File hash-based cache invalidation works for direct file changes, but what about indirect changes (imports, dependencies)?

**Concerns:**
- Stale cache when imported file changes
- Complex dependency tracking needed
- Cache invalidation cascades

**Mitigation Options:**
1. Conservative TTL (short expiration)
2. Dependency graph tracking
3. Manual cache clear option
4. Cache versioning

**Status:** UNRESOLVED - Starting with simple TTL-based approach

---

### Problem 6: Parallel Tool Execution Edge Cases

**Description:**
Dependency detection may not catch all cases. For example, two tools writing to the same file should be sequential, but how do we detect this?

**Concerns:**
- Race conditions with concurrent writes
- Incorrect dependency detection
- Complex dependency graphs (A depends on B depends on C)

**Mitigation Options:**
1. Conservative approach (assume dependency if same file path)
2. Tool metadata (declare dependencies explicitly)
3. Conflict detection and retry

**Status:** UNRESOLVED - Will implement conservative approach first

## 2026-01-25 - Task 5.1 Blocker

**Problem:** Delegation system JSON parse error when trying to delegate parallel tool execution task

**Error:** `JSON Parse error: Unexpected EOF`

**Attempted Solutions:**
1. Tried with full 6-section prompt - failed
2. Tried with minimal prompt - failed

**Root Cause:** Unknown - possibly prompt encoding issue or delegation system bug

**Workaround:** Skip Task 5.1 for now, continue with Tasks 5.2 and 7.1

**Status:** BLOCKED - needs investigation
