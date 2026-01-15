import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
  internalAction,
  internalQuery,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import stripe from "./stripe";

// Get active subscription for a specific user/trainer/session combo
export const getActive = query({
  args: {
    userId: v.id("users"),
    trainerId: v.id("trainers"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_trainer_session", (q) =>
        q
          .eq("userId", args.userId)
          .eq("trainerId", args.trainerId)
          .eq("sessionId", args.sessionId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return subscription;
  },
});

// Get subscription by Stripe subscription ID
export const getByStripeId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) return null;

    // Populate related data
    const user = await ctx.db.get(subscription.userId);
    const trainer = await ctx.db.get(subscription.trainerId);
    const session = await ctx.db.get(subscription.sessionId);

    return {
      ...subscription,
      user,
      trainer,
      session,
    };
  },
});

// Get all subscriptions for a trainer
export const getByTrainerId = query({
  args: { trainerId: v.id("trainers") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    // Populate user data for each subscription
    return await Promise.all(
      subscriptions.map(async (sub) => {
        const user = await ctx.db.get(sub.userId);
        const session = await ctx.db.get(sub.sessionId);

        return {
          ...sub,
          user,
          session,
        };
      })
    );
  },
});

// Pause subscription
export const pause = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    resumeDate: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: "paused",
      resumeDate: args.resumeDate,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Resume subscription
export const resume = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      resumeDate: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Cancel subscription
export const cancel = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    cancelReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelReason: args.cancelReason || "admin_cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update resume date for paused subscription
export const updateResumeDate = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    resumeDate: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      resumeDate: args.resumeDate,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Pause subscription in Stripe
export const pauseInStripe = action({
  args: {
    stripeSubscriptionId: v.string(),
    resumeDate: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    // Get Stripe secret key from environment
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured in Convex environment variables"
      );
    }

    // Initialize Stripe
    const Stripe = (await import("stripe")).default;
    const stripeClient = new Stripe(stripeKey, {
      apiVersion: "2025-12-15.clover" as any,
    });

    const resumeDateObj = new Date(args.resumeDate);
    const resumeTimestamp = Math.floor(resumeDateObj.getTime() / 1000);

    await stripeClient.subscriptions.update(args.stripeSubscriptionId, {
      pause_collection: {
        behavior: "mark_uncollectible",
        resumes_at: resumeTimestamp,
      },
    });

    return { success: true };
  },
});

// Resume subscription in Stripe
export const resumeInStripe = action({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get Stripe secret key from environment
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured in Convex environment variables"
      );
    }

    // Initialize Stripe
    const Stripe = (await import("stripe")).default;
    const stripeClient = new Stripe(stripeKey, {
      apiVersion: "2025-12-15.clover" as any,
    });

    console.log(
      `🔄 Attempting to resume subscription: ${args.stripeSubscriptionId}`
    );

    const subscription = await stripeClient.subscriptions.retrieve(
      args.stripeSubscriptionId
    );

    console.log(`📊 Current subscription status: ${subscription.status}`);
    console.log(`⏸️ Current pause_collection:`, subscription.pause_collection);

    if (subscription.status === "canceled") {
      throw new Error("Cannot resume a cancelled subscription");
    }

    // Resume the subscription by removing pause_collection
    const updatedSubscription = await stripeClient.subscriptions.update(
      args.stripeSubscriptionId,
      {
        pause_collection: "" as any, // Empty string removes the pause
      }
    );

    console.log(`✅ Subscription resumed successfully`);
    console.log(`📊 New subscription status: ${updatedSubscription.status}`);
    console.log(
      `⏸️ New pause_collection:`,
      updatedSubscription.pause_collection
    );

    return { success: true };
  },
});

// Cancel subscription in Stripe
export const cancelInStripe = action({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get Stripe secret key from environment
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured in Convex environment variables"
      );
    }

    // Initialize Stripe
    const Stripe = (await import("stripe")).default;
    const stripeClient = new Stripe(stripeKey, {
      apiVersion: "2025-12-15.clover" as any,
    });

    await stripeClient.subscriptions.cancel(args.stripeSubscriptionId);

    return { success: true };
  },
});

// Get subscriptions that should resume today (for cron job)
export const getTodayResume = query({
  args: {},
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_resume_date_status", (q) =>
        q.eq("resumeDate", todayString).eq("status", "paused")
      )
      .collect();

    return subscriptions;
  },
});

// Auto-resume subscriptions (called by cron)
export const autoResume = action({
  args: {},
  handler: async (ctx, args) => {
    // TODO: Implement auto-resume logic after Convex regenerates API types
    // This will be enabled once the schema is deployed
    return {
      success: true,
      message: "Auto-resume not yet implemented",
      resumedCount: 0,
    };
  },
});

// Create subscription (called from webhook)
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    trainerId: v.id("trainers"),
    sessionId: v.id("sessions"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    currentPeriodStart: v.string(),
    currentPeriodEnd: v.string(),
    sessionsPerWeek: v.number(),
  },
  handler: async (ctx, args) => {
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      trainerId: args.trainerId,
      sessionId: args.sessionId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      status: "active",
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      sessionsPerWeek: args.sessionsPerWeek,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return subscriptionId;
  },
});

// Update subscription status (called from webhook)
export const updateStatus = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.string(),
    currentPeriodStart: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) {
      console.error(`Subscription not found: ${args.stripeSubscriptionId}`);
      return null;
    }

    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.currentPeriodStart) {
      updateData.currentPeriodStart = args.currentPeriodStart;
    }
    if (args.currentPeriodEnd) {
      updateData.currentPeriodEnd = args.currentPeriodEnd;
    }

    await ctx.db.patch(subscription._id, updateData);

    return subscription._id;
  },
});

// Query paused subscriptions that should be resumed
export const getPausedSubscriptionsToResume = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "paused"))
      .collect();

    // Filter subscriptions where resume date has passed
    return subscriptions.filter(
      (sub) => sub.resumeDate && new Date(sub.resumeDate).getTime() <= now
    );
  },
});

// Action to auto-resume subscriptions (called by cron job)
export const resumeSubscriptionsScheduled = internalAction({
  args: {},
  handler: async (ctx) => {
    const subscriptionsToResume = await ctx.runQuery(
      internal.subscriptions.getPausedSubscriptionsToResume
    );

    if (!subscriptionsToResume || subscriptionsToResume.length === 0) {
      console.log("No subscriptions to auto-resume");
      return { resumed: 0 };
    }

    let resumed = 0;
    for (const subscription of subscriptionsToResume) {
      try {
        // Resume in database
        await ctx.runMutation(api.subscriptions.resume, {
          subscriptionId: subscription._id,
        });

        // Resume in Stripe
        await ctx.runAction(api.subscriptions.resumeInStripe, {
          stripeSubscriptionId: subscription.stripeSubscriptionId,
        });

        resumed++;
        console.log(`Auto-resumed subscription: ${subscription._id}`);
      } catch (error) {
        console.error(
          `Failed to auto-resume subscription ${subscription._id}:`,
          error
        );
      }
    }

    console.log(`Auto-resumed ${resumed} subscriptions`);
    return { resumed };
  },
});
