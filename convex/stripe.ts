import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Stripe from "stripe";

// Initialize Stripe (will throw at runtime if key is missing)
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
};

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : (null as any);

export default stripe;

// Public webhook handler (callable from Next.js API route)
// Note: This is safe because signature verification happens in Next.js API route
export const processWebhook = mutation({
  args: {
    type: v.string(),
    session: v.optional(v.any()),
    subscription: v.optional(v.any()),
    invoice: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log("🔔 Webhook received in Convex:", args.type);

    switch (args.type) {
      case "checkout.session.completed": {
        const session = args.session as any;
        console.log("📦 Processing checkout session:", session.id);

        // Extract metadata
        const metadata = session.metadata || {};
        console.log("📋 Metadata:", metadata);

        const trainerId = metadata.trainerId as Id<"trainers">;
        const sessionId = metadata.sessionId as Id<"sessions">;
        const clerkUserId = metadata.clerkUserId;
        const slots = JSON.parse(metadata.slots || "[]");
        const sessionsPerWeek = parseInt(metadata.sessionsPerWeek || "1");

        console.log("👤 Clerk User ID:", clerkUserId);
        console.log("🎯 Trainer ID:", trainerId);
        console.log("📅 Session ID:", sessionId);
        console.log("🕐 Slots:", slots);
        console.log("📊 Sessions per week:", sessionsPerWeek);

        // Find user by Clerk ID
        console.log("🔍 Looking up user by Clerk ID:", clerkUserId);
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_user_id", (q) =>
            q.eq("clerkUserId", clerkUserId)
          )
          .first();

        if (!user) {
          console.error(`❌ User not found for Clerk ID: ${clerkUserId}`);
          return;
        }

        console.log("✅ User found:", user._id, user.email);

        // Create booking
        console.log("💾 Creating booking...");
        const bookingId = await ctx.db.insert("bookings", {
          userId: user._id,
          trainerId,
          sessionId,
          slots,
          status: "confirmed",
          stripeCheckoutSessionId: session.id,
          stripeSubscriptionId: session.subscription as string,
          stripeCustomerId: session.customer as string,
          paymentStatus: "paid",
          amountPaid: session.amount_total || 0,
          currency: session.currency || "usd",
          isAdvancedBooking: false, // Initial booking
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        console.log("✅ Booking created successfully:", bookingId);

        // Create subscription record
        if (session.subscription) {
          console.log("💳 Creating subscription record...");
          const subscriptionId = await ctx.runMutation(
            internal.subscriptions.create,
            {
              userId: user._id,
              trainerId,
              sessionId,
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ).toISOString(),
              sessionsPerWeek,
            }
          );

          // Link booking to subscription
          await ctx.db.patch(bookingId, {
            subscriptionId,
          });
        }

        // TODO: Send emails to user and trainer

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = args.invoice as any;
        console.log("✅ Payment succeeded for invoice:", invoice.id);

        if (invoice.subscription) {
          console.log("🎉 Reactivating subscription:", invoice.subscription);

          // Update subscription status to active (recovers from past_due)
          await ctx.runMutation(internal.subscriptions.updateStatus, {
            stripeSubscriptionId: invoice.subscription as string,
            status: "active",
          });

          console.log(
            "✅ Subscription is now active. User can book advanced slots again."
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = args.invoice as any;
        console.log("❌ Payment failed for invoice:", invoice.id);

        if (invoice.subscription) {
          console.log(
            "⚠️ Marking subscription as past_due:",
            invoice.subscription
          );

          // Update subscription status to past_due
          await ctx.runMutation(internal.subscriptions.updateStatus, {
            stripeSubscriptionId: invoice.subscription as string,
            status: "past_due",
          });

          // Note: We don't cancel bookings immediately - Stripe will retry payment
          // If payment ultimately fails after all retries, subscription will be cancelled
          // and we'll handle it in customer.subscription.deleted
          console.log(
            "⏳ Subscription marked as past_due. Stripe will retry payment."
          );
          console.log(
            "📌 Advanced bookings are preserved during grace period."
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = args.subscription as any;
        console.log("🚫 Subscription deleted:", subscription.id);

        // Find the subscription in our database
        const dbSubscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_stripe_subscription", (q) =>
            q.eq("stripeSubscriptionId", subscription.id)
          )
          .first();

        if (dbSubscription) {
          // Update subscription status to cancelled
          await ctx.runMutation(internal.subscriptions.updateStatus, {
            stripeSubscriptionId: subscription.id,
            status: "cancelled",
          });

          // Cancel future advanced bookings (bookings after today)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayString = today.toISOString().split("T")[0];

          const futureBookings = await ctx.db
            .query("bookings")
            .withIndex("by_user_id", (q) =>
              q.eq("userId", dbSubscription.userId)
            )
            .filter((q) =>
              q.and(
                q.eq(q.field("subscriptionId"), dbSubscription._id),
                q.eq(q.field("isAdvancedBooking"), true),
                q.eq(q.field("status"), "confirmed")
              )
            )
            .collect();

          // Cancel bookings that are in the future
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

          console.log(
            `🗑️ Cancelled ${cancelledCount} future advanced bookings`
          );
          console.log("📌 Past bookings are preserved for records");
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${args.type}`);
    }

    return { success: true };
  },
});

// Get booking by Stripe checkout session ID
export const getByStripeSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.sessionId)
      )
      .first();

    if (!booking) return null;

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
