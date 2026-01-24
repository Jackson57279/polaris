import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const FREE_PROJECT_LIMIT = 10;
export const TRIAL_DAYS = 7;

export default defineSchema({
  users: defineTable({
    stackUserId: v.string(), // Stack Auth user ID (migrated from clerkId)
    clerkId: v.optional(v.string()), // Legacy - for migration period
    email: v.string(),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("free"),
        v.literal("trialing"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("canceled"),
        v.literal("past_due")
      )
    ),
    subscriptionTier: v.optional(
      v.union(
        v.literal("free"),
        v.literal("pro_monthly"),
        v.literal("pro_yearly")
      )
    ),
    subscriptionPlanId: v.optional(v.string()),
    projectLimit: v.number(),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stack_user", ["stackUserId"])
    .index("by_clerk", ["clerkId"]) // Keep for migration period
    .index("by_paddle_customer", ["paddleCustomerId"])
    .index("by_paddle_subscription", ["paddleSubscriptionId"]),

  projects: defineTable({
    name: v.string(),
    ownerId: v.string(), // Stack Auth user ID (migrated from Clerk)
    userId: v.optional(v.id("users")), // Links to users table for subscription tracking
    updatedAt: v.number(),
    importStatus: v.optional(
      v.union(
        v.literal("importing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    exportStatus: v.optional(
      v.union(
        v.literal("exporting"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
    ),
    exportRepoUrl: v.optional(v.string()),
  }).index("by_owner", ["ownerId"])
    .index("by_user", ["userId"]),

  files: defineTable({
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("folder")),
    content: v.optional(v.string()), // Text files only
    storageId: v.optional(v.id("_storage")), // Binary files only
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_parent", ["parentId"])
    .index("by_project_parent", ["projectId", "parentId"]),

  conversations: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  messages: defineTable({
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
    toolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          args: v.any(),
          result: v.optional(v.any()),
        })
      )
    ),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_project_status", ["projectId", "status"]),

  generationEvents: defineTable({
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
    createdAt: v.number(),
  }).index("by_project_created_at", ["projectId", "createdAt"]),
});
