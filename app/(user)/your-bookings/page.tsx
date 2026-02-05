"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTime12Hour } from "@/lib/booking-utils";
import { TrainerImage } from "@/components/trainer-image";
import { Calendar, Clock, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type BookingType = "weekly" | "monthly";
type TimeFilter = "upcoming" | "past";

export default function YourBookingsPage() {
  const { user } = useUser();
  const [bookingType, setBookingType] = useState<BookingType>("weekly");
  const [activeTab, setActiveTab] = useState<TimeFilter>("upcoming");

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Fetch weekly bookings
  const weeklyBookings = useQuery(
    api.bookings.getByUserId,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Fetch monthly bookings
  const monthlyBookings = useQuery(
    (api as any).monthlyBookings?.getByUserId,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Separate weekly bookings into upcoming and past
  const { upcomingWeeklyBookings, pastWeeklyBookings } = useMemo(() => {
    if (!weeklyBookings) return { upcomingWeeklyBookings: [], pastWeeklyBookings: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: typeof weeklyBookings = [];
    const past: typeof weeklyBookings = [];

    weeklyBookings.forEach((booking) => {
      if (!booking.trainer || !booking.session) return;

      // Check if any slot is in the future
      const hasUpcomingSlot = booking.slots.some((slot) => {
        const [year, month, day] = slot.date.split("-").map(Number);
        const slotDate = new Date(year, month - 1, day);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate >= today;
      });

      if (hasUpcomingSlot) {
        upcoming.push(booking);
      } else {
        past.push(booking);
      }
    });

    // Sort upcoming by earliest date, past by latest date
    const sortByDate = (a: (typeof weeklyBookings)[0], b: (typeof weeklyBookings)[0]) => {
      const getEarliestDate = (booking: (typeof weeklyBookings)[0]) => {
        const dates = booking.slots.map((slot) => {
          const [year, month, day] = slot.date.split("-").map(Number);
          return new Date(year, month - 1, day).getTime();
        });
        return Math.min(...dates);
      };

      return getEarliestDate(a) - getEarliestDate(b);
    };

    upcoming.sort(sortByDate);
    past.sort((a, b) => sortByDate(b, a)); // Reverse for past

    return { upcomingWeeklyBookings: upcoming, pastWeeklyBookings: past };
  }, [weeklyBookings]);

  // Separate monthly bookings into upcoming and past
  const { upcomingMonthlyBookings, pastMonthlyBookings } = useMemo(() => {
    if (!monthlyBookings) return { upcomingMonthlyBookings: [], pastMonthlyBookings: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: NonNullable<typeof monthlyBookings> = [];
    const past: NonNullable<typeof monthlyBookings> = [];

    monthlyBookings.forEach((booking: any) => {
      if (!booking.trainer || !booking.subscription) return;

      // Check if any slot is in the future
      const hasUpcomingSlot = booking.slots.some((slot: any) => {
        const [year, month, day] = slot.date.split("-").map(Number);
        const slotDate = new Date(year, month - 1, day);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate >= today;
      });

      if (hasUpcomingSlot) {
        upcoming.push(booking);
      } else {
        past.push(booking);
      }
    });

    // Sort upcoming by earliest date, past by latest date
    const sortByDate = (a: any, b: any) => {
      const getEarliestDate = (booking: any) => {
        const dates = booking.slots.map((slot: any) => {
          const [year, month, day] = slot.date.split("-").map(Number);
          return new Date(year, month - 1, day).getTime();
        });
        return Math.min(...dates);
      };

      return getEarliestDate(a) - getEarliestDate(b);
    };

    upcoming.sort(sortByDate);
    past.sort((a: any, b: any) => sortByDate(b, a)); // Reverse for past

    return { upcomingMonthlyBookings: upcoming, pastMonthlyBookings: past };
  }, [monthlyBookings]);

  if (!user || convexUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!convexUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">
          Please sign in to view your bookings.
        </p>
      </div>
    );
  }

  if (weeklyBookings === undefined || monthlyBookings === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading bookings...</p>
      </div>
    );
  }

  // Render weekly booking card
  const renderWeeklyBookingCard = (booking: (typeof weeklyBookings)[0], index: number) => {
    if (!booking.trainer || !booking.session) return null;

    // Sort slots by date
    const sortedSlots = [...booking.slots].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    return (
      <motion.div
        key={booking._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Card
          className="overflow-hidden border-2 hover:shadow-xl transition-all"
          style={{ borderColor: "#F2D578" }}
        >
          <CardHeader className="pb-4 border-b-2" style={{ borderColor: "#F2D578" }}>
            <div className="flex items-start gap-4">
              <div className="border-4 rounded-xl p-1" style={{ borderColor: "#F2D578" }}>
                <TrainerImage
                  storageId={booking.trainer.profilePicture}
                  width={100}
                  height={100}
                  alt={booking.trainer.name}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl" style={{ color: "#F2D578" }}>
                      {booking.trainer.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      {booking.session.name}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge
                      className="capitalize font-bold border-2"
                      style={{
                        backgroundColor: booking.status === "confirmed" ? "#F2D578" : booking.status === "paused" ? "#fbbf24" : booking.status === "cancelled" ? "#ef4444" : "#6b7280",
                        color: booking.status === "confirmed" ? "black" : booking.status === "paused" ? "black" : "white",
                        borderColor: booking.status === "confirmed" ? "#F2D578" : booking.status === "paused" ? "#fbbf24" : booking.status === "cancelled" ? "#ef4444" : "#6b7280",
                      }}
                    >
                      {booking.status}
                    </Badge>
                    {booking.isAdvancedBooking && (
                      <Badge
                        className="font-bold border-2 text-xs"
                        style={{
                          backgroundColor: "rgba(147, 51, 234, 0.2)",
                          color: "#a78bfa",
                          borderColor: "#a78bfa",
                        }}
                      >
                        🔄 Subscription
                      </Badge>
                    )}
                    <Badge
                      className="font-bold border-2 text-xs"
                      style={{
                        backgroundColor: "rgba(59, 130, 246, 0.2)",
                        color: "#60a5fa",
                        borderColor: "#60a5fa",
                      }}
                    >
                      Weekly
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Package className="h-4 w-4" style={{ color: "#F2D578" }} />
                    <span>{booking.session.duration} min sessions</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-4 w-4" style={{ color: "#F2D578" }} />
                    <span>
                      {booking.slots.length} session
                      {booking.slots.length > 1 ? "s" : ""} booked
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <h3
                className="font-bold text-sm uppercase tracking-wide border-b-2 pb-2"
                style={{ color: "#F2D578", borderColor: "#F2D578" }}
              >
                Session Details
              </h3>
              <div className="grid gap-3">
                {sortedSlots.map((slot, slotIndex) => {
                  const [year, month, day] = slot.date.split("-").map(Number);
                  const slotDate = new Date(year, month - 1, day);
                  const isPast = slotDate < new Date();
                  slotDate.setHours(0, 0, 0, 0);

                  return (
                    <motion.div
                      key={slotIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: slotIndex * 0.05 }}
                      className="rounded-lg border-2 p-4 transition-all hover:shadow-md"
                      style={{
                        borderColor: isPast ? "#6b7280" : "#F2D578",
                        backgroundColor: isPast ? "rgba(107, 114, 128, 0.05)" : "rgba(242, 213, 120, 0.05)",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" style={{ color: isPast ? "#6b7280" : "#F2D578" }} />
                            <p className="font-bold">{formatDate(slotDate)}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" style={{ color: isPast ? "#6b7280" : "#F2D578" }} />
                            <span>
                              {formatTime12Hour(slot.startTime)} -{" "}
                              {formatTime12Hour(slot.endTime)}
                            </span>
                          </div>
                        </div>
                        {isPast && (
                          <Badge
                            variant="outline"
                            className="text-xs font-bold border-2"
                            style={{
                              borderColor: "#6b7280",
                              color: "#6b7280",
                            }}
                          >
                            Past
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Render monthly booking card
  const renderMonthlyBookingCard = (booking: (typeof monthlyBookings)[0], index: number) => {
    if (!booking.trainer || !booking.subscription) return null;

    // Sort slots by date
    const sortedSlots = [...booking.slots].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    // Format subscription dates
    const subscriptionStart = new Date(booking.subscription.startDate);
    const subscriptionEnd = new Date(booking.subscription.endDate);

    return (
      <motion.div
        key={booking._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Card
          className="overflow-hidden border-2 hover:shadow-xl transition-all"
          style={{ borderColor: "#F2D578" }}
        >
          <CardHeader className="pb-4 border-b-2" style={{ borderColor: "#F2D578" }}>
            <div className="flex items-start gap-4">
              <div className="border-4 rounded-xl p-1" style={{ borderColor: "#F2D578" }}>
                <TrainerImage
                  storageId={booking.trainer.profilePicture}
                  width={100}
                  height={100}
                  alt={booking.trainer.name}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl" style={{ color: "#F2D578" }}>
                      {booking.trainer.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      Monthly Subscription
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valid: {formatDate(subscriptionStart)} - {formatDate(subscriptionEnd)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge
                      className="capitalize font-bold border-2"
                      style={{
                        backgroundColor: booking.status === "confirmed" ? "#F2D578" : booking.status === "cancelled" ? "#ef4444" : "#6b7280",
                        color: booking.status === "confirmed" ? "black" : "white",
                        borderColor: booking.status === "confirmed" ? "#F2D578" : booking.status === "cancelled" ? "#ef4444" : "#6b7280",
                      }}
                    >
                      {booking.status}
                    </Badge>
                    <Badge
                      className="font-bold border-2 text-xs"
                      style={{
                        backgroundColor: "rgba(147, 51, 234, 0.2)",
                        color: "#a78bfa",
                        borderColor: "#a78bfa",
                      }}
                    >
                      Monthly
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Package className="h-4 w-4" style={{ color: "#F2D578" }} />
                    <span>Unlimited sessions</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-4 w-4" style={{ color: "#F2D578" }} />
                    <span>
                      {booking.slots.length} session
                      {booking.slots.length > 1 ? "s" : ""} booked
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <h3
                className="font-bold text-sm uppercase tracking-wide border-b-2 pb-2"
                style={{ color: "#F2D578", borderColor: "#F2D578" }}
              >
                Session Details
              </h3>
              <div className="grid gap-3">
                {sortedSlots.map((slot, slotIndex) => {
                  const [year, month, day] = slot.date.split("-").map(Number);
                  const slotDate = new Date(year, month - 1, day);
                  const isPast = slotDate < new Date();
                  slotDate.setHours(0, 0, 0, 0);

                  return (
                    <motion.div
                      key={slotIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: slotIndex * 0.05 }}
                      className="rounded-lg border-2 p-4 transition-all hover:shadow-md"
                      style={{
                        borderColor: isPast ? "#6b7280" : "#F2D578",
                        backgroundColor: isPast ? "rgba(107, 114, 128, 0.05)" : "rgba(242, 213, 120, 0.05)",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" style={{ color: isPast ? "#6b7280" : "#F2D578" }} />
                            <p className="font-bold">{formatDate(slotDate)}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" style={{ color: isPast ? "#6b7280" : "#F2D578" }} />
                            <span>
                              {formatTime12Hour(slot.startTime)} -{" "}
                              {formatTime12Hour(slot.endTime)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({slot.duration} min)
                            </span>
                          </div>
                        </div>
                        {isPast && (
                          <Badge
                            variant="outline"
                            className="text-xs font-bold border-2"
                            style={{
                              borderColor: "#6b7280",
                              color: "#6b7280",
                            }}
                          >
                            Past
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Get the appropriate bookings based on type and time filter
  const getDisplayBookings = () => {
    if (bookingType === "weekly") {
      return activeTab === "upcoming" ? upcomingWeeklyBookings : pastWeeklyBookings;
    } else {
      return activeTab === "upcoming" ? upcomingMonthlyBookings : pastMonthlyBookings;
    }
  };

  const displayBookings = getDisplayBookings();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#F2D578" }}>
            My Bookings
          </h1>
          <p className="text-muted-foreground font-medium">
            Manage and view all your training sessions
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          {/* Booking Type Tabs (Weekly/Monthly) */}
          <div className="border-b-2 pb-4 mb-6" style={{ borderColor: "#F2D578" }}>
            <div className="flex gap-2 max-w-md mb-4">
              <button
                onClick={() => {
                  setBookingType("weekly");
                  setActiveTab("upcoming");
                }}
                className="flex-1 px-6 py-3 text-sm font-bold rounded-md border-2 transition-all"
                style={{
                  borderColor: "#F2D578",
                  backgroundColor: bookingType === "weekly" ? "#F2D578" : "black",
                  color: bookingType === "weekly" ? "black" : "#F2D578",
                }}
              >
                Weekly Bookings
              </button>
              <button
                onClick={() => {
                  setBookingType("monthly");
                  setActiveTab("upcoming");
                }}
                className="flex-1 px-6 py-3 text-sm font-bold rounded-md border-2 transition-all"
                style={{
                  borderColor: "#F2D578",
                  backgroundColor: bookingType === "monthly" ? "#F2D578" : "black",
                  color: bookingType === "monthly" ? "black" : "#F2D578",
                }}
              >
                Monthly Bookings
              </button>
            </div>

            {/* Time Filter Tabs (Upcoming/Past) */}
            <div className="flex gap-2 max-w-md">
              <button
                onClick={() => setActiveTab("upcoming")}
                className="flex-1 px-6 py-3 text-sm font-bold rounded-md border-2 transition-all"
                style={{
                  borderColor: "#F2D578",
                  backgroundColor: activeTab === "upcoming" ? "#F2D578" : "black",
                  color: activeTab === "upcoming" ? "black" : "#F2D578",
                }}
              >
                {bookingType === "weekly" ? "My Trainings" : "Upcoming"} (
                {bookingType === "weekly"
                  ? upcomingWeeklyBookings.length
                  : upcomingMonthlyBookings.length}
                )
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className="flex-1 px-6 py-3 text-sm font-bold rounded-md border-2 transition-all"
                style={{
                  borderColor: "#F2D578",
                  backgroundColor: activeTab === "past" ? "#F2D578" : "black",
                  color: activeTab === "past" ? "black" : "#F2D578",
                }}
              >
                {bookingType === "weekly" ? "Past Trainings" : "Past"} (
                {bookingType === "weekly"
                  ? pastWeeklyBookings.length
                  : pastMonthlyBookings.length}
                )
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "upcoming" && (
            <div className="mt-6">
              {displayBookings.length === 0 ? (
                <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                  <CardContent className="py-12 text-center">
                    <div
                      className="h-16 w-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(242, 213, 120, 0.1)" }}
                    >
                      <Calendar className="h-8 w-8" style={{ color: "#F2D578" }} />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      You don't have any upcoming {bookingType} bookings.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {bookingType === "weekly"
                    ? displayBookings.map((booking: any, index: number) =>
                        renderWeeklyBookingCard(booking, index)
                      )
                    : displayBookings.map((booking: any, index: number) =>
                        renderMonthlyBookingCard(booking, index)
                      )}
                </div>
              )}
            </div>
          )}

          {activeTab === "past" && (
            <div className="mt-6">
              {displayBookings.length === 0 ? (
                <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                  <CardContent className="py-12 text-center">
                    <div
                      className="h-16 w-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(242, 213, 120, 0.1)" }}
                    >
                      <Calendar className="h-8 w-8" style={{ color: "#F2D578" }} />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      You don't have any past {bookingType} bookings.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {bookingType === "weekly"
                    ? displayBookings.map((booking: any, index: number) =>
                        renderWeeklyBookingCard(booking, index)
                      )
                    : displayBookings.map((booking: any, index: number) =>
                        renderMonthlyBookingCard(booking, index)
                      )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
