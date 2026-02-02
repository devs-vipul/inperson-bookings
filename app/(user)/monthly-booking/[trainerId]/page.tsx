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
import { X, Users } from "lucide-react";
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
  duration: number; // 30 or 60
  otherUsers?: Array<{ userId: Id<"users">; userName: string | undefined }>; // Other users who booked this slot
}

export default function MonthlyBookingPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = use(params);
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [slotDurations, setSlotDurations] = useState<{ [key: string]: number }>({}); // Track duration for each slot

  // Mutations
  const createMonthlyBooking = useMutation((api as any).monthlyBookings?.create);

  // Fetch data
  const trainer = useQuery(api.trainers.getById, {
    id: trainerId as Id<"trainers">,
  });
  const availability = useQuery(api.availability.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const existingBookings = useQuery(api.bookings.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const monthlyBookings = useQuery((api as any).monthlyBookings?.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const disabledSlots = useQuery(api.trainerSlots.getByTrainer, {
    trainerId: trainerId as Id<"trainers">,
  });
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Check for active monthly subscription
  const activeMonthlySubscription = useQuery(
    (api as any).monthlySubscriptions?.getActive,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Helper to check if a slot is disabled by admin
  const isSlotDisabled = (
    dateString: string,
    startTime: string,
    endTime: string,
    duration: number
  ): boolean => {
    if (!disabledSlots) return false;

    return disabledSlots.some(
      (slot) =>
        slot.date === dateString &&
        slot.startTime === startTime &&
        slot.endTime === endTime &&
        slot.duration === duration &&
        !slot.isActive
    );
  };

  // Helper to check if a slot is at capacity (5 users) or conflicts with weekly booking
  const isSlotBooked = (
    dateString: string,
    startTime: string,
    endTime: string
  ): { isBooked: boolean; reason: string; capacity?: any } => {
    // Check weekly bookings (these block the slot completely)
    if (existingBookings) {
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const requestedStart = timeToMinutes(startTime);
      const requestedEnd = timeToMinutes(endTime);

      for (const booking of existingBookings) {
        if (booking.status !== "confirmed") continue;

        for (const slot of booking.slots) {
          if (slot.date === dateString) {
            const slotStart = timeToMinutes(slot.startTime);
            const slotEnd = timeToMinutes(slot.endTime);

            if (
              (requestedStart >= slotStart && requestedStart < slotEnd) ||
              (requestedEnd > slotStart && requestedEnd <= slotEnd) ||
              (requestedStart <= slotStart && requestedEnd >= slotEnd)
            ) {
              return { isBooked: true, reason: "Weekly booking conflict" };
            }
          }
        }
      }
    }

    // Check monthly bookings capacity (max 5 users)
    if (monthlyBookings) {
      let count = 0;
      for (const booking of monthlyBookings) {
        if (booking.status !== "confirmed") continue;

        for (const slot of booking.slots) {
          if (
            slot.date === dateString &&
            slot.startTime === startTime &&
            slot.endTime === endTime
          ) {
            count++;
            if (count >= 5) {
              return { isBooked: true, reason: "Slot full (5 users)" };
            }
          }
        }
      }
    }

    return { isBooked: false, reason: "" };
  };

  // Generate available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !availability) return [];

    const dateString = dateToLocalString(selectedDate);
    const dayName = getDayName(dateString);

    const dayAvailability = availability.find(
      (avail) => avail.day === dayName && avail.isActive
    );

    if (!dayAvailability) return [];

    // Generate both 30 and 60 minute slots
    const slots30 = generateTimeSlots(
      dayAvailability.timeSlots.map((slot) => ({
        from: slot.from,
        to: slot.to,
      })),
      30
    );

    const slots60 = generateTimeSlots(
      dayAvailability.timeSlots.map((slot) => ({
        from: slot.from,
        to: slot.to,
      })),
      60
    );

    // Combine and deduplicate (60-min slots might overlap with 30-min)
    const allSlots: Array<TimeSlot & { duration: number }> = [];
    const seen = new Set<string>();

    // Add 30-min slots first
    slots30.forEach((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!seen.has(key)) {
        seen.add(key);
        allSlots.push({
          ...slot,
          duration: 30,
        });
      }
    });

    // Add 60-min slots (they might overlap with 30-min, but we want both options)
    slots60.forEach((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!seen.has(key)) {
        seen.add(key);
        allSlots.push({
          ...slot,
          duration: 60,
        });
      }
    });

    // Mark which slots are booked or disabled
    return allSlots.map((slot) => {
      const bookedCheck = isSlotBooked(dateString, slot.startTime, slot.endTime);
      const disabled = isSlotDisabled(dateString, slot.startTime, slot.endTime, slot.duration);
      
      return {
        ...slot,
        isBooked: bookedCheck.isBooked,
        isDisabled: disabled,
        bookedReason: bookedCheck.reason,
      };
    });
  }, [selectedDate, availability, existingBookings, monthlyBookings, disabledSlots]);

  // Check if date should be disabled in calendar
  const isDateDisabled = (date: Date): boolean => {
    if (!activeMonthlySubscription) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Disable past dates
    if (checkDate < today) {
      return true;
    }

    // Disable dates outside subscription period
    const startDate = new Date(activeMonthlySubscription.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(activeMonthlySubscription.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (checkDate < startDate || checkDate > endDate) {
      return true;
    }

    // Disable if no availability
    if (!availability) return true;

    const dateString = dateToLocalString(date);
    return !isDateAvailable(dateString, availability);
  };

  // Check if a date has any selected slots
  const isDateWithSelectedSlots = (date: Date): boolean => {
    const dateString = dateToLocalString(date);
    return selectedSlots.some((slot) => slot.date === dateString);
  };

  // Handle slot selection
  const handleSlotSelect = async (slot: TimeSlot & { duration: number; isBooked?: boolean; isDisabled?: boolean }) => {
    if (!selectedDate) return;

    const dateString = dateToLocalString(selectedDate);
    const slotKey = `${dateString}-${slot.startTime}-${slot.endTime}`;

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
      // Remove from slotDurations
      setSlotDurations((prev) => {
        const newDurations = { ...prev };
        delete newDurations[slotKey];
        return newDurations;
      });
    } else {
      // Check capacity before adding - calculate from monthlyBookings data
      let slotCount = 0;
      const otherUsers: Array<{ userId: Id<"users">; userName: string | undefined }> = [];
      
      if (monthlyBookings) {
        for (const booking of monthlyBookings) {
          if (booking.status !== "confirmed") continue;
          for (const existingSlot of booking.slots) {
            if (
              existingSlot.date === dateString &&
              existingSlot.startTime === slot.startTime &&
              existingSlot.endTime === slot.endTime
            ) {
              const user = booking.user;
              if (user) {
                slotCount++;
                otherUsers.push({
                  userId: user._id,
                  userName: user.name || user.email || undefined,
                });
              }
              break;
            }
          }
        }
      }

      if (slotCount >= 5) {
        toast({
          variant: "destructive",
          title: "Slot Full",
          description: "This slot is already full (5 users booked).",
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
          duration: slot.duration,
          otherUsers: otherUsers,
        },
      ]);

      // Store duration
      setSlotDurations((prev) => ({
        ...prev,
        [slotKey]: slot.duration,
      }));
    }
  };

  // Remove selected slot
  const removeSlot = (index: number) => {
    setSelectedSlots((prev) => {
      const removed = prev[index];
      const slotKey = `${removed.date}-${removed.startTime}-${removed.endTime}`;
      setSlotDurations((prevDurations) => {
        const newDurations = { ...prevDurations };
        delete newDurations[slotKey];
        return newDurations;
      });
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle booking submission
  const handleBookSessions = async () => {
    if (!convexUser || !trainer || !activeMonthlySubscription) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in and ensure you have an active monthly subscription.",
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

    setIsBooking(true);
    try {
      const bookingId = await createMonthlyBooking({
        monthlySubscriptionId: activeMonthlySubscription._id,
        userId: convexUser._id,
        trainerId: trainerId as Id<"trainers">,
        slots: selectedSlots.map((slot) => ({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
        })),
      });

      toast({
        variant: "default",
        title: "Success",
        description: `Successfully booked ${selectedSlots.length} session${selectedSlots.length > 1 ? "s" : ""}!`,
      });

      // Redirect to confirmation or back to trainers
      router.push(`/booking-confirmation?booking_id=${bookingId}&monthly=true`);
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        variant: "destructive",
        title: "Booking failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create booking. Please try again.",
      });
    } finally {
      setIsBooking(false);
    }
  };

  // Helper to convert time to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Loading state
  if (
    trainer === undefined ||
    availability === undefined ||
    existingBookings === undefined ||
    monthlyBookings === undefined ||
    disabledSlots === undefined ||
    (user && convexUser === undefined) ||
    activeMonthlySubscription === undefined
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Trainer not found</p>
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

  if (!activeMonthlySubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Monthly Subscription Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              You need an active monthly subscription to book sessions.
            </p>
            <Button
              onClick={() => router.push("/monthly-unlock")}
              style={{
                backgroundColor: "#F2D578",
                color: "#000000",
              }}
            >
              Get Monthly Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriptionStart = new Date(activeMonthlySubscription.startDate);
  const subscriptionEnd = new Date(activeMonthlySubscription.endDate);

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

        {/* Subscription Info */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-2" style={{ borderColor: "#F2D578" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "#F2D578" }}>
                    Monthly Subscription Active
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Valid from {subscriptionStart.toLocaleDateString()} to{" "}
                    {subscriptionEnd.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Book unlimited sessions</p>
                  <p className="text-xs text-muted-foreground">Up to 5 users per slot</p>
                </div>
              </div>
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
                Selected Sessions ({selectedSlots.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select time slots from the calendar to book sessions.
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedSlots.map((slot, index) => (
                    <motion.div
                      key={index}
                      className="rounded-lg border-2 p-3"
                      style={{
                        borderColor: "#F2D578",
                        backgroundColor: "rgba(242, 213, 120, 0.1)",
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {formatDate(new Date(slot.date + "T00:00:00"))}
                          </p>
                          <p className="text-xs font-medium" style={{ color: "#F2D578" }}>
                            {slot.displayStart} - {slot.displayEnd} ({slot.duration} min)
                          </p>
                          {/* Show other users who booked this slot */}
                          {slot.otherUsers && slot.otherUsers.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#F2D578]/30">
                              <div className="flex items-center gap-1 mb-1">
                                <Users className="h-3 w-3" style={{ color: "#F2D578" }} />
                                <p className="text-xs font-medium" style={{ color: "#F2D578" }}>
                                  {slot.otherUsers.length} other user{slot.otherUsers.length > 1 ? "s" : ""} booked:
                                </p>
                              </div>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {slot.otherUsers.map((otherUser, idx) => (
                                  <li key={idx}>• {otherUser.userName || "User"}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlot(index)}
                          className="h-8 w-8 hover:bg-destructive/10 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
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
                    const dateString = dateToLocalString(selectedDate!);
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
                              ? slot.bookedReason || "This slot is not available"
                              : undefined
                        }
                      >
                        {slot.displayStart} - {slot.displayEnd}
                        {slot.isDisabled && (
                          <span className="ml-1 text-[10px]">(Disabled)</span>
                        )}
                        {slot.isBooked && (
                          <span className="ml-1 text-[10px]">({slot.bookedReason || "Booked"})</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

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
                disabled={isBooking}
                className="px-12 py-7 text-lg font-bold rounded-lg shadow-xl"
                style={{
                  backgroundColor: !isBooking ? "#F2D578" : undefined,
                  color: !isBooking ? "#000000" : undefined,
                }}
              >
                {isBooking
                  ? "Booking..."
                  : `Book ${selectedSlots.length} Session${selectedSlots.length > 1 ? "s" : ""}`}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
