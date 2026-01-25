import { tool, zodSchema } from "ai";
import { z } from "zod";
import ts from "typescript";

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
}

function createLanguageServiceHost(
  files: ProjectFile[]
): ts.LanguageServiceHost {
  const fileMap = new Map<string, string>();

  for (const file of files) {
    if (file.type === "file" && file.content !== undefined) {
      const normalizedPath = file.path.startsWith("/")
        ? file.path
        : `/${file.path}`;
      fileMap.set(normalizedPath, file.content);
    }
  }

  const fileNames = Array.from(fileMap.keys());

  return {
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => "1",
    getScriptSnapshot: (fileName: string) => {
      const content = fileMap.get(fileName);
      if (content === undefined) return undefined;
      return ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      allowJs: true,
      checkJs: false,
      noEmit: true,
      resolveJsonModule: true,
      isolatedModules: true,
      allowImportingTsExtensions: true,
    }),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName: string) => fileMap.has(fileName),
    readFile: (fileName: string) => fileMap.get(fileName),
    readDirectory: () => fileNames,
    directoryExists: () => true,
    getDirectories: () => [],
  };
}

function getSymbolKind(
  kind: ts.ScriptElementKind
): "function" | "class" | "variable" | "interface" | "type" | "other" {
  switch (kind) {
    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.memberFunctionElement:
    case ts.ScriptElementKind.constructorImplementationElement:
      return "function";
    case ts.ScriptElementKind.classElement:
      return "class";
    case ts.ScriptElementKind.variableElement:
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.parameterElement:
    case ts.ScriptElementKind.localVariableElement:
      return "variable";
    case ts.ScriptElementKind.interfaceElement:
      return "interface";
    case ts.ScriptElementKind.typeElement:
    case ts.ScriptElementKind.typeParameterElement:
      return "type";
    default:
      return "other";
  }
}

function getDiagnosticSeverity(
  category: ts.DiagnosticCategory
): "error" | "warning" | "info" | "hint" {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return "error";
    case ts.DiagnosticCategory.Warning:
      return "warning";
    case ts.DiagnosticCategory.Suggestion:
      return "hint";
    case ts.DiagnosticCategory.Message:
    default:
      return "info";
  }
}

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

function lineColumnToPosition(content: string, line: number, column: number): number {
  const lines = content.split("\n");
  let position = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    position += lines[i].length + 1;
  }
  return position + column - 1;
}

