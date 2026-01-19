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
    } = body;

    // Create Stripe product
    const product = await stripe.products.create({
      name: `${sessionName} - ${trainerName}`,
      description: `${sessionsPerWeek} session${sessionsPerWeek > 1 ? "s" : ""} per week (${duration} minutes each)`,
      metadata: {
        sessionId,
        trainerId,
        sessionsPerWeek: sessionsPerWeek.toString(),
        duration: duration.toString(),
      },
    });

    // Create Stripe price for recurring subscription
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: "usd",
      recurring: {
        interval: "week",
      },
    });

    // Update session in Convex with Stripe IDs
    await convex.mutation(api.sessions.update, {
      id: sessionId as Id<"sessions">,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
    });

    return NextResponse.json({
      productId: product.id,
      priceId: stripePrice.id,
    });
  } catch (error) {
    console.error("Error creating Stripe product:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe product" },
      { status: 500 }
    );
  }
}
