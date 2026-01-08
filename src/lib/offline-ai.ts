// Offline AI strategy for PWA

export interface OfflineAICache {
  suggestions: Map<string, CodeSuggestion[]>;
  context: Map<string, CodeContext>;
  timestamp: number;
}

export interface CodeSuggestion {
  text: string;
  type: 'completion' | 'suggestion' | 'quick-edit';
  confidence: number;
  context: string;
}

export interface CodeContext {
  fileName: string;
  language: string;
  content: string;
  dependencies: string[];
  lastModified: number;
}

export class OfflineAIManager {
  private static instance: OfflineAIManager;
  private static readonly STORAGE_KEY = 'polaris-offline-ai';
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private cache: OfflineAICache;
  private isOnline: boolean;

  private constructor() {
    this.cache = this.loadCache();
    this.isOnline = navigator.onLine;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  static getInstance(): OfflineAIManager {
    if (!OfflineAIManager.instance) {
      OfflineAIManager.instance = new OfflineAIManager();
    }
    return OfflineAIManager.instance;
  }

  // Store AI suggestions for offline use
  async storeSuggestions(
    contextKey: string, 
    suggestions: CodeSuggestion[],
    context: CodeContext
  ) {
    this.cache.suggestions.set(contextKey, suggestions);
    this.cache.context.set(contextKey, context);
    this.cache.timestamp = Date.now();
    
    this.cleanupCache();
    this.saveCache();
  }

  // Get offline suggestions
  getSuggestions(contextKey: string): CodeSuggestion[] | null {
    const now = Date.now();
    
    if (now - this.cache.timestamp > OfflineAIManager.CACHE_TTL) {
      this.clearCache();
      return null;
    }

    return this.cache.suggestions.get(contextKey) || null;
  }

  // Generate offline suggestions using local context
  async generateOfflineSuggestions(
    code: string, 
    position: number, 
    language: string
  ): Promise<CodeSuggestion[]> {
    const suggestions: CodeSuggestion[] = [];
    const line = code.substring(0, position).split('\n').pop() || '';
    
    // Pattern-based suggestions
    if (language === 'javascript' || language === 'typescript') {
      suggestions.push(...this.generateJSOfflineSuggestions(code, position, line));
    } else if (language === 'python') {
      suggestions.push(...this.generatePythonOfflineSuggestions(code, position, line));
    } else if (language === 'html') {
      suggestions.push(...this.generateHTMLOfflineSuggestions(line));
    } else if (language === 'css') {
      suggestions.push(...this.generateCSSOfflineSuggestions(line));
    }

    return suggestions.slice(0, 5);
  }

  private generateJSOfflineSuggestions(code: string, position: number, line: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Function completion
    if (line.includes('function ')) {
      suggestions.push({
        text: '() => {',
        type: 'completion',
        confidence: 0.8,
        context: 'function-body'
      });
    }

    // Variable patterns
    if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
      suggestions.push({
        text: ' = ',
        type: 'completion',
        confidence: 0.9,
        context: 'variable-assignment'
      });
    }

    // Async/await
    if (line.includes('async')) {
      suggestions.push({
        text: 'async function() {\n  \n}',
        type: 'completion',
        confidence: 0.7,
        context: 'async-function'
      });
    }

    // Promise patterns
    if (line.includes('.then')) {
      suggestions.push({
        text: '.catch(error => \n  console.error(error)',
        type: 'completion',
        confidence: 0.85,
        context: 'promise-chain'
      });
    }

    // React hooks
    if (line.includes('use')) {
      suggestions.push({
        text: 'useState(',
        type: 'suggestion',
        confidence: 0.75,
        context: 'react-hook'
      });
    }

    return suggestions;
  }

  private generatePythonOfflineSuggestions(code: string, position: number, line: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Function definition
    if (line.includes('def ')) {
      suggestions.push({
        text: '(self):\n    ',
        type: 'completion',
        confidence: 0.8,
        context: 'method-definition'
      });
    }

    // Class definition
    if (line.includes('class ')) {
      suggestions.push({
        text: ':\n    def __init__(self):\n        ',
        type: 'completion',
        confidence: 0.85,
        context: 'class-definition'
      });
    }

    // Import statement
    if (line.includes('import ')) {
      suggestions.push({
        text: 'from ',
        type: 'completion',
        confidence: 0.7,
        context: 'import-statement'
      });
    }

    // Async patterns
    if (line.includes('async def')) {
      suggestions.push({
        text: 'async def \n    await ',
        type: 'completion',
        confidence: 0.75,
        context: 'async-function'
      });
    }

    return suggestions;
  }

  private generateHTMLOfflineSuggestions(line: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Tag completion
    if (!line.includes('</') && line.includes('<')) {
      const tagMatch = line.match(/<(\w+)/);
      if (tagMatch) {
        suggestions.push({
          text: `</${tagMatch[1]}>`,
          type: 'completion',
          confidence: 0.9,
          context: 'tag-closing'
        });
      }
    }

    return suggestions;
  }

