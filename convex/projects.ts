import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";
import { FREE_PROJECT_LIMIT } from "./users";

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const stackUserId = identity.subject;
    const now = Date.now();

    let user = await ctx.db
      .query("users")
      .withIndex("by_stack_user", (q) => q.eq("stackUserId", stackUserId))
      .first();

    if (!user) {
      const email = identity.email || "";
      const userId = await ctx.db.insert("users", {
        stackUserId,
        email,
        subscriptionStatus: "free",
        subscriptionTier: "free",
        projectLimit: FREE_PROJECT_LIMIT,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to create user record. Please try again.");
    }

    if (user.projectLimit !== -1) {
      const existingProjects = await ctx.db
        .query("projects")
        .withIndex("by_owner", (q) => q.eq("ownerId", stackUserId))
        .collect();

      if (existingProjects.length >= user.projectLimit) {
        throw new Error(
          `Project limit reached. You have ${user.projectLimit} free projects. ` +
          "Please upgrade to Pro for unlimited projects."
        );
      }
    }

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      ownerId: stackUserId,
      userId: user._id,
      updatedAt: now,
    });

    return projectId;
  },
});

export const getPartial = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(args.limit);
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("projects")
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    return project;
  },
});

export const getGenerationEvents = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    const limit = args.limit ?? 200;

    const events = await ctx.db
      .query("generationEvents")
      .withIndex("by_project_created_at", (q) =>
        q.eq("projectId", args.projectId)
      )
      .order("desc")
      .take(limit);

    return events.reverse();
  },
});

export const rename = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.id);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});