function filterTsJsFiles(files: ProjectFile[]): ProjectFile[] {
  return files.filter(
    (f) =>
      f.type === "file" &&
      (f.path.endsWith(".ts") ||
        f.path.endsWith(".tsx") ||
        f.path.endsWith(".js") ||
        f.path.endsWith(".jsx"))
  );
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function findTargetFile(
  files: ProjectFile[],
  path: string
): ProjectFile | undefined {
  const normalizedPath = normalizePath(path);
  return files.find(
    (f) =>
      f.path === path ||
      f.path === normalizedPath ||
      `/${f.path}` === normalizedPath
  );
}

function getLineContext(content: string, lineNumber: number, maxLength = 80): string {
  const lines = content.split("\n");
  return lines[lineNumber - 1]?.trim().substring(0, maxLength) || "";
}

export const createLSPTools = (
  projectId: Id<"projects">,
  internalKey: string,
  convex?: ConvexHttpClient
) => ({
  findSymbol: tool({
    description:
      "Search for symbols (functions, classes, variables, interfaces, types) in the codebase by name. Returns matching symbols with their location and kind.",
    inputSchema: zodSchema(
      z.object({
        query: z.string().describe("Symbol name or partial name to search for"),
        kind: z
          .enum(["function", "class", "variable", "interface", "type", "all"])
          .optional()
          .describe("Filter by symbol kind (default: all)"),
      })
    ),
    execute: async ({
      query,
      kind = "all",
    }: {
      query: string;
      kind?: "function" | "class" | "variable" | "interface" | "type" | "all";
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

        const tsFiles = filterTsJsFiles(files);

        if (tsFiles.length === 0) {
          return "No TypeScript/JavaScript files found in project.";
        }

        const host = createLanguageServiceHost(tsFiles);
        const languageService = ts.createLanguageService(
          host,
          ts.createDocumentRegistry()
        );

        const results: Array<{
          name: string;
          kind: string;
          path: string;
          line: number;
          column: number;
        }> = [];

        for (const file of tsFiles) {
          const normalizedPath = normalizePath(file.path);

          try {
            const navItems = languageService.getNavigationBarItems(normalizedPath);

            const processNavItems = (
              items: ts.NavigationBarItem[],
              parentPath = ""
            ) => {
              for (const item of items) {
                const symbolKind = getSymbolKind(item.kind);
                const nameMatches = item.text
                  .toLowerCase()
                  .includes(query.toLowerCase());
                const kindMatches =
                  kind === "all" || symbolKind === kind || symbolKind === "other";

                if (nameMatches && kindMatches && item.spans.length > 0) {
                  const span = item.spans[0];
                  const content = file.content || "";
                  const { line, column } = getLineAndColumn(content, span.start);

                  results.push({
                    name: parentPath ? `${parentPath}.${item.text}` : item.text,
                    kind: symbolKind,
                    path: file.path,
                    line,
                    column,
                  });
                }

                if (item.childItems && item.childItems.length > 0) {
                  processNavItems(
                    item.childItems,
                    parentPath ? `${parentPath}.${item.text}` : item.text
                  );
                }
              }
            };

            processNavItems(navItems);
          } catch {
            continue;
          }
        }

        if (results.length === 0) {
          return `No symbols found matching "${query}"${kind !== "all" ? ` of kind "${kind}"` : ""}.`;
        }

        const formatted = results
          .slice(0, 50)
          .map(
            (r) =>
              `[${r.kind}] ${r.name} - ${r.path}:${r.line}:${r.column}`
          )
          .join("\n");

        return `Found ${results.length} symbol(s):\n${formatted}`;
      } catch (error) {
        return `Error searching symbols: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  getReferences: tool({
    description:
      "Find all references to a symbol at a specific location in a file. Returns all places where the symbol is used.",
    inputSchema: zodSchema(
      z.object({
        path: z
          .string()
          .describe("File path relative to project root (e.g., 'src/index.ts')"),
        line: z.number().describe("Line number (1-based)"),
        column: z.number().describe("Column number (1-based)"),
      })
    ),
    execute: async ({
      path,
      line,
      column,
    }: {
      path: string;
      line: number;
      column: number;
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

        const tsFiles = filterTsJsFiles(files);
        const host = createLanguageServiceHost(tsFiles);
        const languageService = ts.createLanguageService(
          host,
          ts.createDocumentRegistry()
        );

        const normalizedPath = normalizePath(path);
        const targetFile = findTargetFile(tsFiles, path);

        if (!targetFile || !targetFile.content) {
          return `File not found: ${path}`;
        }

        const position = lineColumnToPosition(targetFile.content, line, column);
        const references = languageService.getReferencesAtPosition(
          normalizedPath,
          position
        );

        if (!references || references.length === 0) {
          return `No references found at ${path}:${line}:${column}`;
        }

        const results = references.map((ref) => {
          const refFile = tsFiles.find(
            (f) => `/${f.path}` === ref.fileName || f.path === ref.fileName
          );
          const refContent = refFile?.content || "";
          const { line: refLine, column: refColumn } = getLineAndColumn(
            refContent,
            ref.textSpan.start
          );
          const lineContent = getLineContext(refContent, refLine);
          const refType = ref.isWriteAccess ? "write" : "read";

          return {
            path: ref.fileName.startsWith("/")
              ? ref.fileName.substring(1)
              : ref.fileName,
            line: refLine,
            column: refColumn,
            refType,
            context: lineContent,
          };
        });

        const formatted = results
          .map(
            (r) =>
              `[${r.refType}] ${r.path}:${r.line}:${r.column} - ${r.context}`
          )
          .join("\n");

        return `Found ${results.length} reference(s):\n${formatted}`;
      } catch (error) {
        return `Error finding references: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  getDiagnostics: tool({
    description:
      "Get TypeScript errors, warnings, and suggestions for a specific file. Useful for checking code quality and finding issues.",
    inputSchema: zodSchema(
      z.object({
        path: z
          .string()
          .describe("File path relative to project root (e.g., 'src/index.ts')"),
        severity: z
          .enum(["error", "warning", "all"])
          .optional()
          .describe("Filter by severity (default: all)"),
      })
    ),
    execute: async ({
      path,
      severity = "all",
    }: {
      path: string;
      severity?: "error" | "warning" | "all";
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

        const tsFiles = filterTsJsFiles(files);
        const host = createLanguageServiceHost(tsFiles);
        const languageService = ts.createLanguageService(
          host,
          ts.createDocumentRegistry()
        );

        const normalizedPath = normalizePath(path);
        const targetFile = findTargetFile(tsFiles, path);

        if (!targetFile || !targetFile.content) {
          return `File not found: ${path}`;
        }

        const syntacticDiagnostics =
          languageService.getSyntacticDiagnostics(normalizedPath);
        const semanticDiagnostics =
          languageService.getSemanticDiagnostics(normalizedPath);
        const suggestionDiagnostics =
          languageService.getSuggestionDiagnostics(normalizedPath);

        const allDiagnostics = [
          ...syntacticDiagnostics,
          ...semanticDiagnostics,
          ...suggestionDiagnostics,
        ];

        const filteredDiagnostics = allDiagnostics.filter((d) => {
          if (severity === "all") return true;
          const diagSeverity = getDiagnosticSeverity(d.category);
          if (severity === "error") return diagSeverity === "error";
          if (severity === "warning")
            return diagSeverity === "warning" || diagSeverity === "error";
          return true;
        });

        if (filteredDiagnostics.length === 0) {
          return `No diagnostics found for ${path}${severity !== "all" ? ` with severity "${severity}"` : ""}.`;
        }

        const results = filteredDiagnostics.map((d) => {
          const { line, column } = d.start
            ? getLineAndColumn(targetFile.content!, d.start)
            : { line: 1, column: 1 };

          const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
          const diagSeverity = getDiagnosticSeverity(d.category);

          return {
            severity: diagSeverity,
            line,
            column,
            message,
            code: d.code,
          };
        });

        const formatted = results
          .map(
            (r) =>
              `[${r.severity}] ${path}:${r.line}:${r.column} - TS${r.code}: ${r.message}`
          )
          .join("\n");

        const errorCount = results.filter((r) => r.severity === "error").length;
        const warningCount = results.filter(
          (r) => r.severity === "warning"
        ).length;
        const otherCount = results.length - errorCount - warningCount;

        return `Found ${results.length} diagnostic(s) (${errorCount} errors, ${warningCount} warnings, ${otherCount} other):\n${formatted}`;
      } catch (error) {
        return `Error getting diagnostics: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  goToDefinition: tool({
    description:
      "Find the definition location of a symbol at a specific position in a file. Useful for navigating to where a function, class, or variable is defined.",
    inputSchema: zodSchema(
      z.object({
        path: z
          .string()
          .describe("File path relative to project root (e.g., 'src/index.ts')"),
        line: z.number().describe("Line number (1-based)"),
        column: z.number().describe("Column number (1-based)"),
      })
    ),
    execute: async ({
      path,
      line,
      column,
    }: {
      path: string;
      line: number;
      column: number;
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

        const tsFiles = filterTsJsFiles(files);
        const host = createLanguageServiceHost(tsFiles);
        const languageService = ts.createLanguageService(
          host,
          ts.createDocumentRegistry()
        );

        const normalizedPath = normalizePath(path);
        const targetFile = findTargetFile(tsFiles, path);

        if (!targetFile || !targetFile.content) {
          return `File not found: ${path}`;
        }

        const position = lineColumnToPosition(targetFile.content, line, column);
        const definitions = languageService.getDefinitionAtPosition(
          normalizedPath,
          position
        );

        if (!definitions || definitions.length === 0) {
          return `No definition found at ${path}:${line}:${column}`;
        }

        const results = definitions.map((def) => {
          const defFile = tsFiles.find(
            (f) => `/${f.path}` === def.fileName || f.path === def.fileName
          );
          const defContent = defFile?.content || "";
          const { line: defLine, column: defColumn } = getLineAndColumn(
            defContent,
            def.textSpan.start
          );
          const lineContent = getLineContext(defContent, defLine, 100);

          return {
            path: def.fileName.startsWith("/")
              ? def.fileName.substring(1)
              : def.fileName,
            line: defLine,
            column: defColumn,
            kind: def.kind,
            name: def.name,
            context: lineContent,
          };
        });

        if (results.length === 1) {
          const r = results[0];
          return `Definition found:\n  ${r.path}:${r.line}:${r.column}\n  ${r.kind}: ${r.name}\n  ${r.context}`;
        }

        const formatted = results
          .map(
            (r) =>
              `[${r.kind}] ${r.name} - ${r.path}:${r.line}:${r.column}\n    ${r.context}`
          )
          .join("\n");

        return `Found ${results.length} definition(s):\n${formatted}`;
      } catch (error) {
        return `Error finding definition: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),
});

export type LSPTools = ReturnType<typeof createLSPTools>;
