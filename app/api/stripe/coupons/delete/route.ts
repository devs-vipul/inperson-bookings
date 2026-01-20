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
    const { couponId, stripeCouponId } = body;

    if (!couponId || !stripeCouponId) {
      return NextResponse.json(
        { error: "Missing coupon ID or Stripe coupon ID" },
        { status: 400 }
      );
    }

    // Delete from Stripe first
    try {
      await stripe.coupons.del(stripeCouponId);
    } catch (stripeError: any) {
      // If coupon doesn't exist in Stripe, continue with database deletion
      if (stripeError.type !== "StripeInvalidRequestError") {
        console.error("Error deleting Stripe coupon:", stripeError);
        return NextResponse.json(
          { error: "Failed to delete coupon from Stripe" },
          { status: 500 }
        );
      }
    }

    // Delete from Convex database
    await convex.mutation(api.coupons.deleteCoupon, {
      id: couponId as Id<"discountCode">,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
