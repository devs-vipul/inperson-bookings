import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get user by Clerk ID
export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});

// Mutation to create or update user from Clerk
export const upsertFromClerk = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        image: args.image,
        phone: args.phone,
        role: args.role,
      });
      return existing._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        clerkUserId: args.clerkUserId,
        name: args.name,
        email: args.email,
        image: args.image,
        phone: args.phone,
        role: args.role || "user",
      });
    }
  },
});
