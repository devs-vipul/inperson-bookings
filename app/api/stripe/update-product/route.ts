import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function POST(request: NextRequest) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Convex URL not configured" },
        { status: 500 }
      );
    }
    const convex = new ConvexHttpClient(convexUrl);
    const body = await request.json();
    const {
      sessionId,
      trainerId,
      sessionName,
      description,
      sessionsPerWeek,
      duration,
      price,
      trainerName,
      stripeProductId,
      stripePriceId,
    } = body;

    if (!stripeProductId || !stripePriceId) {
      return NextResponse.json(
        { error: "Stripe product ID and price ID are required" },
        { status: 400 }
      );
    }

    // Update Stripe product name and description
    await stripe.products.update(stripeProductId, {
      name: `${sessionName} - ${trainerName}`,
      description: `${sessionsPerWeek} session${sessionsPerWeek > 1 ? "s" : ""} per week (${duration} minutes each)`,
      metadata: {
        sessionId,
        trainerId,
        sessionsPerWeek: sessionsPerWeek.toString(),
        duration: duration.toString(),
      },
    });

    // If price changed, create a new price and archive the old one
    // Stripe doesn't allow updating prices, so we create a new one
    let newPriceId = stripePriceId;
    
    // Get current price to compare
    const currentPrice = await stripe.prices.retrieve(stripePriceId);
    const currentPriceAmount = currentPrice.unit_amount ? currentPrice.unit_amount / 100 : 0;
    
    if (price !== currentPriceAmount) {
      // Create new price with updated amount
      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: "usd",
        recurring: {
          interval: "week",
        },
      });

      newPriceId = newPrice.id;

      // Set the new price as default
      await stripe.products.update(stripeProductId, {
        default_price: newPriceId,
      });

      // Archive the old price (set active to false)
      await stripe.prices.update(stripePriceId, {
        active: false,
      });
    }

    // Update session in Convex with new price ID if it changed
    if (newPriceId !== stripePriceId) {
      await convex.mutation(api.sessions.update, {
        id: sessionId as Id<"sessions">,
        stripePriceId: newPriceId,
      });
    }

    return NextResponse.json({
      productId: stripeProductId,
      priceId: newPriceId,
    });
  } catch (error) {
    console.error("Error updating Stripe product:", error);
    return NextResponse.json(
      { error: "Failed to update Stripe product" },
      { status: 500 }
    );
  }
}
