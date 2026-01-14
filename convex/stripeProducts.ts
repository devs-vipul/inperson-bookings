import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Internal action to create Stripe product and price
export const createProductAndPrice = internalAction({
  args: {
    sessionId: v.id("sessions"),
    trainerId: v.id("trainers"),
    sessionName: v.string(),
    description: v.string(),
    sessionsPerWeek: v.number(),
    duration: v.number(),
    price: v.number(),
    trainerName: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    try {
      // Create Stripe product
      const product = await stripe.products.create({
        name: `${args.sessionName} - ${args.trainerName}`,
        description: `${args.sessionsPerWeek} session${args.sessionsPerWeek > 1 ? "s" : ""} per week (${args.duration} minutes each)`,
        metadata: {
          sessionId: args.sessionId,
          trainerId: args.trainerId,
          sessionsPerWeek: args.sessionsPerWeek.toString(),
          duration: args.duration.toString(),
        },
      });

      // Create Stripe price for recurring subscription
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(args.price * 100), // Convert to cents
        currency: "usd",
        recurring: {
          interval: "week",
        },
      });

      // Update session with Stripe IDs
      await ctx.runMutation(internal.sessions.updateStripeIds, {
        sessionId: args.sessionId,
        stripeProductId: product.id,
        stripePriceId: price.id,
      });

      return {
        productId: product.id,
        priceId: price.id,
      };
    } catch (error) {
      console.error("Error creating Stripe product:", error);
      throw error;
    }
  },
});
