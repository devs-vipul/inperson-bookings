import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function GET(request: NextRequest) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 }
    );
  }
  const convex = new ConvexHttpClient(convexUrl);
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: "Missing userId or sessionId" },
        { status: 400 }
      );
    }

    // Get all bookings for this user and session
    const bookings = await convex.query(api.bookings.getByUserId, {
      userId: userId as any,
    });

    // Find active booking with subscription
    const activeBooking = bookings.find(
      (booking) =>
        booking.sessionId === sessionId &&
        booking.status === "confirmed" &&
        booking.stripeSubscriptionId
    );

    if (!activeBooking) {
      return NextResponse.json({ stripeSubscriptionId: null });
    }

    return NextResponse.json({
      stripeSubscriptionId: activeBooking.stripeSubscriptionId,
      stripeCustomerId: activeBooking.stripeCustomerId,
    });
  } catch (error) {
    console.error("Error fetching active subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
