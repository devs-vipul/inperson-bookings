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

// Get active subscription for a user, trainer, and session
export const getActiveSubscription = query({
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

    if (!subscription) {
      return null;
    }

    const session = await ctx.db.get(subscription.sessionId);
    
    // Get current calendar week (Monday-Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const mondayString = monday.toISOString().split('T')[0];
    const sundayString = sunday.toISOString().split('T')[0];
    
    // Get all bookings for this user/trainer/session combo
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("trainerId"), args.trainerId),
          q.eq(q.field("sessionId"), args.sessionId),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();
    
    // Count slots booked in the CURRENT CALENDAR WEEK only
    const currentWeekBookings = bookings.filter((booking) => {
      const firstSlotDate = booking.slots[0]?.date;
      return firstSlotDate && firstSlotDate >= mondayString && firstSlotDate <= sundayString;
    });
    
    const currentWeekSlotsBooked = currentWeekBookings.reduce((acc, booking) => {
      return acc + booking.slots.length;
    }, 0);

    return {
      ...subscription,
      session,
      bookedSlotsInPeriod: currentWeekSlotsBooked, // Now shows current week only
      currentWeekStart: mondayString,
      currentWeekEnd: sundayString,
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

// Get subscriptions by session ID (to check if session has active subscriptions)
export const getBySessionId = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Count active subscriptions
    const activeCount = subscriptions.filter(
      (sub) => sub.status === "active"
    ).length;

    return {
      total: subscriptions.length,
      active: activeCount,
      subscriptions,
    };
  },
});

// Pause subscription
export const pause = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    resumeDate: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Update subscription status
    await ctx.db.patch(args.subscriptionId, {
      status: "paused",
      resumeDate: args.resumeDate,
      updatedAt: Date.now(),
    });

    // Pause bookings that fall within the pause period (today to resume date)
    // Use "paused" status instead of "cancelled" to preserve bookings for when subscription resumes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];
    const resumeDateString = args.resumeDate.split("T")[0];

    const bookingsInPausePeriod = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", subscription.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("subscriptionId"), args.subscriptionId),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();

    let pausedCount = 0;
    for (const booking of bookingsInPausePeriod) {
      const firstSlotDate = booking.slots[0]?.date;
      // Pause if booking is between today (inclusive) and resume date (exclusive)
      if (
        firstSlotDate &&
        firstSlotDate >= todayString &&
        firstSlotDate < resumeDateString
      ) {
        await ctx.db.patch(booking._id, {
          status: "paused",
          updatedAt: Date.now(),
        });
        pausedCount++;
      }
    }

    console.log(
      `⏸️ Admin pause: Paused ${pausedCount} bookings within pause period (${todayString} to ${resumeDateString})`
    );
    console.log("📌 Bookings after resume date are preserved");

    return { success: true, pausedBookings: pausedCount };
  },
});

// Resume subscription
export const resume = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Update subscription status
    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      resumeDate: undefined,
      updatedAt: Date.now(),
    });

    // Restore paused bookings to confirmed status
    const pausedBookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", subscription.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("subscriptionId"), args.subscriptionId),
          q.eq(q.field("status"), "paused")
        )
      )
      .collect();

    let restoredCount = 0;
    for (const booking of pausedBookings) {
      await ctx.db.patch(booking._id, {
        status: "confirmed",
        updatedAt: Date.now(),
      });
      restoredCount++;
    }

    console.log(
      `▶️ Admin resume: Restored ${restoredCount} paused bookings to confirmed status`
    );

    return { success: true, restoredBookings: restoredCount };
  },
});

// Cancel subscription
export const cancel = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    cancelReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Update subscription status
    await ctx.db.patch(args.subscriptionId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelReason: args.cancelReason || "admin_cancelled",
      updatedAt: Date.now(),
    });

    // Cancel future bookings linked to this subscription
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    const futureBookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", subscription.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("subscriptionId"), args.subscriptionId),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();

    let cancelledCount = 0;
    for (const booking of futureBookings) {
      const firstSlotDate = booking.slots[0]?.date;
      if (firstSlotDate && firstSlotDate > todayString) {
        await ctx.db.patch(booking._id, {
          status: "cancelled",
          updatedAt: Date.now(),
        });
        cancelledCount++;
      }
    }

    console.log(`🗑️ Admin cancel: Cancelled ${cancelledCount} future bookings`);
    console.log("📌 Past bookings are preserved for records");

    return { success: true, cancelledBookings: cancelledCount };
  },
});

// Update resume date for paused subscription
export const updateResumeDate = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    resumeDate: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Update resume date
    await ctx.db.patch(args.subscriptionId, {
      resumeDate: args.resumeDate,
      updatedAt: Date.now(),
    });

    // Pause bookings within the new pause period (today to new resume date)
    // This handles the case where admin extends the pause date
    // Also restore bookings that were paused but should now be confirmed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];
    const newResumeDateString = args.resumeDate.split("T")[0];

    // Get ALL bookings for this subscription (confirmed, paused, and cancelled)
    // This ensures we can restore previously paused bookings if resume date moves earlier
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", subscription.userId))
      .filter((q) =>
        q.eq(q.field("subscriptionId"), args.subscriptionId)
      )
      .collect();

    let pausedCount = 0;
    let restoredCount = 0;
    
    for (const booking of bookings) {
      const firstSlotDate = booking.slots[0]?.date;
      
      if (!firstSlotDate) continue;
      
      // Check if booking falls within the pause period (today to resume date)
      const isInPausePeriod = 
        firstSlotDate >= todayString && 
        firstSlotDate < newResumeDateString;
      
      // Check if booking is after the resume date (should be confirmed)
      const isAfterResumeDate = firstSlotDate >= newResumeDateString;
      
      if (isInPausePeriod) {
        // Pause bookings within pause period (only if currently confirmed)
        if (booking.status === "confirmed") {
          await ctx.db.patch(booking._id, {
            status: "paused",
            updatedAt: Date.now(),
          });
          pausedCount++;
        }
      } else if (isAfterResumeDate) {
        // Restore bookings after resume date (only if currently paused)
        // These were likely paused during a previous pause but should now be active
        if (booking.status === "paused") {
          await ctx.db.patch(booking._id, {
            status: "confirmed",
            updatedAt: Date.now(),
          });
          restoredCount++;
        }
      }
      // Bookings before today are left as-is (past bookings)
      // Cancelled bookings remain cancelled (permanent cancellation)
    }

    console.log(
      `📅 Admin edit resume date: Paused ${pausedCount} bookings, restored ${restoredCount} bookings. Pause period: ${todayString} to ${newResumeDateString}`
    );

    return { 
      success: true, 
      pausedBookings: pausedCount,
      restoredBookings: restoredCount 
    };
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
