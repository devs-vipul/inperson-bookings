import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
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
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      trainerId,
      sessionId,
      slots,
      price,
      sessionsPerWeek,
      duration,
      trainerName,
      sessionName,
    } = body;

    // Validate required fields
    if (
      !trainerId ||
      !sessionId ||
      !slots ||
      !Array.isArray(slots) ||
      slots.length === 0 ||
      price === undefined ||
      price === null
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate price is non-negative (0 or positive)
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Price must be 0 or a positive number" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    try {
      const customers = await stripe.customers.list({
        email: user.emailAddresses[0]?.emailAddress,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName || undefined,
          metadata: {
            clerkUserId: user.id,
          },
        });
        customerId = customer.id;
      }
    } catch (error) {
      console.error("Error creating/retrieving customer:", error);
      return NextResponse.json(
        { error: "Failed to create customer" },
        { status: 500 }
      );
    }

    // Get Stripe product and price IDs from session (created when session was created)
    // If not available, create them on the fly (fallback)
    let productId: string;
    let priceId: string;

    try {
      // Get session from Convex
      const sessionData = await convex.query(api.sessions.getById, {
        id: sessionId as Id<"sessions">,
      });

      if (!sessionData) {
        throw new Error("Session not found in database");
      }

      if (sessionData.stripeProductId && sessionData.stripePriceId) {
        productId = sessionData.stripeProductId;
        priceId = sessionData.stripePriceId;
      } else {
        // Fallback: create product/price if not in session
        throw new Error("Stripe IDs not found in session");
      }
    } catch (error) {
      // Fallback: Create product and price if not found
      console.warn("Stripe IDs not found, creating on the fly:", error);
      console.error("Error details:", error);
      
      // Validate required fields for fallback creation
      if (!sessionName || !trainerName || !sessionsPerWeek || !duration) {
        return NextResponse.json(
          { error: "Missing required fields for product creation" },
          { status: 400 }
        );
      }
      
      try {
        const unitAmountCents = Math.round(price * 100); // Convert dollars to cents

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
        productId = product.id;

        const stripePrice = await stripe.prices.create({
          product: productId,
          unit_amount: unitAmountCents,
          currency: "usd",
          recurring: {
            interval: "week",
          },
        });
        priceId = stripePrice.id;

        // Update session with Stripe IDs for future use
        await convex.mutation(api.sessions.update, {
          id: sessionId as Id<"sessions">,
          stripeProductId: productId,
          stripePriceId: priceId,
        });
      } catch (createError) {
        console.error("Error creating product/price:", createError);
        return NextResponse.json(
          { error: "Failed to create product" },
          { status: 500 }
        );
      }
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      allow_promotion_codes: true, // Enable coupon codes
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          trainerId,
          sessionId,
          clerkUserId: user.id,
          slots: JSON.stringify(slots),
          sessionsPerWeek: sessionsPerWeek.toString(),
          duration: duration.toString(),
        },
      },
      metadata: {
        trainerId,
        sessionId,
        clerkUserId: user.id,
        slots: JSON.stringify(slots),
        sessionsPerWeek: sessionsPerWeek.toString(),
        duration: duration.toString(),
      },
      success_url: `${request.nextUrl.origin}/booking-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/book/${trainerId}/${sessionId}`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
}
