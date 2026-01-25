import { tool, zodSchema } from "ai";
import { z } from "zod";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

let globalConvex: ConvexHttpClient | null = null;

export function setGlobalConvex(client: ConvexHttpClient) {
  globalConvex = client;
}

function getConvex(client?: ConvexHttpClient): ConvexHttpClient {
  return client ?? globalConvex!;
}

interface ProjectFile {
  path: string;
  type: "file" | "folder";
  content?: string;
  updatedAt?: number;
}

interface RelevantFile {
  path: string;
  score: number;
  reasons: string[];
}

const WEIGHTS = {
  DIRECT_IMPORT: 10,
  SHARED_SYMBOL: 7,
  RECENT_EDIT: 5,
  FILE_PROXIMITY: 3,
  SIMILAR_TYPE: 2,
} as const;

function extractImports(content: string): string[] {
  const imports: string[] = [];
  
  // Regex: import ... from 'path' | import ... from "path"
  const es6ImportRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Regex: require('path') | require("path")
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Regex: import('path') | import("path")
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  
  // Regex: export const|let|var|function|class|interface|type|enum name
  const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Regex: export { name1, name2 }
  const exportListRegex = /export\s*\{([^}]+)\}/g;
  while ((match = exportListRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
    exports.push(...names.filter(n => n && n !== ''));
  }
  
  // Regex: export default function|class name
  const defaultExportRegex = /export\s+default\s+(?:function|class)\s+(\w+)/g;
  while ((match = defaultExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  return exports;
}

function extractSymbols(content: string): Set<string> {
  const symbols = new Set<string>();
  
  const keywords = new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof',
    'instanceof', 'void', 'this', 'super', 'class', 'extends', 'implements',
    'interface', 'type', 'enum', 'const', 'let', 'var', 'function', 'async',
    'await', 'import', 'export', 'from', 'as', 'default', 'true', 'false',
    'null', 'undefined', 'in', 'of', 'with', 'debugger', 'yield', 'static',
    'public', 'private', 'protected', 'readonly', 'abstract', 'declare',
  ]);
  
  // Regex: PascalCase and camelCase identifiers
  const identifierRegex = /\b([A-Z][a-zA-Z0-9]*|[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)\b/g;
  let match;
  while ((match = identifierRegex.exec(content)) !== null) {
    const symbol = match[1];
    if (!keywords.has(symbol) && symbol.length > 2) {
      symbols.add(symbol);
    }
  }
  
  return symbols;
}

function resolveImportPath(importPath: string, currentFilePath: string, allPaths: string[]): string | null {
  if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@/')) {
    return null;
  }
  
  let resolvedPath = importPath;
  if (importPath.startsWith('@/')) {
    resolvedPath = importPath.replace('@/', 'src/');
  } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const currentDir = currentFilePath.split('/').slice(0, -1).join('/');
    const parts = [...currentDir.split('/'), ...importPath.split('/')];
    const resolved: string[] = [];
    
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    resolvedPath = resolved.join('/');
  }
  
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  
  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    if (allPaths.includes(fullPath)) {
      return fullPath;
    }
    if (allPaths.includes(fullPath.replace(/^\//, ''))) {
      return fullPath.replace(/^\//, '');
    }
  }
  
  return null;
}

function calculateProximity(path1: string, path2: string): number {
  const parts1 = path1.split('/');
  const parts2 = path2.split('/');
  
  let commonPrefixLength = 0;
  const minLength = Math.min(parts1.length, parts2.length);
  const filenameExcludedLength = minLength - 1;
  
  for (let i = 0; i < filenameExcludedLength; i++) {
    if (parts1[i] === parts2[i]) {
      commonPrefixLength++;
    } else {
      break;
    }
  }
  
  const totalDepth = Math.max(parts1.length, parts2.length) - 1;
  if (totalDepth === 0) return 1;
  
  return commonPrefixLength / totalDepth;
}

function getFileTypeCategory(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  
  const categories: Record<string, string[]> = {
    'typescript': ['ts', 'tsx'],
    'javascript': ['js', 'jsx', 'mjs', 'cjs'],
    'style': ['css', 'scss', 'sass', 'less'],
    'markup': ['html', 'htm', 'xml'],
    'config': ['json', 'yaml', 'yml', 'toml'],
    'markdown': ['md', 'mdx'],
  };
  
  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  
  return ext;
}

function scoreFile(
  file: ProjectFile,
  query: string,
  currentFile: ProjectFile | null,
  allPaths: string[]
): RelevantFile {
  let score = 0;
  const reasons: string[] = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
  
  if (file.type === 'folder' || !file.content) {
    return { path: file.path, score: 0, reasons: [] };
  }
  
  if (currentFile && currentFile.content) {
    const currentImports = extractImports(currentFile.content);
    
    for (const importPath of currentImports) {
      const resolved = resolveImportPath(importPath, currentFile.path, allPaths);
      if (resolved === file.path) {
        score += WEIGHTS.DIRECT_IMPORT;
        reasons.push('Imported by current file');
        break;
      }
    }
    
    const fileImports = extractImports(file.content);
    for (const importPath of fileImports) {
      const resolved = resolveImportPath(importPath, file.path, allPaths);
      if (resolved === currentFile.path) {
        score += WEIGHTS.DIRECT_IMPORT;
        reasons.push('Imports current file');
        break;
      }
    }
    
    const fileExports = extractExports(file.content);
    const currentSymbols = extractSymbols(currentFile.content);
    const sharedExports = fileExports.filter(exp => currentSymbols.has(exp));
    if (sharedExports.length > 0) {
      score += WEIGHTS.DIRECT_IMPORT * 0.5;
      reasons.push(`Exports used symbols: ${sharedExports.slice(0, 3).join(', ')}`);
    }
  }
  
  const fileSymbols = extractSymbols(file.content);
  const matchingSymbols = queryTerms.filter(term => {
    for (const symbol of fileSymbols) {
      if (symbol.toLowerCase().includes(term)) {
        return true;
      }
    }
    return false;
  });
  
  if (matchingSymbols.length > 0 && queryTerms.length > 0) {
    score += WEIGHTS.SHARED_SYMBOL * (matchingSymbols.length / queryTerms.length);
    reasons.push(`Contains query terms: ${matchingSymbols.slice(0, 3).join(', ')}`);
  }
  
  if (file.path.toLowerCase().includes(queryLower.replace(/\s+/g, ''))) {
    score += WEIGHTS.SHARED_SYMBOL;
    reasons.push('Path matches query');
  }
  
  if (file.updatedAt) {
    const now = Date.now();
    const hoursSinceEdit = (now - file.updatedAt) / (1000 * 60 * 60);
    const ONE_WEEK_HOURS = 168;
    
    if (hoursSinceEdit < 1) {
      score += WEIGHTS.RECENT_EDIT;
      reasons.push('Edited within last hour');
    } else if (hoursSinceEdit < 24) {
      score += WEIGHTS.RECENT_EDIT * 0.5;
      reasons.push('Edited within last day');
    } else if (hoursSinceEdit < ONE_WEEK_HOURS) {
      score += WEIGHTS.RECENT_EDIT * 0.2;
      reasons.push('Edited within last week');
    }
  }
  
  if (currentFile) {
    const proximity = calculateProximity(currentFile.path, file.path);
    if (proximity > 0.5) {
      score += WEIGHTS.FILE_PROXIMITY * proximity;
      reasons.push('Near current file');
    }
  }
  
  if (currentFile) {
    const currentCategory = getFileTypeCategory(currentFile.path);
    const fileCategory = getFileTypeCategory(file.path);
    
    if (currentCategory === fileCategory) {
      score += WEIGHTS.SIMILAR_TYPE;
      reasons.push('Same file type');
    }
  }
  
  if (file.content.toLowerCase().includes(queryLower)) {
    score += 3;
    reasons.push('Contains query text');
  }
  
  return { path: file.path, score, reasons };
}

export const createContextTools = (
  projectId: Id<"projects">,
  internalKey: string,
  convex?: ConvexHttpClient
) => ({
  getRelevantFiles: tool({
    description:
      "Find files most relevant to a query or current context. Uses import analysis, symbol matching, edit history, and file proximity to score relevance. Returns top N most relevant files with scores and reasons.",
    inputSchema: zodSchema(
      z.object({
        query: z.string().describe("Search query or context description"),
        currentFile: z
          .string()
          .optional()
          .describe("Current file path for context (improves relevance)"),
        maxFiles: z
          .number()
          .optional()
          .describe("Maximum files to return (default: 5)"),
      })
    ),
    execute: async ({
      query,
      currentFile,
      maxFiles = 5,
    }: {
      query: string;
      currentFile?: string;
      maxFiles?: number;
    }) => {
      const client = getConvex(convex);
      
      try {
        const files = await client.query(api.system.getAllProjectFiles, {
          internalKey,
          projectId,
        });
        
        if (!files || files.length === 0) {
          return "No files found in project.";
        }
        
        const actualFiles = files.filter(
          (f): f is typeof f & { type: "file" } => f.type === "file"
        );
        
        if (actualFiles.length === 0) {
          return "No files found in project.";
        }
        
        const allPaths = actualFiles.map((f) => f.path);
        
        let currentFileObj: ProjectFile | null = null;
        if (currentFile) {
          const found = actualFiles.find(
            (f) =>
              f.path === currentFile ||
              f.path === currentFile.replace(/^\//, "") ||
              `/${f.path}` === currentFile
          );
          if (found) {
            currentFileObj = {
              path: found.path,
              type: found.type,
              content: found.content ?? undefined,
              updatedAt: undefined,
            };
          }
        }
        
        const scoredFiles: RelevantFile[] = actualFiles
          .map((file) => {
            const projectFile: ProjectFile = {
              path: file.path,
              type: file.type,
              content: file.content ?? undefined,
              updatedAt: undefined,
            };
            return scoreFile(projectFile, query, currentFileObj, allPaths);
          })
          .filter((f) => f.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, maxFiles);
        
        if (scoredFiles.length === 0) {
          return `No relevant files found for query: "${query}"`;
        }
        
        const formatted = scoredFiles
          .map((f, i) => {
            const reasonsStr = f.reasons.length > 0 ? ` (${f.reasons.join(", ")})` : "";
            return `${i + 1}. ${f.path} [score: ${f.score.toFixed(1)}]${reasonsStr}`;
          })
          .join("\n");
        
        return `Found ${scoredFiles.length} relevant file(s):\n${formatted}`;
      } catch (error) {
        return `Error finding relevant files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),
});

export type ContextTools = ReturnType<typeof createContextTools>;
