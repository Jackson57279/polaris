import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";

export const createAgent = mutation({
  args: {
    projectId: v.id("projects"),
    type: v.union(
      v.literal("import"),
      v.literal("export"),
      v.literal("generation"),
      v.literal("refactor"),
      v.literal("test"),
      v.literal("custom")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const agentId = await ctx.db.insert("backgroundAgents", {
      projectId: args.projectId,
      type: args.type,
      status: "pending",
      title: args.title,
      description: args.description,
      progress: 0,
      metadata: args.metadata,
    });

    return agentId;
  },
});

export const updateAgentProgress = mutation({
  args: {
    agentId: v.id("backgroundAgents"),
    progress: v.number(),
    currentStep: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      progress: args.progress,
    };

    if (args.currentStep !== undefined) {
      updateData.currentStep = args.currentStep;
    }

    if (args.status !== undefined) {
      updateData.status = args.status;

      if (args.status === "running" && !updateData.startedAt) {
        updateData.startedAt = Date.now();
      }

      if (
        args.status === "completed" ||
        args.status === "failed" ||
        args.status === "cancelled"
      ) {
        updateData.completedAt = Date.now();
      }
    }

    await ctx.db.patch(args.agentId, updateData);
  },
});

export const completeAgent = mutation({
  args: {
    agentId: v.id("backgroundAgents"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      status: args.status,
      progress: args.status === "completed" ? 100 : args.progress,
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const getAgents = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("backgroundAgents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const getAgent = query({
  args: {
    agentId: v.id("backgroundAgents"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const project = await ctx.db.get(agent.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return agent;
  },
});

export const cancelAgent = mutation({
  args: {
    agentId: v.id("backgroundAgents"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const project = await ctx.db.get(agent.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.agentId, {
      status: "cancelled",
      completedAt: Date.now(),
    });
  },
});
