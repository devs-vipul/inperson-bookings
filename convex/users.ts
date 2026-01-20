import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get user by Clerk ID
export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId)
      )
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
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId)
      )
      .first();

    if (existing) {
      // Update existing user
      // IMPORTANT: Never wipe role during Clerk sync.
      // Only update role if explicitly provided by a trusted caller.
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        image: args.image,
        phone: args.phone,
        ...(args.role !== undefined ? { role: args.role } : {}),
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

// Query to get all users (for super admin management)
export const getAll = query({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").order("desc").collect();
    return allUsers;
  },
});

// Mutation to update user role (only super admins can do this)
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.string(), // "user", "trainer", "super_admin"
    requesterClerkId: v.string(), // Clerk ID of the person making the request
  },
  handler: async (ctx, args) => {
    // Verify requester is super admin
    const requester = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.requesterClerkId)
      )
      .first();

    if (!requester) {
      throw new Error("Requester not found");
    }

    if (requester.role !== "super_admin") {
      throw new Error("Unauthorized: Only super admins can change user roles");
    }

    // Get the user to update
    const userToUpdate = await ctx.db.get(args.userId);
    if (!userToUpdate) {
      throw new Error("User not found");
    }

    // Prevent user from changing their own role
    if (userToUpdate.clerkUserId === args.requesterClerkId) {
      throw new Error("You cannot change your own role");
    }

    // Validate role value
    const validRoles = ["user", "trainer", "super_admin"];
    if (!validRoles.includes(args.newRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    // If removing super_admin, check if it's the last one
    if (userToUpdate.role === "super_admin" && args.newRole !== "super_admin") {
      const allSuperAdmins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "super_admin"))
        .collect();

      if (allSuperAdmins.length <= 1) {
        throw new Error(
          "Cannot remove the last super admin. At least one super admin must exist."
        );
      }
    }

    // Update the role
    await ctx.db.patch(args.userId, {
      role: args.newRole,
    });

    return { success: true };
  },
});
