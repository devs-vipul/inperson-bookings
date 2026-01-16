"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function TrainerBookingsPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = use(params);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");

  const trainer = useQuery(api.trainers.getById, {
    id: trainerId as Id<"trainers">,
  });

  const bookings = useQuery(api.bookings.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });

  if (trainer === undefined || bookings === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (trainer === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Trainer not found</p>
      </div>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings?.filter((booking) =>
    booking.slots.some((slot) => new Date(slot.date) >= now)
  ) || [];
  const pastBookings = bookings?.filter((booking) =>
    booking.slots.every((slot) => new Date(slot.date) < now)
  ) || [];

  const displayBookings = activeTab === "upcoming" 
    ? upcomingBookings 
    : activeTab === "past" 
    ? pastBookings 
    : bookings || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-2"
          style={{ borderColor: "#F2D578", color: "#F2D578" }}
        >
          <Link href={`/super-admin/manage-trainer/trainers/${trainerId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#F2D578" }}>
            {trainer.name} (Lead Trainer)'s Bookings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage training sessions and bookings
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full md:w-fit grid grid-cols-3 border-b-2" style={{ borderColor: "#F2D578" }}>
        <button
          onClick={() => setActiveTab("upcoming")}
          style={{
            backgroundColor: activeTab === "upcoming" ? "#F2D578" : "#000000",
            color: activeTab === "upcoming" ? "#000000" : "#F2D578",
            border: "2px solid #F2D578",
          }}
          className="py-3 px-6 text-base font-bold transition-all"
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab("past")}
          style={{
            backgroundColor: activeTab === "past" ? "#F2D578" : "#000000",
            color: activeTab === "past" ? "#000000" : "#F2D578",
            border: "2px solid #F2D578",
          }}
          className="py-3 px-6 text-base font-bold transition-all"
        >
          Past
        </button>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            backgroundColor: activeTab === "all" ? "#F2D578" : "#000000",
            color: activeTab === "all" ? "#000000" : "#F2D578",
            border: "2px solid #F2D578",
          }}
          className="py-3 px-6 text-base font-bold transition-all"
        >
          All Bookings
        </button>
      </div>

      {/* Bookings Table */}
      <Card className="border-2" style={{ borderColor: "#F2D578" }}>
        <CardContent className="p-6">
          {displayBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No bookings found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: "#F2D578" }}>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>ID</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>User</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Email</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Date</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Time</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Duration</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBookings.map((booking, index) => {
                    return booking.slots.map((slot, slotIndex) => (
                      <tr
                        key={`${booking._id}-${slotIndex}`}
                        className="border-b hover:bg-muted/50 transition-all"
                        style={{ borderColor: "rgba(242, 213, 120, 0.2)" }}
                      >
                        <td className="p-4 font-medium">
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          {booking.user?.name || "N/A"}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {booking.user?.email || "N/A"}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {format(new Date(slot.date), "MMM dd, yyyy")}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {slot.startTime} - {slot.endTime}
                        </td>
                        <td className="p-4">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-bold"
                            style={{
                              backgroundColor: "rgba(242, 213, 120, 0.2)",
                              color: "#F2D578",
                              border: "1px solid #F2D578",
                            }}
                          >
                            {booking.session?.duration || "30"} min
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${
                                booking.status === "confirmed"
                                  ? "bg-green-500/20 text-green-500"
                                  : booking.status === "paused"
                                  ? "bg-yellow-500/20 text-yellow-500"
                                  : "bg-red-500/20 text-red-500"
                              }`}
                            >
                              {booking.status}
                            </span>
                            {booking.isAdvancedBooking && (
                              <span
                                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-bold border"
                                style={{
                                  backgroundColor: "rgba(147, 51, 234, 0.2)",
                                  color: "#a78bfa",
                                  borderColor: "#a78bfa",
                                }}
                              >
                                🔄 Sub
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
