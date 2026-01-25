import { tool, zodSchema } from "ai";
import { z } from "zod";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Global convex client for API route context
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
}

interface SearchMatch {
  path: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

interface CodePattern {
  type: "import" | "function" | "class" | "variable" | "export" | "call";
  name: string;
  path: string;
  line: number;
  context: string;
}

const MAX_RESULTS = 50;

/**
 * Get line number and column from a position in content
 */
function getLineAndColumn(
  content: string,
  position: number
): { line: number; column: number } {
  const lines = content.substring(0, position).split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Get context around a match (the full line)
 */
function getLineContext(content: string, lineNumber: number, maxLength = 120): string {
  const lines = content.split("\n");
  const line = lines[lineNumber - 1] || "";
  return line.trim().substring(0, maxLength);
}

/**
 * Check if a file path matches a glob-like pattern
 * Supports: *, **, ?, and character classes [abc]
 */
function matchGlobPattern(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexPattern = pattern
    // Escape special regex characters except glob wildcards
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // Convert ** to match any path segment
    .replace(/\*\*/g, "{{DOUBLE_STAR}}")
    // Convert * to match anything except /
    .replace(/\*/g, "[^/]*")
    // Convert ? to match single character
    .replace(/\?/g, ".")
    // Restore ** as match-all
    .replace(/\{\{DOUBLE_STAR\}\}/g, ".*");

  // Anchor the pattern
  regexPattern = `^${regexPattern}$`;

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  } catch {
    return false;
  }
}

/**
 * Simple pattern matching for code structures
 * Matches imports, function declarations, class declarations, exports, and function calls
 */
function findCodePatterns(
  content: string,
  patternType: "import" | "function" | "class" | "variable" | "export" | "call" | "all",
  searchTerm?: string
): Array<{ type: CodePattern["type"]; name: string; line: number; context: string }> {
  const results: Array<{ type: CodePattern["type"]; name: string; line: number; context: string }> = [];
  const lines = content.split("\n");

  // Pattern definitions
  const patterns: Record<CodePattern["type"], RegExp> = {
    import: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/,
    function: /(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/,
    class: /class\s+(\w+)/,
    variable: /(?:const|let|var)\s+(\w+)\s*=/,
    export: /export\s+(?:default\s+)?(?:(?:async\s+)?function\s+(\w+)|class\s+(\w+)|const\s+(\w+)|let\s+(\w+)|var\s+(\w+)|\{([^}]+)\})/,
    call: /(\w+)\s*\(/g,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const context = line.trim().substring(0, 120);

    const typesToCheck: CodePattern["type"][] =
      patternType === "all"
        ? ["import", "function", "class", "variable", "export", "call"]
        : [patternType];

    for (const type of typesToCheck) {
      const pattern = patterns[type];
      
      if (type === "call") {
        // Handle function calls specially (global regex)
        const callPattern = /(\w+)\s*\(/g;
        let callMatch;
        while ((callMatch = callPattern.exec(line)) !== null) {
          const name = callMatch[1];
          // Skip common keywords that look like function calls
          if (["if", "for", "while", "switch", "catch", "function", "return"].includes(name)) {
            continue;
          }
          if (!searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push({ type: "call", name, line: lineNumber, context });
          }
        }
      } else {
        const match = line.match(pattern);
        if (match) {
          // Extract the name from the first non-undefined capture group
          const name = match.slice(1).find((g) => g !== undefined) || "";
          
          // For exports with multiple names, split them
          if (type === "export" && name.includes(",")) {
            const names = name.split(",").map((n) => n.trim());
            for (const n of names) {
              if (!searchTerm || n.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({ type, name: n, line: lineNumber, context });
              }
            }
          } else if (!searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push({ type, name, line: lineNumber, context });
          }
        }
      }
    }
  }

  return results;
}

export const createSearchTools = (
  projectId: Id<"projects">,
  internalKey: string,
  convex?: ConvexHttpClient
) => ({
  searchFiles: tool({
    description:
      "Search file contents using regex patterns. Returns matching lines with file path, line number, and context. Useful for finding specific code patterns, strings, or text across the codebase.",
    inputSchema: zodSchema(
      z.object({
        pattern: z
          .string()
          .describe("Regex pattern to search for (e.g., 'TODO', 'function\\s+\\w+', 'import.*react')"),
        filePattern: z
          .string()
          .optional()
          .describe("Optional glob pattern to filter files (e.g., '*.ts', 'src/**/*.tsx')"),
        caseSensitive: z
          .boolean()
          .optional()
          .describe("Whether the search is case-sensitive (default: false)"),
      })
    ),
    execute: async ({
      pattern,
      filePattern,
      caseSensitive = false,
    }: {
      pattern: string;
      filePattern?: string;
      caseSensitive?: boolean;
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

        // Filter to only files (not folders) with content
        let searchableFiles = files.filter(
          (f: ProjectFile) => f.type === "file" && f.content !== undefined
        );

        // Apply file pattern filter if provided
        if (filePattern) {
          searchableFiles = searchableFiles.filter((f: ProjectFile) =>
            matchGlobPattern(f.path, filePattern)
          );
        }

        if (searchableFiles.length === 0) {
          return filePattern
            ? `No files matching pattern "${filePattern}" found.`
            : "No searchable files found in project.";
        }

        const matches: SearchMatch[] = [];
        let regex: RegExp;

        try {
          regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
        } catch (error) {
          return `Invalid regex pattern: ${error instanceof Error ? error.message : "Unknown error"}`;
        }

        for (const file of searchableFiles) {
          if (!file.content) continue;

          const lines = file.content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            regex.lastIndex = 0; // Reset regex state

            let match;
            while ((match = regex.exec(line)) !== null) {
              matches.push({
                path: file.path,
                line: i + 1,
                column: match.index + 1,
                match: match[0],
                context: line.trim().substring(0, 120),
              });

              if (matches.length >= MAX_RESULTS) {
                break;
              }

              // Prevent infinite loop for zero-length matches
              if (match[0].length === 0) {
                regex.lastIndex++;
              }
            }

            if (matches.length >= MAX_RESULTS) {
              break;
            }
          }

          if (matches.length >= MAX_RESULTS) {
            break;
          }
        }

        if (matches.length === 0) {
          return `No matches found for pattern "${pattern}"${filePattern ? ` in files matching "${filePattern}"` : ""}.`;
        }

        const formatted = matches
          .map((m) => `${m.path}:${m.line}:${m.column} - ${m.context}`)
          .join("\n");

        const truncated = matches.length >= MAX_RESULTS ? ` (showing first ${MAX_RESULTS})` : "";

        return `Found ${matches.length} match(es)${truncated}:\n${formatted}`;
      } catch (error) {
        return `Error searching files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  searchCodebase: tool({
    description:
      "AST-aware code search for finding specific code patterns like imports, function declarations, class definitions, variable declarations, exports, and function calls. More precise than regex for code structure.",
    inputSchema: zodSchema(
      z.object({
        patternType: z
          .enum(["import", "function", "class", "variable", "export", "call", "all"])
          .describe("Type of code pattern to search for"),
        searchTerm: z
          .string()
          .optional()
          .describe("Optional name or partial name to filter results (e.g., 'useState', 'Button')"),
        filePattern: z
          .string()
          .optional()
          .describe("Optional glob pattern to filter files (e.g., '*.ts', 'src/**/*.tsx')"),
      })
    ),
    execute: async ({
      patternType,
      searchTerm,
      filePattern,
    }: {
      patternType: "import" | "function" | "class" | "variable" | "export" | "call" | "all";
      searchTerm?: string;
      filePattern?: string;
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

        // Filter to code files
        let codeFiles = files.filter(
          (f: ProjectFile) =>
            f.type === "file" &&
            f.content !== undefined &&
            (f.path.endsWith(".ts") ||
              f.path.endsWith(".tsx") ||
              f.path.endsWith(".js") ||
              f.path.endsWith(".jsx") ||
              f.path.endsWith(".mjs") ||
              f.path.endsWith(".cjs"))
        );

        // Apply file pattern filter if provided
        if (filePattern) {
          codeFiles = codeFiles.filter((f: ProjectFile) =>
            matchGlobPattern(f.path, filePattern)
          );
        }

        if (codeFiles.length === 0) {
          return filePattern
            ? `No code files matching pattern "${filePattern}" found.`
            : "No code files found in project.";
        }

        const results: CodePattern[] = [];

        for (const file of codeFiles) {
          if (!file.content) continue;

          const patterns = findCodePatterns(file.content, patternType, searchTerm);

          for (const p of patterns) {
            results.push({
              ...p,
              path: file.path,
            });

            if (results.length >= MAX_RESULTS) {
              break;
            }
          }

          if (results.length >= MAX_RESULTS) {
            break;
          }
        }

        if (results.length === 0) {
          const termInfo = searchTerm ? ` matching "${searchTerm}"` : "";
          return `No ${patternType === "all" ? "code patterns" : patternType + "s"} found${termInfo}${filePattern ? ` in files matching "${filePattern}"` : ""}.`;
        }

        const formatted = results
          .map((r) => `[${r.type}] ${r.name} - ${r.path}:${r.line}\n    ${r.context}`)
          .join("\n");

        const truncated = results.length >= MAX_RESULTS ? ` (showing first ${MAX_RESULTS})` : "";

        return `Found ${results.length} ${patternType === "all" ? "pattern" : patternType}(s)${truncated}:\n${formatted}`;
      } catch (error) {
        return `Error searching codebase: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  findFilesByPattern: tool({
    description:
      "Find files by name using glob patterns. Supports wildcards (*, **), single character match (?), and returns matching file paths. Useful for finding files by extension or naming convention.",
    inputSchema: zodSchema(
      z.object({
        pattern: z
          .string()
          .describe("Glob pattern to match file paths (e.g., '*.ts', 'src/**/*.tsx', 'package.json', '**/test*.js')"),
      })
    ),
    execute: async ({ pattern }: { pattern: string }) => {
      const client = getConvex(convex);
      try {
        const files = await client.query(api.system.getAllProjectFiles, {
          internalKey,
          projectId,
        });

        if (!files || files.length === 0) {
          return "No files found in project.";
        }

        // Filter to only files (not folders)
        const allFiles = files.filter((f: ProjectFile) => f.type === "file");

        // Match against pattern
        const matchingFiles = allFiles.filter((f: ProjectFile) =>
          matchGlobPattern(f.path, pattern)
        );

        if (matchingFiles.length === 0) {
          return `No files matching pattern "${pattern}" found.`;
        }

        // Limit results
        const limitedFiles = matchingFiles.slice(0, MAX_RESULTS);
        const formatted = limitedFiles.map((f: ProjectFile) => f.path).join("\n");

        const truncated =
          matchingFiles.length > MAX_RESULTS
            ? `\n\n(Showing ${MAX_RESULTS} of ${matchingFiles.length} matches)`
            : "";

        return `Found ${matchingFiles.length} file(s) matching "${pattern}":\n${formatted}${truncated}`;
      } catch (error) {
        return `Error finding files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),
});

export type SearchTools = ReturnType<typeof createSearchTools>;
