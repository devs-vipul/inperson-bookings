"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/booking-utils";
import { TrainerImage } from "@/components/trainer-image";

export default function YourBookingsPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const bookings = useQuery(
    api.bookings.getByUserId,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

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
        <p className="text-destructive">Please sign in to view your bookings.</p>
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

  // Format time for display
  const formatTime = (time24h: string): string => {
    const [hours, minutes] = time24h.split(":").map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Your Bookings</h1>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                You don't have any bookings yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              if (!booking.trainer || !booking.session) return null;

              return (
                <Card key={booking._id}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <TrainerImage
                        storageId={booking.trainer.profilePicture}
                        width={80}
                        height={80}
                        alt={booking.trainer.name}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <div>
                        <CardTitle>{booking.trainer.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {booking.session.name} - {booking.session.duration}{" "}
                          minutes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status:{" "}
                          <span className="capitalize">{booking.status}</span>
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h3 className="font-semibold">Booked Sessions:</h3>
                      {booking.slots.map((slot, index) => {
                        // Parse date in local timezone
                        const [year, month, day] = slot.date.split("-").map(Number);
                        const slotDate = new Date(year, month - 1, day);
                        return (
                          <div
                            key={index}
                            className="rounded-lg border p-3"
                          >
                            <p className="font-medium">
                              {formatDate(slotDate)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(slot.startTime)} -{" "}
                              {formatTime(slot.endTime)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
