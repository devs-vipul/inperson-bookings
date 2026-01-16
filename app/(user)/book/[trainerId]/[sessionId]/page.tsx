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
import { motion } from "framer-motion";
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
  const createAdvancedBooking = useMutation(api.bookings.createAdvancedBooking);

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

  // Check for active subscription
  const activeSubscription = useQuery(
    api.subscriptions.getActiveSubscription,
    convexUser && sessionId
      ? {
          userId: convexUser._id,
          trainerId: trainerId as Id<"trainers">,
          sessionId: sessionId as Id<"sessions">,
        }
      : "skip"
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
      // Only check confirmed bookings (ignore cancelled and paused)
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

  // Check if a date has any selected slots
  const isDateWithSelectedSlots = (date: Date): boolean => {
    const dateString = dateToLocalString(date);
    return selectedSlots.some((slot) => slot.date === dateString);
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
      // ADVANCED BOOKING MODE: If user has active subscription, book without payment
      if (activeSubscription && activeSubscription.status === "active") {
        // Validate advance booking limit: 20 days ahead (current week + 2 advance weeks)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxBookingDate = new Date(today);
        maxBookingDate.setDate(today.getDate() + 20); // 20 days ahead
        
        const allSlotsWithinLimit = selectedSlots.every((slot) => {
          const slotDate = new Date(slot.date + "T00:00:00");
          return slotDate <= maxBookingDate;
        });

        if (!allSlotsWithinLimit) {
          toast({
            variant: "destructive",
            title: "Booking limit exceeded",
            description: "You can only book up to 3 weeks in advance with your subscription (current week + 2 advance weeks).",
          });
          return;
        }

        // Create advanced booking
        const bookingId = await createAdvancedBooking({
          userId: convexUser._id,
          trainerId: trainerId as Id<"trainers">,
          sessionId: sessionId as Id<"sessions">,
          subscriptionId: activeSubscription._id,
          slots: selectedSlots.map((slot) => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        });

        // Redirect to confirmation page
        router.push(`/booking-confirmation?booking_id=${bookingId}&advanced=true`);
      } else if (activeSubscription && activeSubscription.status === "past_due") {
        // Subscription payment failed - don't allow new bookings
        toast({
          variant: "destructive",
          title: "Payment Required",
          description: "Your subscription payment failed. Please update your payment method to continue booking. Your existing bookings are preserved.",
        });
        return;
      } else if (bypassStripe) {
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
        <motion.div
          className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Trainer Image & Info */}
          <Card
            className="md:col-span-1 border-2"
            style={{ borderColor: "#F2D578" }}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div
                  className="mb-4 rounded-xl border-4 p-2"
                  style={{ borderColor: "#F2D578" }}
                >
                  <TrainerImage
                    storageId={trainer.profilePicture}
                    width={200}
                    height={250}
                    alt={trainer.name}
                    className="h-[250px] w-[200px] rounded-lg object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {trainer.name}
                </h2>
                {trainer.expertise && trainer.expertise.length > 0 && (
                  <div className="mt-4 w-full">
                    <p
                      className="text-sm font-bold border-b-2 pb-2 mb-3"
                      style={{ borderColor: "#F2D578", color: "#F2D578" }}
                    >
                      Expertise
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {trainer.expertise.map((exp) => (
                        <li key={exp} className="flex items-start gap-2">
                          <span
                            className="font-bold text-lg"
                            style={{ color: "#F2D578" }}
                          >
                            •
                          </span>
                          <span>{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trainer Description */}
          <Card
            className="md:col-span-2 border-2"
            style={{ borderColor: "#F2D578" }}
          >
            <CardHeader>
              <CardTitle
                className="text-2xl border-b-2 pb-3"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Trainer Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                {trainer.description ||
                  "No description available for this trainer."}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Section */}
        <motion.div
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Selected Sessions */}
          <Card className="lg:col-span-1 border-2" style={{ borderColor: "#F2D578" }}>
            <CardHeader>
              <CardTitle
                className="border-b-2 pb-3"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Selected Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select {maxSlots} session{maxSlots > 1 ? "s" : ""} from the
                  calendar.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedSlots.map((slot, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center justify-between rounded-lg border-2 p-3"
                      style={{
                        borderColor: "#F2D578",
                        backgroundColor: "rgba(242, 213, 120, 0.1)",
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {formatDate(new Date(slot.date + "T00:00:00"))}
                        </p>
                        <p className="text-xs font-medium" style={{ color: "#F2D578" }}>
                          {slot.displayStart} - {slot.displayEnd}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlot(index)}
                        className="h-8 w-8 hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                  {selectedSlots.length === maxSlots ? (
                    <p
                      className="mt-2 text-sm font-bold text-center py-2 rounded-md"
                      style={{
                        backgroundColor: "#F2D578",
                        color: "#000000",
                      }}
                    >
                      All sessions selected ✓
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-center text-muted-foreground">
                      {maxSlots - selectedSlots.length} session
                      {maxSlots - selectedSlots.length > 1 ? "s" : ""} left
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="lg:col-span-1 border-2" style={{ borderColor: "#F2D578" }}>
            <CardHeader>
              <CardTitle
                className="border-b-2 pb-3"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Select Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                modifiers={{
                  hasSlots: isDateWithSelectedSlots,
                }}
                className="rounded-md w-full"
              />
            </CardContent>
          </Card>

          {/* Available Times */}
          <Card className="lg:col-span-1 border-2" style={{ borderColor: "#F2D578" }}>
            <CardHeader>
              <CardTitle
                className="border-b-2 pb-3"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Available Times
              </CardTitle>
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
                <div className="grid max-h-[400px] grid-cols-2 gap-2 overflow-y-auto pr-2">
                  {availableTimeSlots.map((slot, index) => {
                    const dateString = dateToLocalString(selectedDate);
                    const isSelected = selectedSlots.some(
                      (s) =>
                        s.date === dateString &&
                        s.startTime === slot.startTime &&
                        s.endTime === slot.endTime
                    );

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={slot.isBooked || slot.isDisabled}
                        className={cn(
                          "rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all",
                          (slot.isBooked || slot.isDisabled) &&
                            "cursor-not-allowed opacity-50"
                        )}
                        style={{
                          borderColor: "#F2D578",
                          backgroundColor: isSelected ? "#F2D578" : "transparent",
                          color: isSelected ? "#000000" : "white",
                        }}
                        whileHover={
                          !slot.isBooked && !slot.isDisabled
                            ? { scale: 1.05 }
                            : {}
                        }
                        whileTap={
                          !slot.isBooked && !slot.isDisabled
                            ? { scale: 0.95 }
                            : {}
                        }
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
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Status Card */}
        {activeSubscription && (
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card 
              className="border-2" 
              style={{ 
                borderColor: activeSubscription.status === "past_due" ? "#FF6B6B" : "#F2D578", 
                backgroundColor: activeSubscription.status === "past_due" ? "rgba(255, 107, 107, 0.05)" : "rgba(242, 213, 120, 0.05)" 
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <motion.div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: activeSubscription.status === "past_due" ? "#FF6B6B" : "#F2D578" }}
                      animate={activeSubscription.status === "past_due" ? { scale: [1, 1.05, 1] } : { scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-2xl">{activeSubscription.status === "past_due" ? "!" : "✓"}</span>
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <h3 
                      className="text-lg font-bold mb-2" 
                      style={{ color: activeSubscription.status === "past_due" ? "#FF6B6B" : "#F2D578" }}
                    >
                      {activeSubscription.status === "past_due" ? "Payment Issue" : "Active Subscription"}
                    </h3>
                    <div className="space-y-2 text-sm">
                      {activeSubscription.status === "past_due" ? (
                        <div className="p-3 rounded-lg border border-red-500 bg-red-500/10 mb-3">
                          <p className="text-red-400 font-medium mb-2">
                            ⚠️ Your subscription payment failed
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Stripe is attempting to process your payment. Your existing bookings are safe, but you cannot book new sessions until payment is successful.
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          You have an active subscription for <span className="font-semibold text-white">{activeSubscription.session?.name}</span>
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="p-3 rounded-lg border" style={{ borderColor: "#F2D578", backgroundColor: "rgba(242, 213, 120, 0.1)" }}>
                          <p className="text-xs text-muted-foreground mb-1">Sessions per Week</p>
                          <p className="text-xl font-bold" style={{ color: "#F2D578" }}>
                            {activeSubscription.sessionsPerWeek}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border" style={{ borderColor: "#F2D578", backgroundColor: "rgba(242, 213, 120, 0.1)" }}>
                          <p className="text-xs text-muted-foreground mb-1">Booked This Period</p>
                          <p className="text-xl font-bold" style={{ color: "#F2D578" }}>
                            {activeSubscription.bookedSlotsInPeriod || 0}
                          </p>
                        </div>
                      </div>
                      {(activeSubscription.bookedSlotsInPeriod || 0) < activeSubscription.sessionsPerWeek && (
                        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(242, 213, 120, 0.15)" }}>
                          <p className="text-sm font-medium" style={{ color: "#F2D578" }}>
                            🎉 You can book {activeSubscription.sessionsPerWeek - (activeSubscription.bookedSlotsInPeriod || 0)} more session{activeSubscription.sessionsPerWeek - (activeSubscription.bookedSlotsInPeriod || 0) > 1 ? "s" : ""} this week without payment!
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Book up to 3 weeks ahead (current + 2 advance weeks)
                          </p>
                        </div>
                      )}
                      {(activeSubscription.bookedSlotsInPeriod || 0) >= activeSubscription.sessionsPerWeek && (
                        <div className="mt-3 p-3 rounded-lg border border-orange-500" style={{ backgroundColor: "rgba(255, 165, 0, 0.1)" }}>
                          <p className="text-sm font-medium text-orange-400">
                            ⚠️ You've used all {activeSubscription.sessionsPerWeek} sessions for this calendar week
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            You can book for next week! (Week resets every Monday)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Book Button */}
        {selectedSlots.length > 0 && (
          <motion.div
            className="mt-8 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleBookSessions}
                size="lg"
                disabled={selectedSlots.length !== maxSlots}
                className="px-12 py-7 text-lg font-bold rounded-lg shadow-xl"
                style={{
                  backgroundColor: selectedSlots.length === maxSlots ? "#F2D578" : undefined,
                  color: selectedSlots.length === maxSlots ? "#000000" : undefined,
                }}
              >
                {activeSubscription ? "Book with Subscription" : `Book ${selectedSlots.length} Session${selectedSlots.length > 1 ? "s" : ""}`}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
