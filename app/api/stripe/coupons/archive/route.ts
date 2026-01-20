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
    const { couponId, stripeCouponId, action } = body; // action: "archive" or "unarchive"

    if (!couponId || !stripeCouponId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update in Stripe (delete coupon to archive, or we can just mark inactive in Convex)
    // Note: Stripe doesn't have an archive feature, so we just update Convex
    // If you want to truly archive in Stripe, you'd need to delete and recreate
    
    // Update in Convex database
    if (action === "archive") {
      await convex.mutation(api.coupons.archive, {
        id: couponId as Id<"discountCode">,
      });
    } else if (action === "unarchive") {
      await convex.mutation(api.coupons.unarchive, {
        id: couponId as Id<"discountCode">,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'archive' or 'unarchive'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error archiving/unarchiving coupon:", error);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}
