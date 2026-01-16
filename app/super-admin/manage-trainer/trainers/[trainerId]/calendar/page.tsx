"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  generateTimeSlots,
  getDayName,
  dateToLocalString,
  type TimeSlot,
} from "@/lib/booking-utils";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TrainerCalendarPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = use(params);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAllSlots, setShowAllSlots] = useState(true); // For filtering display
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30);
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null);
  const [isTogglingAll, setIsTogglingAll] = useState(false);

  // Fetch data
  const trainer = useQuery(api.trainers.getById, {
    id: trainerId as Id<"trainers">,
  });
  const availability = useQuery(api.availability.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const existingSlots = useQuery(api.trainerSlots.getByTrainer, {
    trainerId: trainerId as Id<"trainers">,
  });
  const existingBookings = useQuery(api.bookings.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });

  const toggleSlot = useMutation(api.trainerSlots.toggleSlot);
  const setSlotsForDate = useMutation(api.trainerSlots.setSlotsForDate);

  // Get slots for selected date
  const slotsForDate = useQuery(
    api.trainerSlots.getByTrainerAndDate,
    selectedDate
      ? {
          trainerId: trainerId as Id<"trainers">,
          date: dateToLocalString(selectedDate),
          duration: selectedDuration,
        }
      : "skip"
  );

  // Generate available slots from availability
  const generatedSlots = useMemo(() => {
    if (!selectedDate || !availability) return [];

    try {
      const dateString = dateToLocalString(selectedDate);
      const dayName = getDayName(dateString);

      const dayAvailability = availability.find(
        (avail) => avail.day === dayName && avail.isActive
      );

      if (!dayAvailability) return [];

      return generateTimeSlots(
        dayAvailability.timeSlots.map((slot) => ({
          from: slot.from,
          to: slot.to,
        })),
        selectedDuration
      );
    } catch {
      return [];
    }
  }, [selectedDate, availability, selectedDuration]);

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

  // Merge generated slots with existing slot overrides and booking status
  const allSlots = useMemo(() => {
    if (generatedSlots.length === 0) return [];

    const slotMap = new Map<string, { isActive: boolean }>();
    if (slotsForDate) {
      slotsForDate.forEach((slot) => {
        const key = `${slot.startTime}-${slot.endTime}`;
        slotMap.set(key, { isActive: slot.isActive });
      });
    }

    if (!selectedDate) return [];

    const dateString = dateToLocalString(selectedDate);

    return generatedSlots.map((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      const override = slotMap.get(key);
      const isBooked = isSlotBooked(dateString, slot.startTime, slot.endTime);
      
      return {
        ...slot,
        isActive: override?.isActive ?? true, // Default to active if no override
        hasOverride: override !== undefined,
        isBooked,
      };
    });
  }, [generatedSlots, slotsForDate, selectedDate, existingBookings]);

  // Determine if all slots are currently active (excluding booked slots)
  const allSlotsActive = useMemo(() => {
    if (allSlots.length === 0) return true;
    const nonBookedSlots = allSlots.filter((slot) => !slot.isBooked);
    if (nonBookedSlots.length === 0) return true; // All slots are booked
    return nonBookedSlots.every((slot) => slot.isActive);
  }, [allSlots]);

  // Filter slots based on showAllSlots toggle (for display only)
  const displayedSlots = useMemo(() => {
    if (showAllSlots) return allSlots;
    return allSlots.filter((slot) => slot.isActive);
  }, [allSlots, showAllSlots]);

  // Statistics
  const stats = useMemo(() => {
    const total = allSlots.length;
    const booked = allSlots.filter((s) => s.isBooked).length;
    const active = allSlots.filter((s) => s.isActive && !s.isBooked).length;
    const inactive = total - active - booked;
    return { total, active, inactive, booked };
  }, [allSlots]);

  // Get available dates for calendar
  const getAvailableDates = useMemo(() => {
    if (!availability) return new Set<string>();

    const dates = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate dates for next 3 months
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      try {
        const dateString = dateToLocalString(date);
        const dayName = getDayName(dateString);

        const dayAvailability = availability.find(
          (avail) => avail.day === dayName && avail.isActive
        );

        if (dayAvailability) {
          dates.add(dateString);
        }
      } catch {
        continue;
      }
    }

    return dates;
  }, [availability]);

  // Check if date is available
  const isDateAvailable = (date: Date): boolean => {
    try {
      const dateString = dateToLocalString(date);
      return getAvailableDates.has(dateString);
    } catch {
      return false;
    }
  };

  // Handle slot toggle
  const handleSlotToggle = async (
    slot: TimeSlot & { isActive: boolean; hasOverride: boolean; isBooked?: boolean },
    isActive: boolean
  ) => {
    if (!selectedDate || slot.isBooked) return;

    const slotId = `${slot.startTime}-${slot.endTime}-${selectedDuration}`;
    setTogglingSlotId(slotId);
    try {
      await toggleSlot({
        trainerId: trainerId as Id<"trainers">,
        date: dateToLocalString(selectedDate),
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: selectedDuration,
        isActive,
      });

      toast({
        variant: "success",
        title: "Success",
        description: `Slot ${isActive ? "enabled" : "disabled"} successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update slot status.",
      });
    } finally {
      setTogglingSlotId(null);
    }
  };

  // Handle toggle all slots for the selected date and duration
  const handleToggleAllSlots = async (isActive: boolean) => {
    if (!selectedDate || generatedSlots.length === 0) return;

    setIsTogglingAll(true);
    try {
      const dateString = dateToLocalString(selectedDate);
      
      // Only update non-booked slots
      const nonBookedSlots = generatedSlots.filter(
        (slot) => !isSlotBooked(dateString, slot.startTime, slot.endTime)
      );

      if (nonBookedSlots.length === 0) {
        toast({
          variant: "default",
          title: "No slots to update",
          description: "All slots for this date are booked and cannot be toggled.",
        });
        return;
      }
      
      // Create/update all non-booked slots for this date and duration
      await setSlotsForDate({
        trainerId: trainerId as Id<"trainers">,
        date: dateString,
        slots: nonBookedSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: selectedDuration,
          isActive,
        })),
      });

      toast({
        variant: "success",
        title: "Success",
        description: `${nonBookedSlots.length} ${selectedDuration}-minute slot${nonBookedSlots.length !== 1 ? "s" : ""} ${isActive ? "enabled" : "disabled"} successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update all slots.",
      });
    } finally {
      setIsTogglingAll(false);
    }
  };

  // Calendar modifiers - removed green dot indicator as requested

  if (
    trainer === undefined ||
    availability === undefined ||
    existingSlots === undefined ||
    existingBookings === undefined
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <motion.div
          className="mb-6 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hover:bg-[#F2D578]/20"
            >
              <Link href={`/super-admin/manage-trainer/trainers/${trainerId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "#F2D578" }}
              >
                {trainer.name} - Manage Slots
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage trainer availability and view booking slots
              </p>
            </div>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-2" style={{ borderColor: "#F2D578" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#F2D578" }}>
                    Total {selectedDuration}min slots
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-full p-3" style={{ backgroundColor: "rgba(242, 213, 120, 0.1)" }}>
                  <Clock className="h-5 w-5" style={{ color: "#F2D578" }} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-500">Active slots</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.active}
                  </p>
                </div>
                <div className="rounded-full bg-green-500/10 p-3">
                  <div className="h-5 w-5 rounded-full bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-500">Inactive slots</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.inactive}
                  </p>
                </div>
                <div className="rounded-full bg-red-500/10 p-3">
                  <div className="h-5 w-5 rounded-full bg-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-500">Booked slots</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.booked}
                  </p>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <div className="h-5 w-5 rounded-full bg-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Calendar */}
          <Card className="border-2" style={{ borderColor: "#F2D578" }}>
            <CardHeader>
              <CardTitle
                className="border-b-2 pb-3"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date && isDateAvailable(date)) {
                    setSelectedDate(date);
                  }
                }}
                disabled={(date) => !isDateAvailable(date)}
                className="rounded-md w-full"
              />
            </CardContent>
          </Card>

          {/* Slots */}
          <Card className="border-2" style={{ borderColor: "#F2D578" }}>
            <CardHeader>
              <CardTitle
                className="border-b-2 pb-3"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Manage Slots
                {selectedDate && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - {selectedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Duration Tabs - Custom Styled */}
                <div className="border-b-2 pb-4" style={{ borderColor: "#F2D578" }}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDuration(30)}
                      className="flex-1 px-4 py-2 text-sm font-medium rounded-md border-2 transition-all"
                      style={{
                        borderColor: "#F2D578",
                        backgroundColor: selectedDuration === 30 ? "#F2D578" : "black",
                        color: selectedDuration === 30 ? "black" : "#F2D578",
                      }}
                    >
                      30 Min Sessions
                    </button>
                    <button
                      onClick={() => setSelectedDuration(60)}
                      className="flex-1 px-4 py-2 text-sm font-medium rounded-md border-2 transition-all"
                      style={{
                        borderColor: "#F2D578",
                        backgroundColor: selectedDuration === 60 ? "#F2D578" : "black",
                        color: selectedDuration === 60 ? "black" : "#F2D578",
                      }}
                    >
                      60 Min Sessions
                    </button>
                  </div>
                </div>

                {/* All Slots Toggle */}
                <div
                  className="flex items-center justify-between rounded-lg border-2 p-4"
                  style={{
                    borderColor: "#F2D578",
                    backgroundColor: "rgba(242, 213, 120, 0.05)",
                  }}
                >
                  <div>
                    <span className="text-sm font-bold" style={{ color: "#F2D578" }}>
                      Toggle All Slots
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {allSlotsActive
                        ? "All slots are enabled for this date"
                        : `${stats.inactive} slot${stats.inactive !== 1 ? "s" : ""} disabled`}
                    </p>
                  </div>
                  <Switch
                    checked={allSlotsActive}
                    onCheckedChange={handleToggleAllSlots}
                    disabled={!selectedDate || generatedSlots.length === 0 || isTogglingAll}
                  />
                </div>

                {/* Slots List */}
                {!selectedDate ? (
                  <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: "#F2D578" }}>
                    <p className="text-sm font-medium" style={{ color: "#F2D578" }}>
                      Select a date from the calendar to view slots.
                    </p>
                  </div>
                ) : displayedSlots.length === 0 ? (
                  <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: "#F2D578" }}>
                    <p className="text-sm font-medium text-muted-foreground">
                      No slots available for this date.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {displayedSlots.map((slot, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={cn(
                          "group flex items-center justify-between rounded-lg border-2 p-4 transition-all",
                          slot.isBooked
                            ? "opacity-70 bg-blue-500/5 border-blue-500 cursor-not-allowed"
                            : slot.isActive
                              ? "bg-green-500/5 border-green-500 hover:shadow-lg hover:scale-[1.02]"
                              : "opacity-70 bg-red-500/5 border-red-500"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold">
                              {slot.displayStart} - {slot.displayEnd}
                            </p>
                            {!slot.isBooked && (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border-2",
                                  slot.isActive
                                    ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500"
                                    : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500"
                                )}
                              >
                                {slot.isActive ? "Active" : "Inactive"}
                              </span>
                            )}
                            {slot.isBooked && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500">
                                Booked
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-medium text-muted-foreground">
                            Duration: {selectedDuration} minutes
                          </p>
                        </div>
                        <Switch
                          checked={slot.isActive}
                          onCheckedChange={(checked) =>
                            handleSlotToggle(slot, checked)
                          }
                          disabled={slot.isBooked || togglingSlotId === `${slot.startTime}-${slot.endTime}-${selectedDuration}`}
                          className="ml-4"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
