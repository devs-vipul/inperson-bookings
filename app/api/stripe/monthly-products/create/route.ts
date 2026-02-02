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
      name,
      description,
      price,
      durationMonths,
    } = body;

    // Validate required fields
    if (!name || !description || price === undefined || durationMonths === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate price is non-negative
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Price must be 0 or greater" },
        { status: 400 }
      );
    }

    // Validate duration is positive
    if (typeof durationMonths !== "number" || durationMonths <= 0) {
      return NextResponse.json(
        { error: "Duration must be a positive number" },
        { status: 400 }
      );
    }

    // Create Stripe product
    const product = await stripe.products.create({
      name,
      description,
      metadata: {
        type: "monthly_subscription",
        durationMonths: durationMonths.toString(),
      },
    });

    // Create Stripe price for one-time payment (not subscription)
    // Since it's a one-time payment for monthly access, we use payment mode
    // Stripe supports $0 prices (unit_amount: 0)
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents (0 for free)
      currency: "usd",
    });

    // Create product in Convex
    const productId = await convex.mutation(api.monthlyProducts.create, {
      name,
      description,
      price,
      durationMonths,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
    });

    return NextResponse.json({
      productId,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
    });
  } catch (error) {
    console.error("Error creating monthly product:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create monthly product: ${errorMessage}` },
      { status: 500 }
    );
  }
}
