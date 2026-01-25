import { v } from "convex/values";

import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const validateInternalKey = (key: string) => {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new Error("POLARIS_CONVEX_INTERNAL_KEY is not configured");
  }

  if (key !== internalKey) {
    throw new Error("Invalid internal key");
  }
};

export const getConversationById = query({
  args: {
    conversationId: v.id("conversations"),
    internalKey: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    return await ctx.db.get(args.conversationId);
  },
});

export const createMessage = mutation({
  args: {
    internalKey: v.string(),
    conversationId: v.id("conversations"),
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    status: v.optional(
      v.union(
        v.literal("processing"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      projectId: args.projectId,
      role: args.role,
      content: args.content,
      status: args.status,
    });

    // Update conversation's updatedAt
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

export const updateMessageContent = mutation({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
    content: v.string(),
    status: v.optional(
      v.union(
        v.literal("completed"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    await ctx.db.patch(args.messageId, {
      content: args.content,
      status: args.status ?? "completed",
    });
  },
});

const resolvePathToFile = async (
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  path: string
): Promise<Doc<"files"> | null> => {
  const segments = path.split("/").filter(Boolean);
  let parentId: Id<"files"> | undefined = undefined;
  let currentFile: Doc<"files"> | null = null;

  for (const segment of segments) {
    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", projectId).eq("parentId", parentId)
      )
      .collect();

    currentFile = files.find((f) => f.name === segment) ?? null;
    if (!currentFile) return null;
    parentId = currentFile._id;
  }

  return currentFile;
};

export const readFileByPath = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const file = await resolvePathToFile(ctx, args.projectId, args.path);
    if (!file || file.type !== "file") return null;

    return { content: file.content, name: file.name };
  },
});

export const writeFileByPath = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const segments = args.path.split("/").filter(Boolean);
    const fileName = segments.pop();

    if (!fileName) {
      throw new Error("Invalid file path");
    }

    let parentId: Id<"files"> | undefined = undefined;

    for (const segment of segments) {
      const existing = await ctx.db
        .query("files")
        .withIndex("by_project_parent", (q) =>
          q.eq("projectId", args.projectId).eq("parentId", parentId)
        )
        .filter((q) => q.eq(q.field("name"), segment))
        .first();

      if (existing) {
        parentId = existing._id;
      } else {
        parentId = await ctx.db.insert("files", {
          projectId: args.projectId,
          parentId,
          name: segment,
          type: "folder",
          updatedAt: Date.now(),
        });
      }
    }

    const existingFile = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", parentId)
      )
      .filter((q) => q.eq(q.field("name"), fileName))
      .first();

    const now = Date.now();

    if (existingFile) {
      await ctx.db.patch(existingFile._id, {
        content: args.content,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("files", {
        projectId: args.projectId,
        parentId,
        name: fileName,
        type: "file",
        content: args.content,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.projectId, {
      updatedAt: now,
    });
  },
});

export const deleteFileByPath = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const file = await resolvePathToFile(ctx, args.projectId, args.path);

    if (!file) {
      throw new Error("File not found");
    }

    const deleteRecursive = async (fileId: Id<"files">) => {
      const item = await ctx.db.get(fileId);
      if (!item) return;

      if (item.type === "folder") {
        const children = await ctx.db
          .query("files")
          .withIndex("by_project_parent", (q) =>
            q.eq("projectId", item.projectId).eq("parentId", fileId)
          )
          .collect();

        for (const child of children) {
          await deleteRecursive(child._id);
        }
      }

      if (item.storageId) {
        await ctx.storage.delete(item.storageId);
      }

      await ctx.db.delete(fileId);
    };

    await deleteRecursive(file._id);

    await ctx.db.patch(args.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const listFilesByPath = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    let parentId: Id<"files"> | undefined = undefined;

    if (args.path) {
      const folder = await resolvePathToFile(ctx, args.projectId, args.path);
      if (!folder || folder.type !== "folder") {
        return [];
      }
      parentId = folder._id;
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", parentId)
      )
      .collect();

    return files
      .map((f) => ({ name: f.name, type: f.type }))
      .sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });
  },
});

export const getProjectStructure = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    if (allFiles.length === 0) {
      return "";
    }

    const fileMap = new Map(allFiles.map((f) => [f._id, f]));

    const getPath = (file: Doc<"files">): string => {
      const parts: string[] = [file.name];
      let current = file;

      while (current.parentId) {
        const parent = fileMap.get(current.parentId);
        if (!parent) break;
        parts.unshift(parent.name);
        current = parent;
      }

      return parts.join("/");
    };

    const paths = allFiles
      .filter((f) => f.type === "file")
      .map((f) => getPath(f))
      .sort();

    return paths.join("\n");
  },
});

export const getMessageContext = query({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId)
      )
      .order("asc")
      .collect();

    const history = messages
      .filter((m) => m._id !== args.messageId && m.content)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    return {
      projectId: message.projectId,
      conversationId: message.conversationId,
      messages: history,
    };
  },
});

export const appendToolCall = mutation({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
    toolCall: v.object({
      id: v.string(),
      name: v.string(),
      args: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const currentCalls = message.toolCalls ?? [];

    await ctx.db.patch(args.messageId, {
      toolCalls: [...currentCalls, { ...args.toolCall, result: undefined }],
    });
  },
});

export const appendToolResult = mutation({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
    toolCallId: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const currentCalls = message.toolCalls ?? [];
    const updatedCalls = currentCalls.map((call) =>
      call.id === args.toolCallId ? { ...call, result: args.result } : call
    );

    await ctx.db.patch(args.messageId, {
      toolCalls: updatedCalls,
    });
  },
});

export const appendGenerationEvent = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    type: v.union(
      v.literal("step"),
      v.literal("file"),
      v.literal("info"),
      v.literal("error")
    ),
    message: v.string(),
    filePath: v.optional(v.string()),
    preview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    await ctx.db.insert("generationEvents", {
      projectId: args.projectId,
      type: args.type,
      message: args.message,
      filePath: args.filePath,
      preview: args.preview,
      createdAt: Date.now(),
    });
  },
});

export const getProcessingMessages = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    return await ctx.db
      .query("messages")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "processing")
      )
      .collect();
  },
});

export const cancelMessage = mutation({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await ctx.db.patch(args.messageId, {
      status: "cancelled",
      content: message.content || "Message was cancelled.",
    });
  },
});

export const streamMessageContent = mutation({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
    content: v.string(),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Only update if message is still processing (not cancelled)
    if (message.status === "cancelled") {
      return;
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      status: args.isComplete ? "completed" : "processing",
    });

    // Update conversation's updatedAt
    await ctx.db.patch(message.conversationId, {
      updatedAt: Date.now(),
    });
  },
});

export const updateProjectImportStatus = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    status: v.union(
      v.literal("importing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    await ctx.db.patch(args.projectId, {
      importStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateProjectExportStatus = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    status: v.union(
      v.literal("exporting"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    await ctx.db.patch(args.projectId, {
      exportStatus: args.status,
      exportRepoUrl: args.repoUrl,
      updatedAt: Date.now(),
    });
  },
});

export const getAllProjectFiles = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const fileMap = new Map(allFiles.map((f) => [f._id, f]));

    const getPath = (file: Doc<"files">): string => {
      const parts: string[] = [file.name];
      let current = file;

      while (current.parentId) {
        const parent = fileMap.get(current.parentId);
        if (!parent) break;
        parts.unshift(parent.name);
        current = parent;
      }

      return parts.join("/");
    };

    return allFiles.map((f) => ({
      path: getPath(f),
      type: f.type,
      content: f.content,
    }));
  },
});