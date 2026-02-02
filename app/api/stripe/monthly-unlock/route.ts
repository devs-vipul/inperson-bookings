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
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get user from Convex
    const convexUser = await convex.query(api.users.getByClerkId, {
      clerkUserId: user.id,
    });

    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Get the monthly product
    const product = await convex.query((api as any).monthlyProducts?.getById, {
      id: productId as Id<"monthlyProducts">,
    });

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Product not found or inactive" },
        { status: 404 }
      );
    }

    // Check if user already has an active monthly subscription
    const activeSubscription = await convex.query(
      (api as any).monthlySubscriptions?.getActive,
      { userId: convexUser._id }
    );

    if (activeSubscription) {
      return NextResponse.json(
        { error: "You already have an active monthly subscription" },
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

    // Create one-time payment checkout session using the product's Stripe price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      mode: "payment", // One-time payment, not subscription
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        type: "monthly_unlock",
        clerkUserId: user.id,
        userId: convexUser._id,
        productId: product._id,
        durationMonths: product.durationMonths.toString(),
      },
      success_url: `${request.nextUrl.origin}/monthly-unlock-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/our-trainers?tab=monthly`,
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
