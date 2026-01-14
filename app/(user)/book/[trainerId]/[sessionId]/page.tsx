"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainerImage } from "@/components/trainer-image";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateTimeSlots,
  isDateAvailable,
  formatDate,
  getDayName,
  dateToLocalString,
  type TimeSlot,
} from "@/lib/booking-utils";

interface SelectedSlot {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  displayStart: string;
  displayEnd: string;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ trainerId: string; sessionId: string }>;
}) {
  const { trainerId, sessionId } = use(params);
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  // Mutations
  const createBookingWithEmails = useMutation(api.bookings.createWithEmails);

  // Fetch data
  const trainer = useQuery(api.trainers.getById, {
    id: trainerId as Id<"trainers">,
  });
  const sessionData = useQuery(api.sessions.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const availability = useQuery(api.availability.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const existingBookings = useQuery(api.bookings.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const disabledSlots = useQuery(api.trainerSlots.getByTrainer, {
    trainerId: trainerId as Id<"trainers">,
  });
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const createBooking = useMutation(api.bookings.create);

  // Get current session
  const currentSession = sessionData?.find((s) => s._id === sessionId);

  // Helper to check if a slot is disabled by admin
  const isSlotDisabled = (
    dateString: string,
    startTime: string,
    endTime: string
  ): boolean => {
    if (!disabledSlots) return false;

    // Check if there's a disabled slot override for this date/time
    return disabledSlots.some(
      (slot) =>
        slot.date === dateString &&
        slot.startTime === startTime &&
        slot.endTime === endTime &&
        slot.duration === currentSession?.duration &&
        !slot.isActive
    );
  };

  // Helper to check if a slot is booked
  const isSlotBooked = (
    dateString: string,
    startTime: string,
    endTime: string
  ): boolean => {
    if (!existingBookings) return false;

    // Convert times to minutes for comparison
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const requestedStart = timeToMinutes(startTime);
    const requestedEnd = timeToMinutes(endTime);

    // Check all bookings for conflicts
    for (const booking of existingBookings) {
      // Only check confirmed bookings (ignore cancelled)
      if (booking.status !== "confirmed") continue;

      for (const slot of booking.slots) {
        if (slot.date === dateString) {
          const slotStart = timeToMinutes(slot.startTime);
          const slotEnd = timeToMinutes(slot.endTime);

          // Check if times overlap
          if (
            (requestedStart >= slotStart && requestedStart < slotEnd) ||
            (requestedEnd > slotStart && requestedEnd <= slotEnd) ||
            (requestedStart <= slotStart && requestedEnd >= slotEnd)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // Generate available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !availability || !currentSession) return [];

    // Use local date string to avoid timezone issues
    const dateString = dateToLocalString(selectedDate);
    const dayName = getDayName(dateString);

    // Find availability for this day
    const dayAvailability = availability.find(
      (avail) => avail.day === dayName && avail.isActive
    );

    if (!dayAvailability) return [];

    // Generate slots based on session duration
    const allSlots = generateTimeSlots(
      dayAvailability.timeSlots.map((slot) => ({
        from: slot.from,
        to: slot.to,
      })),
      currentSession.duration
    );

    // Mark which slots are booked or disabled
    return allSlots.map((slot) => ({
      ...slot,
      isBooked: isSlotBooked(dateString, slot.startTime, slot.endTime),
      isDisabled: isSlotDisabled(dateString, slot.startTime, slot.endTime),
    }));
  }, [selectedDate, availability, currentSession, existingBookings, disabledSlots]);

  // Check if date should be disabled in calendar
  const isDateDisabled = (date: Date): boolean => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate < today) {
      return true;
    }

    // Disable if no availability
    if (!availability) return true;
    
    // Use local date string to avoid timezone issues
    const dateString = dateToLocalString(date);
    return !isDateAvailable(dateString, availability);
  };

  // Handle slot selection
  const handleSlotSelect = (slot: TimeSlot) => {
    if (!selectedDate || !currentSession) return;

    // Use local date string to avoid timezone issues
    const dateString = dateToLocalString(selectedDate);
    const maxSlots = currentSession.sessionsPerWeek;

    // Check if already selected
    const isSelected = selectedSlots.some(
      (s) =>
        s.date === dateString &&
        s.startTime === slot.startTime &&
        s.endTime === slot.endTime
    );

    if (isSelected) {
      // Deselect
      setSelectedSlots((prev) =>
        prev.filter(
          (s) =>
            !(
              s.date === dateString &&
              s.startTime === slot.startTime &&
              s.endTime === slot.endTime
            )
        )
      );
    } else {
      // Check if max slots reached
      if (selectedSlots.length >= maxSlots) {
        toast({
          variant: "destructive",
          title: "Maximum slots reached",
          description: `You can only select ${maxSlots} session${maxSlots > 1 ? "s" : ""} per week.`,
        });
        return;
      }

      // Add slot
      setSelectedSlots((prev) => [
        ...prev,
        {
          date: dateString,
          startTime: slot.startTime,
          endTime: slot.endTime,
          displayStart: slot.displayStart,
          displayEnd: slot.displayEnd,
        },
      ]);
    }
  };

  // Remove selected slot
  const removeSlot = (index: number) => {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle booking submission - redirect to Stripe checkout or bypass
  const handleBookSessions = async () => {
    if (!convexUser || !currentSession || !trainer) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to book sessions.",
      });
      return;
    }

    if (selectedSlots.length === 0) {
      toast({
        variant: "destructive",
        title: "No slots selected",
        description: "Please select at least one time slot.",
      });
      return;
    }

    if (selectedSlots.length !== currentSession.sessionsPerWeek) {
      toast({
        variant: "destructive",
        title: "Incomplete selection",
        description: `Please select ${currentSession.sessionsPerWeek} session${currentSession.sessionsPerWeek > 1 ? "s" : ""} as required.`,
      });
      return;
    }

    // Check if Stripe bypass is enabled (for testing)
    // This reads from NEXT_PUBLIC_BYPASS_STRIPE environment variable
    const bypassStripe = process.env.NEXT_PUBLIC_BYPASS_STRIPE === "true";

    try {
      if (bypassStripe) {
        // BYPASS MODE: Create booking directly without Stripe payment
        const bookingId = await createBookingWithEmails({
          userId: convexUser._id,
          trainerId: trainerId as Id<"trainers">,
          sessionId: sessionId as Id<"sessions">,
          slots: selectedSlots.map((slot) => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        });

        // Redirect to confirmation page
        router.push(`/booking-confirmation?booking_id=${bookingId}&bypass=true`);
      } else {
        // NORMAL MODE: Redirect to Stripe checkout for payment
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trainerId,
            sessionId,
            slots: selectedSlots.map((slot) => ({
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
            })),
            price: currentSession.price,
            sessionsPerWeek: currentSession.sessionsPerWeek,
            duration: currentSession.duration,
            trainerName: trainer.name,
            sessionName: currentSession.name,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create checkout session");
        }

        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL received");
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: bypassStripe ? "Booking failed" : "Payment setup failed",
        description:
          error instanceof Error
            ? error.message
            : bypassStripe
            ? "Failed to create booking. Please try again."
            : "Failed to initiate payment. Please try again.",
      });
    }
  };

  // Loading state
  if (
    trainer === undefined ||
    sessionData === undefined ||
    availability === undefined ||
    existingBookings === undefined ||
    disabledSlots === undefined ||
    (user && convexUser === undefined)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!trainer || !currentSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Trainer or session not found</p>
      </div>
    );
  }

  if (!user || !convexUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Please sign in to book sessions.</p>
      </div>
    );
  }

  const maxSlots = currentSession.sessionsPerWeek;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Trainer Info Section */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Trainer Image & Info */}
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <TrainerImage
                  storageId={trainer.profilePicture}
                  width={200}
                  height={250}
                  alt={trainer.name}
                  className="mb-4 h-[250px] w-[200px] rounded-lg object-cover"
                />
                <h2 className="text-xl font-bold">{trainer.name}</h2>
                {trainer.expertise && trainer.expertise.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold">Expertise</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {trainer.expertise.map((exp) => (
                        <li key={exp}>- {exp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trainer Description */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Trainer Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {trainer.description ||
                  "No description available for this trainer."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Booking Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Selected Sessions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Selected Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select {maxSlots} session{maxSlots > 1 ? "s" : ""} from the
                  calendar.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatDate(new Date(slot.date + "T00:00:00"))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.displayStart} - {slot.displayEnd}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlot(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {selectedSlots.length === maxSlots && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      All sessions selected
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Select Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Available Times */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Available Times</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">
                  Select a date from the calendar to see available times.
                </p>
              ) : availableTimeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No available time slots for this date.
                </p>
              ) : (
                <div className="grid max-h-[400px] grid-cols-2 gap-2 overflow-y-auto">
                  {availableTimeSlots.map((slot, index) => {
                    const dateString = dateToLocalString(selectedDate);
                    const isSelected = selectedSlots.some(
                      (s) =>
                        s.date === dateString &&
                        s.startTime === slot.startTime &&
                        s.endTime === slot.endTime
                    );

                    return (
                      <Button
                        key={index}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSlotSelect(slot)}
                        disabled={slot.isBooked || slot.isDisabled}
                        className={cn(
                          "text-xs",
                          (slot.isBooked || slot.isDisabled) &&
                            "cursor-not-allowed opacity-50 hover:bg-muted"
                        )}
                        title={
                          slot.isDisabled
                            ? "This slot has been disabled"
                            : slot.isBooked
                              ? "This slot is already booked"
                              : undefined
                        }
                      >
                        {slot.displayStart} - {slot.displayEnd}
                        {slot.isDisabled && (
                          <span className="ml-1 text-[10px]">(Disabled)</span>
                        )}
                        {slot.isBooked && (
                          <span className="ml-1 text-[10px]">(Booked)</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Book Button */}
        {selectedSlots.length > 0 && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleBookSessions}
              size="lg"
              disabled={selectedSlots.length !== maxSlots}
            >
              Book {selectedSlots.length} Session
              {selectedSlots.length > 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
