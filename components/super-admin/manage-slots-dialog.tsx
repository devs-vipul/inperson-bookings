"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  generateTimeSlots,
  getDayName,
  dateToLocalString,
  type TimeSlot,
} from "@/lib/booking-utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ManageSlotsDialogProps {
  trainerId: Id<"trainers">;
  trainerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageSlotsDialog({
  trainerId,
  trainerName,
  open,
  onOpenChange,
}: ManageSlotsDialogProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAllSlots, setShowAllSlots] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30);

  // Fetch data
  const availability = useQuery(api.availability.getByTrainerId, {
    trainerId,
  });
  const existingSlots = useQuery(api.trainerSlots.getByTrainer, {
    trainerId,
  });

  const toggleSlot = useMutation(api.trainerSlots.toggleSlot);
  const toggleAllSlots = useMutation(api.trainerSlots.toggleAllSlotsForDate);

  // Get slots for selected date
  const slotsForDate = useQuery(
    api.trainerSlots.getByTrainerAndDate,
    selectedDate
      ? {
          trainerId,
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

  // Merge generated slots with existing slot overrides
  const allSlots = useMemo(() => {
    if (generatedSlots.length === 0) return [];

    const slotMap = new Map<string, { isActive: boolean }>();
    if (slotsForDate) {
      slotsForDate.forEach((slot) => {
        const key = `${slot.startTime}-${slot.endTime}`;
        slotMap.set(key, { isActive: slot.isActive });
      });
    }

    return generatedSlots.map((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      const override = slotMap.get(key);
      return {
        ...slot,
        isActive: override?.isActive ?? true, // Default to active if no override
        hasOverride: override !== undefined,
      };
    });
  }, [generatedSlots, slotsForDate]);

  // Filter slots based on showAllSlots toggle
  const displayedSlots = useMemo(() => {
    if (showAllSlots) return allSlots;
    return allSlots.filter((slot) => slot.isActive);
  }, [allSlots, showAllSlots]);

  // Statistics
  const stats = useMemo(() => {
    const total = allSlots.length;
    const active = allSlots.filter((s) => s.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
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
        // Skip invalid dates
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
    slot: TimeSlot & { isActive: boolean; hasOverride: boolean },
    isActive: boolean
  ) => {
    if (!selectedDate) return;

    try {
      await toggleSlot({
        trainerId,
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
    }
  };

  // Handle toggle all slots
  const handleToggleAllSlots = async (isActive: boolean) => {
    if (!selectedDate) return;

    try {
      await toggleAllSlots({
        trainerId,
        date: dateToLocalString(selectedDate),
        duration: selectedDuration,
        isActive,
      });

      toast({
        variant: "success",
        title: "Success",
        description: `All ${selectedDuration}-minute slots ${isActive ? "enabled" : "disabled"} successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update slots.",
      });
    }
  };

  // Calendar modifiers
  const calendarModifiers = {
    available: (date: Date) => isDateAvailable(date),
  };

  const calendarModifiersClassNames = {
    available: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-green-500",
  };

  if (availability === undefined || existingSlots === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trainerName} - Admin Calendar
          </DialogTitle>
          <DialogDescription>
            Manage trainer availability and view booking slots
          </DialogDescription>
        </DialogHeader>

        {/* Statistics */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="text-muted-foreground">
                  Total {selectedDuration}min slots:{" "}
                </span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Active slots: </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.active}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Inactive slots: </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {stats.inactive}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setCurrentMonth(newDate);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setCurrentMonth(newDate);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date && isDateAvailable(date)) {
                    setSelectedDate(date);
                  }
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                disabled={(date) => !isDateAvailable(date)}
                modifiers={calendarModifiers}
                modifiersClassNames={calendarModifiersClassNames}
                className="rounded-md border [&_.rdp-day[data-available='true']]:after:content-[''] [&_.rdp-day[data-available='true']]:after:absolute [&_.rdp-day[data-available='true']]:after:bottom-1 [&_.rdp-day[data-available='true']]:after:left-1/2 [&_.rdp-day[data-available='true']]:after:-translate-x-1/2 [&_.rdp-day[data-available='true']]:after:h-1.5 [&_.rdp-day[data-available='true']]:after:w-1.5 [&_.rdp-day[data-available='true']]:after:rounded-full [&_.rdp-day[data-available='true']]:after:bg-green-500"
                components={{
                  DayButton: ({ day, modifiers, ...props }) => {
                    // day is a Date object from react-day-picker
                    try {
                      const dateString = dateToLocalString(day);
                      const isAvailable = getAvailableDates.has(dateString);
                      return (
                        <CalendarDayButton
                          day={day}
                          modifiers={modifiers}
                          data-available={isAvailable}
                          {...props}
                        />
                      );
                    } catch {
                      // Fallback if date is invalid
                      return (
                        <CalendarDayButton
                          day={day}
                          modifiers={modifiers}
                          {...props}
                        />
                      );
                    }
                  },
                }}
              />
              <div className="mt-4 flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Available Days</span>
                </div>
                {selectedDate && (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Selected Date</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Slots */}
          <Card>
            <CardHeader>
              <CardTitle>
                Available Slots -{" "}
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Select Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Duration Tabs */}
                <Tabs
                  value={selectedDuration.toString()}
                  onValueChange={(value) =>
                    setSelectedDuration(value === "30" ? 30 : 60)
                  }
                >
                  <TabsList>
                    <TabsTrigger value="30">30 Min</TabsTrigger>
                    <TabsTrigger value="60">60 Min</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* All Slots Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">All Slots</span>
                  <Switch
                  checked={showAllSlots}
                  onCheckedChange={setShowAllSlots}
                />
                </div>

                {/* Slots List */}
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a date from the calendar to view slots.
                  </p>
                ) : displayedSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No slots available for this date.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {displayedSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3",
                          !slot.isActive && "opacity-50"
                        )}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {slot.displayStart} - {slot.displayEnd}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Duration: {selectedDuration} minutes
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status:{" "}
                            <span
                              className={cn(
                                slot.isActive
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              )}
                            >
                              {slot.isActive ? "Active" : "Inactive"}
                            </span>
                          </p>
                        </div>
                        <Switch
                          checked={slot.isActive}
                          onCheckedChange={(checked) =>
                            handleSlotToggle(slot, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Toggle All Button */}
                {selectedDate && displayedSlots.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      handleToggleAllSlots(
                        displayedSlots.some((s) => !s.isActive)
                      )
                    }
                  >
                    {displayedSlots.some((s) => !s.isActive)
                      ? "Enable All Slots"
                      : "Disable All Slots"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
