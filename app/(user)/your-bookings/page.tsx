"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatTime12Hour } from "@/lib/booking-utils";
import { TrainerImage } from "@/components/trainer-image";
import { Calendar, Clock, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function YourBookingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("upcoming");

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const bookings = useQuery(
    api.bookings.getByUserId,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Separate bookings into upcoming and past
  const { upcomingBookings, pastBookings } = useMemo(() => {
    if (!bookings) return { upcomingBookings: [], pastBookings: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: typeof bookings = [];
    const past: typeof bookings = [];

    bookings.forEach((booking) => {
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
    const sortByDate = (a: (typeof bookings)[0], b: (typeof bookings)[0]) => {
      const getEarliestDate = (booking: (typeof bookings)[0]) => {
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

    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

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

  if (bookings === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading bookings...</p>
      </div>
    );
  }

  const renderBookingCard = (booking: (typeof bookings)[0]) => {
    if (!booking.trainer || !booking.session) return null;

    // Sort slots by date
    const sortedSlots = [...booking.slots].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    return (
      <Card key={booking._id} className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <TrainerImage
              storageId={booking.trainer.profilePicture}
              width={100}
              height={100}
              alt={booking.trainer.name}
              className="h-24 w-24 rounded-lg object-cover border"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {booking.trainer.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {booking.session.name}
                  </p>
                </div>
                <Badge
                  variant={
                    booking.status === "confirmed"
                      ? "default"
                      : booking.status === "cancelled"
                        ? "destructive"
                        : "secondary"
                  }
                  className="capitalize"
                >
                  {booking.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{booking.session.duration} min sessions</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {booking.slots.length} session
                    {booking.slots.length > 1 ? "s" : ""} booked
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Session Details
            </h3>
            <div className="grid gap-3">
              {sortedSlots.map((slot, index) => {
                const [year, month, day] = slot.date.split("-").map(Number);
                const slotDate = new Date(year, month - 1, day);
                const isPast = slotDate < new Date();
                slotDate.setHours(0, 0, 0, 0);

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 transition-colors ${
                      isPast
                        ? "bg-muted/50 border-muted"
                        : "bg-background border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{formatDate(slotDate)}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime12Hour(slot.startTime)} -{" "}
                            {formatTime12Hour(slot.endTime)}
                          </span>
                        </div>
                      </div>
                      {isPast && (
                        <Badge variant="outline" className="text-xs">
                          Past
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const displayBookings =
    activeTab === "upcoming" ? upcomingBookings : pastBookings;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Bookings</h1>
          <p className="text-muted-foreground">
            Manage and view all your training sessions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="upcoming">
              My Trainings ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Trainings ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    You don't have any upcoming bookings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                {upcomingBookings.map(renderBookingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    You don't have any past bookings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                {pastBookings.map(renderBookingCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