  private generateCSSOfflineSuggestions(line: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Property completion
    const properties = [
      { partial: 'disp', complete: 'display: block;' },
      { partial: 'pos', complete: 'position: relative;' },
      { partial: 'flex', complete: 'display: flex;\n  justify-content: center;\n  align-items: center;' },
      { partial: 'grid', complete: 'display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 1rem;' },
    ];

    properties.forEach(({ partial, complete }) => {
      if (line.toLowerCase().startsWith(partial)) {
        suggestions.push({
          text: complete,
          type: 'completion',
          confidence: 0.8,
          context: 'css-property'
        });
      }
    });

    return suggestions;
  }

  // Sync offline data when online
  private async syncOfflineData() {
    if (!this.isOnline) return;

    const offlineQueue = await this.getOfflineQueue();
    
    for (const action of offlineQueue) {
      try {
        await this.processOfflineItem(action);
        await this.removeOfflineItem(action.id);
      } catch (error) {
        console.error('Failed to sync offline item:', error);
      }
    }
  }

  // Cache management
  private cleanupCache() {
    const now = Date.now();
    
    // Remove old entries
    for (const [key, context] of this.cache.context.entries()) {
      if (now - context.lastModified > OfflineAIManager.CACHE_TTL) {
        this.cache.suggestions.delete(key);
        this.cache.context.delete(key);
      }
    }

    // Check size limit
    const cacheSize = this.getCacheSize();
    if (cacheSize > OfflineAIManager.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }
  }

  private getCacheSize(): number {
    try {
      return JSON.stringify(this.cache).length;
    } catch {
      return 0;
    }
  }

  private evictLeastUsed() {
    const sortedKeys = Array.from(this.cache.context.keys())
      .sort((a, b) => {
        const timeA = this.cache.context.get(a)?.lastModified || 0;
        const timeB = this.cache.context.get(b)?.lastModified || 0;
        return timeA - timeB;
      });

    const evictCount = Math.floor(sortedKeys.length * 0.2);
    for (let i = 0; i < evictCount && i < sortedKeys.length; i++) {
      this.cache.suggestions.delete(sortedKeys[i]);
      this.cache.context.delete(sortedKeys[i]);
    }
  }

  private saveCache() {
    try {
      const cacheData = {
        suggestions: Array.from(this.cache.suggestions.entries()),
        context: Array.from(this.cache.context.entries()),
        timestamp: this.cache.timestamp
      };
      localStorage.setItem(OfflineAIManager.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save offline AI cache:', error);
    }
  }

  private loadCache(): OfflineAICache {
    try {
      const data = localStorage.getItem(OfflineAIManager.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          suggestions: new Map(parsed.suggestions || []),
          context: new Map(parsed.context || []),
          timestamp: parsed.timestamp || 0
        };
      }
    } catch (error) {
      console.warn('Failed to load offline AI cache:', error);
    }
    
    return {
      suggestions: new Map(),
      context: new Map(),
      timestamp: 0
    };
  }

  clearCache() {
    this.cache = {
      suggestions: new Map(),
      context: new Map(),
      timestamp: 0
    };
    localStorage.removeItem(OfflineAIManager.STORAGE_KEY);
  }

  // Offline queue management
  private async getOfflineQueue(): Promise<any[]> {
    return JSON.parse(localStorage.getItem('polaris-offline-queue') || '[]');
  }

  private async removeOfflineItem(id: string) {
    const queue = await this.getOfflineQueue();
    const filtered = queue.filter((item: any) => item.id !== id);
    localStorage.setItem('polaris-offline-queue', JSON.stringify(filtered));
  }

  private async processOfflineItem(item: any) {
    switch (item.type) {
      case 'ai-request':
        return this.processOfflineAIRequest(item);
      case 'file-operation':
        return this.processOfflineFileOperation(item);
      default:
        throw new Error(`Unknown offline item type: ${item.type}`);
    }
  }

  private async processOfflineAIRequest(item: any) {
    const suggestions = await this.generateOfflineSuggestions(
      item.code, 
      item.position, 
      item.language
    );
    
    this.storeSuggestions(item.contextKey, suggestions, item.context);
  }

  private async processOfflineFileOperation(item: any) {
    // Handle offline file operations
    console.log('Processing offline file operation:', item);
  }

  // Queue an action for offline processing
  async queueOfflineAction(action: any) {
    const queue = await this.getOfflineQueue();
    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...action
    });
    localStorage.setItem('polaris-offline-queue', JSON.stringify(queue));
  }

  // Get queue length
  async getQueueLength(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.length;
  }

  // Check if online
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }
}

// React hook for offline AI
export const useOfflineAI = () => {
  const manager = OfflineAIManager.getInstance();

  return {
    storeSuggestions: (key: string, suggestions: CodeSuggestion[], context: CodeContext) =>
      manager.storeSuggestions(key, suggestions, context),
    getSuggestions: (key: string) => manager.getSuggestions(key),
    generateOfflineSuggestions: (code: string, position: number, language: string) =>
      manager.generateOfflineSuggestions(code, position, language),
    queueOfflineAction: (action: any) => manager.queueOfflineAction(action),
    getQueueLength: () => manager.getQueueLength(),
    isOnline: () => manager.isCurrentlyOnline(),
    clearCache: () => manager.clearCache(),
  };
};
