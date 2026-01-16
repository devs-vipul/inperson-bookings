"use client";

import { Suspense } from "react";
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
import { motion } from "framer-motion";

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");
  const bypass = searchParams.get("bypass") === "true";
  const advanced = searchParams.get("advanced") === "true";
  const isDirectBooking = bypass || advanced; // Either bypass or advanced booking

  // Fetch booking - either by Stripe session ID or booking ID (for bypass/advanced mode)
  const bookingBySession = useQuery(
    api.stripe.getByStripeSession,
    sessionId && !isDirectBooking ? { sessionId } : "skip"
  );

  const bookingById = useQuery(
    api.bookings.getById,
    bookingId && isDirectBooking ? { id: bookingId as Id<"bookings"> } : "skip"
  );

  const booking = isDirectBooking ? bookingById : bookingBySession;

  if (!sessionId && !bookingId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card
          className="w-full max-w-md border-2"
          style={{ borderColor: "#F2D578" }}
        >
          <CardContent className="p-8 text-center">
            <p className="text-destructive font-bold text-lg mb-4">
              Invalid booking reference
            </p>
            <Button
              asChild
              className="px-6 py-4 font-bold rounded-lg border-2"
              style={{
                backgroundColor: "#F2D578",
                color: "black",
                borderColor: "#F2D578",
              }}
            >
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
        <p className="text-muted-foreground font-medium text-lg">Loading...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card
          className="w-full max-w-md border-2"
          style={{ borderColor: "#F2D578" }}
        >
          <CardContent className="p-8 text-center">
            <p className="text-destructive font-bold text-lg mb-4">
              Booking not found
            </p>
            <Button
              asChild
              className="px-6 py-4 font-bold rounded-lg border-2"
              style={{
                backgroundColor: "#F2D578",
                color: "black",
                borderColor: "#F2D578",
              }}
            >
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
    : bypass || advanced
      ? "0.00"
      : "0.00";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Success Header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mb-4 flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.2,
              type: "spring",
              stiffness: 200,
            }}
          >
            <div
              className="rounded-full p-6 border-4"
              style={{
                backgroundColor: "rgba(242, 213, 120, 0.1)",
                borderColor: "#F2D578",
              }}
            >
              <CheckCircle2
                className="h-16 w-16"
                style={{ color: "#F2D578" }}
              />
            </div>
          </motion.div>
          <h1 className="mb-2 text-4xl font-bold" style={{ color: "#F2D578" }}>
            Booking Confirmed!
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Your training sessions have been successfully booked.
            {bypass && (
              <span
                className="block mt-2 text-sm font-bold"
                style={{ color: "#F2D578" }}
              >
                (Test Mode - Payment Bypassed)
              </span>
            )}
            {advanced && (
              <span
                className="block mt-2 text-sm font-bold"
                style={{ color: "#F2D578" }}
              >
                (Advanced Booking)
              </span>
            )}
          </p>
        </motion.div>

        {/* Booking Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="mb-6 border-2" style={{ borderColor: "#F2D578" }}>
            <CardHeader
              className="border-b-2"
              style={{ borderColor: "#F2D578" }}
            >
              <CardTitle style={{ color: "#F2D578" }}>
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Trainer Info */}
              <div className="flex items-start gap-4">
                {trainer?.profilePicture && (
                  <div
                    className="border-4 rounded-xl p-1"
                    style={{ borderColor: "#F2D578" }}
                  >
                    <TrainerImage
                      storageId={trainer.profilePicture}
                      width={80}
                      height={80}
                      alt={trainer.name}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <User className="h-5 w-5" style={{ color: "#F2D578" }} />
                    <h3 className="text-lg font-bold">{trainer?.name}</h3>
                  </div>
                  {trainer?.expertise && trainer.expertise.length > 0 && (
                    <p className="text-sm text-muted-foreground font-medium">
                      {trainer.expertise.join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Session Info */}
              {session && (
                <div
                  className="rounded-lg border-2 p-4"
                  style={{
                    borderColor: "#F2D578",
                    backgroundColor: "rgba(242, 213, 120, 0.05)",
                  }}
                >
                  <h4
                    className="mb-3 font-bold text-lg"
                    style={{ color: "#F2D578" }}
                  >
                    {session.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground font-medium">
                        Sessions per week
                      </p>
                      <p className="font-bold text-lg">
                        {session.sessionsPerWeek}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">
                        Duration
                      </p>
                      <p className="font-bold text-lg">
                        {session.duration} minutes
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div
                className="rounded-lg border-2 p-4"
                style={{
                  borderColor: "#F2D578",
                  backgroundColor: "rgba(242, 213, 120, 0.05)",
                }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard
                    className="h-5 w-5"
                    style={{ color: "#F2D578" }}
                  />
                  <h4
                    className="font-bold text-lg"
                    style={{ color: "#F2D578" }}
                  >
                    Payment
                  </h4>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">
                    Amount Paid
                  </span>
                  <span
                    className="font-bold text-xl"
                    style={{ color: "#F2D578" }}
                  >
                    ${totalAmount} {booking.currency?.toUpperCase() || "USD"}
                  </span>
                </div>
                {advanced && (
                  <p
                    className="mt-2 text-xs font-medium"
                    style={{ color: "#F2D578" }}
                  >
                    ✓ Covered by your active subscription
                  </p>
                )}
                {booking.stripeSubscriptionId && !advanced && (
                  <p
                    className="mt-2 text-xs font-medium"
                    style={{ color: "#F2D578" }}
                  >
                    Recurring weekly payment enabled
                  </p>
                )}
              </div>

              {/* Booked Slots */}
              <div>
                <div
                  className="mb-4 flex items-center gap-2 border-b-2 pb-2"
                  style={{ borderColor: "#F2D578" }}
                >
                  <Calendar className="h-5 w-5" style={{ color: "#F2D578" }} />
                  <h4
                    className="font-bold text-lg"
                    style={{ color: "#F2D578" }}
                  >
                    Booked Sessions
                  </h4>
                </div>
                <div className="space-y-3">
                  {slots.map((slot, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                      className="flex items-center justify-between rounded-lg border-2 p-4 hover:shadow-md transition-all"
                      style={{
                        borderColor: "#F2D578",
                        backgroundColor: "rgba(242, 213, 120, 0.05)",
                      }}
                    >
                      <div>
                        <p className="font-bold text-lg">
                          {formatDate(new Date(slot.date + "T00:00:00"))}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                          <Clock
                            className="h-4 w-4"
                            style={{ color: "#F2D578" }}
                          />
                          <span>
                            {formatTime12Hour(slot.startTime)} -{" "}
                            {formatTime12Hour(slot.endTime)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto px-8 py-6 font-bold text-lg rounded-lg border-2"
              style={{
                backgroundColor: "#F2D578",
                color: "black",
                borderColor: "#F2D578",
              }}
            >
              <Link href="/my-bookings">View My Bookings</Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-6 font-bold text-lg rounded-lg border-2"
              style={{
                backgroundColor: "black",
                color: "#F2D578",
                borderColor: "#F2D578",
              }}
              onClick={() => router.push("/our-trainers")}
            >
              Book Another Session
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
              style={{
                borderColor: "#F2D578",
                borderRightColor: "transparent",
              }}
              role="status"
            >
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
              </span>
            </div>
            <p className="mt-4 text-muted-foreground">
              Loading booking confirmation...
            </p>
          </div>
        </div>
      }
    >
      <BookingConfirmationContent />
    </Suspense>
  );
}
