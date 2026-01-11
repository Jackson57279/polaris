import { MutationCtx, QueryCtx } from "./_generated/server";

export const verifyAuth = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized");
  }

  return identity;
};

// Stack Auth user ID extraction helper
export const getStackUserId = (identity: any): string => {
  // Stack Auth stores user ID in the 'sub' field of the JWT
  return identity.subject || identity.sub;
};
