import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

async function createPromotionCodeRaw(opts: {
  couponId: string;
  code: string;
}) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  const body = new URLSearchParams();
  body.set("coupon", opts.couponId);
  body.set("code", opts.code);

  const res = await fetch("https://api.stripe.com/v1/promotion_codes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await res.json();
  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `Stripe promotion code creation failed (${res.status})`;
    throw new Error(msg);
  }

  return json as { id: string };
}

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
      code,
      disc_type,
      add_disc,
      validity,
    } = body;

    // Validate required fields
    if (!name || !code || !disc_type || add_disc === undefined || !validity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate discount type
    if (disc_type !== "percentage" && disc_type !== "flat") {
      return NextResponse.json(
        { error: "Invalid discount type. Must be 'percentage' or 'flat'" },
        { status: 400 }
      );
    }

    // Validate discount amount
    if (disc_type === "percentage" && (add_disc < 1 || add_disc > 100)) {
      return NextResponse.json(
        { error: "Percentage discount must be between 1 and 100" },
        { status: 400 }
      );
    }

    if (disc_type === "flat" && add_disc <= 0) {
      return NextResponse.json(
        { error: "Flat discount must be greater than 0" },
        { status: 400 }
      );
    }

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      name,
      percent_off: disc_type === "percentage" ? add_disc : undefined,
      amount_off: disc_type === "flat" ? Math.round(add_disc * 100) : undefined, // Convert to cents
      currency: "usd",
      duration: "repeating",
      duration_in_months: validity,
      id: code.toUpperCase(), // Use code as coupon ID
    });

    // Create Stripe promotion code
    const promotionCode = await createPromotionCodeRaw({
      couponId: coupon.id,
      code: code.toUpperCase(),
    });

    // Save to Convex database
    const couponId = await convex.mutation(api.coupons.create, {
      name,
      code: code.toUpperCase(),
      disc_type,
      add_disc,
      stripeCouponId: coupon.id,
      stripePromotionCodeId: promotionCode.id,
      validity,
    });

    return NextResponse.json({
      success: true,
      couponId,
      stripeCouponId: coupon.id,
      stripePromotionCodeId: promotionCode.id,
    });
  } catch (error: any) {
    console.error("Error creating coupon:", error);
    
    // Handle Stripe-specific errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: error.message || "Invalid coupon data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
