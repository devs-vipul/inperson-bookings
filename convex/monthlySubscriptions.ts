import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get active monthly subscription for a user
export const getActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    const subscription = await ctx.db
      .query("monthlySubscriptions")
      .withIndex("by_user_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .first();

    if (!subscription) {
      return null;
    }

    // Check if subscription is still valid (not expired)
    // Note: We don't patch here (queries are read-only)
    // Expired subscriptions will be handled by a separate mutation if needed
    if (subscription.endDate < now) {
      return null; // Return null if expired, but don't modify in query
    }

    return subscription;
  },
});

// Query to get all monthly subscriptions for a user
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("monthlySubscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Internal mutation to create a monthly subscription (called from webhook)
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    amountPaid: v.number(),
    currency: v.string(),
    paymentStatus: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Deactivate any existing active subscriptions for this user
    const existingSubscriptions = await ctx.db
      .query("monthlySubscriptions")
      .withIndex("by_user_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    for (const sub of existingSubscriptions) {
      await ctx.db.patch(sub._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("monthlySubscriptions", {
      userId: args.userId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amountPaid: args.amountPaid,
      currency: args.currency,
      paymentStatus: args.paymentStatus,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return subscriptionId;
  },
});

// Mutation to update payment status
export const updatePaymentStatus = mutation({
  args: {
    subscriptionId: v.id("monthlySubscriptions"),
    paymentStatus: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      paymentStatus: args.paymentStatus,
      stripePaymentIntentId: args.stripePaymentIntentId,
      updatedAt: Date.now(),
    });
  },
});

// Mutation to deactivate subscription
export const deactivate = mutation({
  args: { subscriptionId: v.id("monthlySubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});
