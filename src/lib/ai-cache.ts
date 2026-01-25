/**
 * LRU Cache for AI tool results with TTL support
 * 
 * Cache key formats:
 * - file:path:hash - File contents (5 min TTL)
 * - structure:projectId:timestamp - Project structure (5 min TTL)
 * - diagnostics:path:hash - LSP diagnostics (1 min TTL)
 */

type CacheKeyType = 'file' | 'structure' | 'diagnostics';

interface CacheEntry<T> {
  value: T;
  hash?: string;
  expiresAt: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
}

const FILE_TTL_MS = 5 * 60 * 1000;
const DIAGNOSTICS_TTL_MS = 1 * 60 * 1000;

const TTL_CONFIG: Record<CacheKeyType, number> = {
  file: FILE_TTL_MS,
  structure: FILE_TTL_MS,
  diagnostics: DIAGNOSTICS_TTL_MS,
};

export class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTTL = options.defaultTTL ?? FILE_TTL_MS;
  }

  static buildKey(type: CacheKeyType, ...parts: string[]): string {
    return `${type}:${parts.join(':')}`;
  }

  static parseKey(key: string): { type: CacheKeyType; parts: string[] } | null {
    const [type, ...parts] = key.split(':');
    if (!type || !['file', 'structure', 'diagnostics'].includes(type)) {
      return null;
    }
    return { type: type as CacheKeyType, parts };
  }

  private getTTL(key: string): number {
    const parsed = LRUCache.parseKey(key);
    if (parsed) {
      return TTL_CONFIG[parsed.type];
    }
    return this.defaultTTL;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, hash?: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const ttl = this.getTTL(key);
    this.cache.set(key, {
      value,
      hash,
      expiresAt: Date.now() + ttl,
    });
  }

  isValid(key: string, currentHash: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    if (entry.hash && entry.hash !== currentHash) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidateByPath(path: string): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(`:${path}:`)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  invalidateByHash(path: string, newHash: string): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(`:${path}:`) && entry.hash && entry.hash !== newHash) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  invalidateByType(type: CacheKeyType): number {
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${type}:`)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  stats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

export function createCache<T = unknown>(options?: CacheOptions): LRUCache<T> {
  return new LRUCache<T>(options);
}

export const aiCache = createCache({
  maxSize: 500,
  defaultTTL: FILE_TTL_MS,
});

export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export const cacheKeys = {
  file: (path: string, hash: string) => LRUCache.buildKey('file', path, hash),
  structure: (projectId: string, timestamp: string) => LRUCache.buildKey('structure', projectId, timestamp),
  diagnostics: (path: string, hash: string) => LRUCache.buildKey('diagnostics', path, hash),
};
