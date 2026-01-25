import { tool, zodSchema } from "ai";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../convex/_generated/dataModel";

const execAsync = promisify(exec);

// Global convex client for API route context
let globalConvex: ConvexHttpClient | null = null;

export function setGlobalConvex(client: ConvexHttpClient) {
  globalConvex = client;
}

function getConvex(client?: ConvexHttpClient): ConvexHttpClient {
  return client ?? globalConvex!;
}

// Execution limits
const TIMEOUT_MS = 30_000; // 30 seconds
const MAX_OUTPUT_BYTES = 1_048_576; // 1MB

/**
 * Whitelist of allowed command prefixes
 * Only commands starting with these are permitted
 */
const ALLOWED_COMMANDS = [
  "npm",
  "bun",
  "pnpm",
  "yarn",
  "git",
  "node",
  "tsc",
  "eslint",
  "prettier",
  "test",
  "npx",
] as const;

/**
 * Blocked command patterns - these are explicitly forbidden
 * Matches dangerous commands and flags
 */
const BLOCKED_PATTERNS: RegExp[] = [
  // File system destruction
  /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive|--force)/i,
  /rm\s+-[a-zA-Z]*f[a-zA-Z]*r/i,
  /rmdir\s+--ignore-fail-on-non-empty/i,
  
  // Privilege escalation
  /\bsudo\b/i,
  /\bsu\b/i,
  /\bdoas\b/i,
  
  // Network commands (potential data exfiltration)
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bssh\b/i,
  /\bscp\b/i,
  /\brsync\b/i,
  /\bftp\b/i,
  /\bsftp\b/i,
  /\bnc\b/i,
  /\bnetcat\b/i,
  /\btelnet\b/i,
  
  // Permission changes
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bchgrp\b/i,
  
  // System modification
  /\bmkfs\b/i,
  /\bfdisk\b/i,
  /\bdd\b/i,
  /\bmount\b/i,
  /\bumount\b/i,
  
  // Process manipulation
  /\bkill\b/i,
  /\bkillall\b/i,
  /\bpkill\b/i,
  
  // Shell escapes and dangerous operators
  /\beval\b/i,
  /\bexec\b/i,
  /`[^`]+`/, // Backtick command substitution
  /\$\([^)]+\)/, // $() command substitution
  
  // Dangerous flags that could be used with allowed commands
  /--force\s+--all/i,
  /--hard\s+HEAD/i, // git reset --hard HEAD~n
  /push\s+.*--force/i, // git push --force
  /push\s+.*-f\b/i, // git push -f
  
  // Environment manipulation
  /\bexport\b/i,
  /\bunset\b/i,
  /\bsource\b/i,
  /\b\.\s+\//i, // . /path/to/script (source shorthand)
  
  // Redirect to system files
  />\s*\/etc\//i,
  />\s*\/usr\//i,
  />\s*\/var\//i,
  />\s*\/root\//i,
  />\s*~\//i,
];

/**
 * Validate that a command is safe to execute
 * Returns an error message if blocked, null if allowed
 */
function validateCommand(command: string): string | null {
  const trimmedCommand = command.trim();
  
  // Check if command is empty
  if (!trimmedCommand) {
    return "Command cannot be empty";
  }
  
  // Extract the base command (first word)
  const baseCommand = trimmedCommand.split(/\s+/)[0].toLowerCase();
  
  // Check against whitelist
  const isAllowed = ALLOWED_COMMANDS.some(
    (allowed) => baseCommand === allowed || baseCommand.startsWith(`${allowed}/`)
  );
  
  if (!isAllowed) {
    return `Command "${baseCommand}" is not in the allowed list. Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`;
  }
  
  // Check against blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmedCommand)) {
      return `Command contains blocked pattern: ${pattern.toString()}. This operation is not permitted for security reasons.`;
    }
  }
  
  return null;
}

/**
 * Truncate output to max bytes while preserving complete lines
 */
function truncateOutput(output: string, maxBytes: number): { text: string; truncated: boolean } {
  const bytes = Buffer.byteLength(output, "utf8");
  
  if (bytes <= maxBytes) {
    return { text: output, truncated: false };
  }
  
  // Find a good truncation point (end of a line)
  let truncated = output.slice(0, maxBytes);
  const lastNewline = truncated.lastIndexOf("\n");
  
  if (lastNewline > maxBytes * 0.8) {
    truncated = truncated.slice(0, lastNewline);
  }
  
  return {
    text: truncated + `\n\n[Output truncated: ${bytes} bytes exceeded ${maxBytes} byte limit]`,
    truncated: true,
  };
}

export const createTerminalTools = (
  projectId: Id<"projects">,
  internalKey: string,
  convex?: ConvexHttpClient
) => ({
  executeCommand: tool({
    description:
      "Execute safe terminal commands. Only whitelisted commands are allowed: npm, bun, pnpm, yarn, git, node, tsc, eslint, prettier, test, npx. Dangerous operations like rm -rf, sudo, curl, wget, ssh, chmod are blocked. Commands have a 30-second timeout and 1MB output limit.",
    inputSchema: zodSchema(
      z.object({
        command: z
          .string()
          .describe(
            "The command to execute (e.g., 'npm install', 'git status', 'tsc --noEmit')"
          ),
        cwd: z
          .string()
          .optional()
          .describe(
            "Working directory relative to project root. Defaults to project root."
          ),
      })
    ),
    execute: async ({
      command,
      cwd,
    }: {
      command: string;
      cwd?: string;
    }) => {
      // Validate command against whitelist and blocked patterns
      const validationError = validateCommand(command);
      if (validationError) {
        return `Command blocked: ${validationError}`;
      }

      try {
        // Execute with timeout
        const { stdout, stderr } = await execAsync(command, {
          timeout: TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          cwd: cwd || process.cwd(),
          env: {
            ...process.env,
            // Prevent interactive prompts
            CI: "true",
            FORCE_COLOR: "0",
            NO_COLOR: "1",
          },
        });

        // Combine and truncate output
        let output = "";
        
        if (stdout) {
          const { text: stdoutText, truncated: stdoutTruncated } = truncateOutput(
            stdout,
            MAX_OUTPUT_BYTES / 2
          );
          output += stdoutText;
        }
        
        if (stderr) {
          const { text: stderrText, truncated: stderrTruncated } = truncateOutput(
            stderr,
            MAX_OUTPUT_BYTES / 2
          );
          if (output) output += "\n\n--- stderr ---\n";
          output += stderrText;
        }

        if (!output.trim()) {
          return "Command completed successfully (no output)";
        }

        return output.trim();
      } catch (error) {
        if (error instanceof Error) {
          // Handle timeout
          if (error.message.includes("TIMEOUT") || error.message.includes("timed out")) {
            return `Command timed out after ${TIMEOUT_MS / 1000} seconds. Consider breaking the operation into smaller steps.`;
          }
          
          // Handle max buffer exceeded
          if (error.message.includes("maxBuffer")) {
            return `Command output exceeded ${MAX_OUTPUT_BYTES / 1024 / 1024}MB limit. Consider using more specific commands or filtering output.`;
          }
          
          // Handle command execution errors (non-zero exit code)
          const execError = error as Error & { stdout?: string; stderr?: string; code?: number };
          
          let errorOutput = `Command failed`;
          if (execError.code !== undefined) {
            errorOutput += ` with exit code ${execError.code}`;
          }
          errorOutput += ":\n";
          
          if (execError.stderr) {
            const { text } = truncateOutput(execError.stderr, MAX_OUTPUT_BYTES / 2);
            errorOutput += text;
          } else if (execError.stdout) {
            const { text } = truncateOutput(execError.stdout, MAX_OUTPUT_BYTES / 2);
            errorOutput += text;
          } else {
            errorOutput += error.message;
          }
          
          return errorOutput;
        }
        
        return `Error executing command: Unknown error`;
      }
    },
  }),
});

export type TerminalTools = ReturnType<typeof createTerminalTools>;
