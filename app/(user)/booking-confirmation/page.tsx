"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, User, CreditCard } from "lucide-react";
import { formatDate, formatTime12Hour } from "@/lib/booking-utils";
import Link from "next/link";
import { TrainerImage } from "@/components/trainer-image";

export default function BookingConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");
  const bypass = searchParams.get("bypass") === "true";

  // Fetch booking - either by Stripe session ID or booking ID (for bypass mode)
  const bookingBySession = useQuery(
    api.stripe.getByStripeSession,
    sessionId && !bypass ? { sessionId } : "skip"
  );

  const bookingById = useQuery(
    api.bookings.getById,
    bookingId && bypass ? { id: bookingId as Id<"bookings"> } : "skip"
  );

  const booking = bypass ? bookingById : bookingBySession;

  if (!sessionId && !bookingId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Invalid booking reference</p>
            <Button asChild className="mt-4">
              <Link href="/our-trainers">Go to Trainers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (booking === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Booking not found</p>
            <Button asChild className="mt-4">
              <Link href="/our-trainers">Go to Trainers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { trainer, session, slots } = booking;
  const totalAmount = booking.amountPaid
    ? (booking.amountPaid / 100).toFixed(2)
    : bypass
    ? "0.00"
    : "0.00";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Booking Confirmed!</h1>
          <p className="text-muted-foreground">
            Your training sessions have been successfully booked.
            {bypass && (
              <span className="block mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                (Test Mode - Payment Bypassed)
              </span>
            )}
          </p>
        </div>

        {/* Booking Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trainer Info */}
            <div className="flex items-start gap-4">
              {trainer?.profilePicture && (
                <TrainerImage
                  storageId={trainer.profilePicture}
                  width={80}
                  height={80}
                  alt={trainer.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">{trainer?.name}</h3>
                </div>
                {trainer?.expertise && trainer.expertise.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {trainer.expertise.join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Session Info */}
            {session && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="mb-2 font-semibold">{session.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sessions per week</p>
                    <p className="font-medium">{session.sessionsPerWeek}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{session.duration} minutes</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold">Payment</h4>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold">
                  ${totalAmount} {booking.currency?.toUpperCase()}
                </span>
              </div>
              {booking.stripeSubscriptionId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Recurring weekly payment enabled
                </p>
              )}
            </div>

            {/* Booked Slots */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold">Booked Sessions</h4>
              </div>
              <div className="space-y-2">
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {formatDate(new Date(slot.date + "T00:00:00"))}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime12Hour(slot.startTime)} -{" "}
                          {formatTime12Hour(slot.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/your-bookings">View My Bookings</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.push("/our-trainers")}
          >
            Book Another Session
          </Button>
        </div>
      </div>
    </div>
  );
}
