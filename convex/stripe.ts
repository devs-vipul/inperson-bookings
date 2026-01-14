import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Internal mutation to handle Stripe webhooks
export const handleWebhook = internalMutation({
  args: {
    type: v.string(),
    session: v.optional(
      v.object({
        id: v.string(),
        customer: v.union(v.string(), v.null()),
        subscription: v.union(v.string(), v.null()),
        metadata: v.union(
          v.object({
            trainerId: v.string(),
            sessionId: v.string(),
            clerkUserId: v.string(),
            slots: v.string(),
            sessionsPerWeek: v.string(),
            duration: v.string(),
          }),
          v.null()
        ),
        amount_total: v.union(v.number(), v.null()),
        currency: v.union(v.string(), v.null()),
      })
    ),
    subscription: v.optional(
      v.object({
        id: v.string(),
        customer: v.union(v.string(), v.null()),
        status: v.string(),
        metadata: v.union(
          v.object({
            trainerId: v.string(),
            sessionId: v.string(),
            clerkUserId: v.string(),
            slots: v.string(),
            sessionsPerWeek: v.string(),
            duration: v.string(),
          }),
          v.null()
        ),
      })
    ),
    invoice: v.optional(
      v.object({
        id: v.string(),
        subscription: v.union(v.string(), v.null()),
        customer: v.union(v.string(), v.null()),
        amount_paid: v.union(v.number(), v.null()),
        currency: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.type === "checkout.session.completed" && args.session) {
      const session = args.session;
      if (!session.metadata) {
        throw new Error("Missing metadata in session");
      }

      const { trainerId, sessionId, clerkUserId, slots, sessionsPerWeek, duration } =
        session.metadata;

      // Get user by Clerk ID
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
        .first();

      if (!user) {
        throw new Error("User not found");
      }

      // Parse slots
      const parsedSlots = JSON.parse(slots);

      // Get trainer and session data for emails
      const trainer = await ctx.db.get(trainerId as Id<"trainers">);
      const sessionData = await ctx.db.get(sessionId as Id<"sessions">);

      if (!trainer || !sessionData) {
        throw new Error("Trainer or session not found");
      }

      // Create booking
      const bookingId = await ctx.db.insert("bookings", {
        userId: user._id,
        trainerId: trainerId as Id<"trainers">,
        sessionId: sessionId as Id<"sessions">,
        slots: parsedSlots,
        status: "confirmed",
        stripeCheckoutSessionId: session.id,
        stripeSubscriptionId: session.subscription as string | undefined,
        stripeCustomerId: session.customer as string | undefined,
        paymentStatus: "paid",
        amountPaid: session.amount_total || undefined,
        currency: session.currency || "usd",
        createdAt: now,
        updatedAt: now,
      });

      // Send emails asynchronously (don't block webhook response)
      // Schedule email sending to run after booking is created
      try {
        await ctx.scheduler.runAfter(0, internal.emails.sendBookingConfirmationToUser, {
          userEmail: user.email || "",
          userName: user.name || "User",
          trainerName: trainer.name,
          sessionName: sessionData.name,
          sessionsPerWeek: Number(sessionsPerWeek),
          duration: Number(duration),
          slots: parsedSlots,
        });

        await ctx.scheduler.runAfter(0, internal.emails.sendBookingNotificationToTrainer, {
          trainerEmail: trainer.email,
          trainerName: trainer.name,
          userName: user.name || "User",
          userEmail: user.email || "",
          sessionName: sessionData.name,
          sessionsPerWeek: Number(sessionsPerWeek),
          duration: Number(duration),
          slots: parsedSlots,
        });
      } catch (emailError) {
        // Log error but don't fail the webhook
        console.error("Error scheduling emails:", emailError);
      }

      return { bookingId, success: true };
    }

    if (
      (args.type === "customer.subscription.created" ||
        args.type === "customer.subscription.updated") &&
      args.subscription
    ) {
      const subscription = args.subscription;
      
      // Find booking by subscription ID
      const booking = await ctx.db
        .query("bookings")
        .withIndex("by_stripe_subscription", (q) =>
          q.eq("stripeSubscriptionId", subscription.id)
        )
        .first();

      if (booking) {
        // Update booking status based on subscription status
        const status =
          subscription.status === "active" ? "confirmed" : "cancelled";
        
        await ctx.db.patch(booking._id, {
          status,
          updatedAt: now,
        });
      }
    }

    if (args.type === "customer.subscription.deleted" && args.subscription) {
      const subscription = args.subscription;
      
      // Find booking by subscription ID
      const booking = await ctx.db
        .query("bookings")
        .withIndex("by_stripe_subscription", (q) =>
          q.eq("stripeSubscriptionId", subscription.id)
        )
        .first();

      if (booking) {
        await ctx.db.patch(booking._id, {
          status: "cancelled",
          updatedAt: now,
        });
      }
    }

    if (args.type === "invoice.payment_succeeded" && args.invoice) {
      const invoice = args.invoice;
      
      if (invoice.subscription) {
        // Find booking by subscription ID
        const booking = await ctx.db
          .query("bookings")
          .withIndex("by_stripe_subscription", (q) =>
            q.eq("stripeSubscriptionId", invoice.subscription as string)
          )
          .first();

        if (booking) {
          // Update payment status
          await ctx.db.patch(booking._id, {
            paymentStatus: "paid",
            amountPaid: invoice.amount_paid || undefined,
            currency: invoice.currency || "usd",
            updatedAt: now,
          });
        }
      }
    }

    if (args.type === "invoice.payment_failed" && args.invoice) {
      const invoice = args.invoice;
      
      if (invoice.subscription) {
        // Find booking by subscription ID
        const booking = await ctx.db
          .query("bookings")
          .withIndex("by_stripe_subscription", (q) =>
            q.eq("stripeSubscriptionId", invoice.subscription as string)
          )
          .first();

        if (booking) {
          // Update payment status
          await ctx.db.patch(booking._id, {
            paymentStatus: "failed",
            updatedAt: now,
          });
        }
      }
    }

    return { success: true };
  },
});

// Query to get booking by Stripe session ID
export const getByStripeSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.sessionId)
      )
      .first();

    if (!booking) {
      return null;
    }

    // Populate related data
    const trainer = await ctx.db.get(booking.trainerId);
    const session = await ctx.db.get(booking.sessionId);
    const user = await ctx.db.get(booking.userId);

    return {
      ...booking,
      trainer,
      session,
      user,
    };
  },
});
