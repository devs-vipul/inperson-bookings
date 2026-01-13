"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnTimePicker } from "@/components/ui/column-time-picker";
import { useToast } from "@/components/ui/use-toast";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface TimeSlot {
  from: string; // 24-hour format "HH:MM"
  to: string; // 24-hour format "HH:MM"
}

interface DayAvailability {
  day: string;
  timeSlots: TimeSlot[];
}

interface EditAvailabilityDialogProps {
  trainerId: Id<"trainers">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAvailabilityDialog({
  trainerId,
  open,
  onOpenChange,
}: EditAvailabilityDialogProps) {
  const { toast } = useToast();
  const existingAvailability = useQuery(api.availability.getByTrainerId, {
    trainerId,
  });
  const setAvailability = useMutation(api.availability.setAvailability);

  const [daySections, setDaySections] = useState<DayAvailability[]>([]);

  // Initialize from existing data whenever dialog opens
  useEffect(() => {
    if (existingAvailability && existingAvailability.length > 0 && open) {
      const sections = existingAvailability.map((avail) => ({
        day: avail.day,
        timeSlots: avail.timeSlots.map((slot) => ({
          from: slot.from,
          to: slot.to,
        })),
      }));
      setDaySections(sections);
      return;
    }

    if (open) {
      // Start with empty state - no preset
      setDaySections([]);
    }
  }, [existingAvailability, open]);

  const availableDays = useMemo(() => {
    const selectedDays = new Set(
      daySections.map((section) => section.day).filter(Boolean)
    );
    return DAYS.filter((day) => !selectedDays.has(day));
  }, [daySections]);

  const addDaySection = () => {
    if (availableDays.length === 0) {
      toast({
        variant: "destructive",
        title: "No days available",
        description: "All days have been added. Remove a day to add another.",
      });
      return;
    }
    setDaySections([
      ...daySections,
      {
        day: "", // No preset - user must select
        timeSlots: [{ from: "", to: "" }], // No preset times
      },
    ]);
  };

  const removeDaySection = (index: number) => {
    setDaySections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDay = (index: number, newDay: string) => {
    setDaySections((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        day: newDay,
      };
      return updated;
    });
  };

  const addTimeSlot = (dayIndex: number) => {
    setDaySections((prev) => {
      const updated = [...prev];
      const day = updated[dayIndex];
      updated[dayIndex] = {
        ...day,
        timeSlots: [...day.timeSlots, { from: "", to: "" }],
      };
      return updated;
    });
  };

  const removeTimeSlot = (dayIndex: number, timeSlotIndex: number) => {
    setDaySections((prev) => {
      const updated = [...prev];
      const day = updated[dayIndex];

      if (day.timeSlots.length <= 1) return prev;

      updated[dayIndex] = {
        ...day,
        timeSlots: day.timeSlots.filter((_, i) => i !== timeSlotIndex),
      };

      return updated;
    });
  };

  const updateTimeSlot = (
    dayIndex: number,
    timeSlotIndex: number,
    field: "from" | "to",
    value: string
  ) => {
    setDaySections((prev) => {
      const updated = [...prev];
      const day = updated[dayIndex];
      const slots = [...day.timeSlots];

      slots[timeSlotIndex] = {
        ...slots[timeSlotIndex],
        [field]: value,
      };

      updated[dayIndex] = {
        ...day,
        timeSlots: slots,
      };

      return updated;
    });
  };

  const handleSubmit = async () => {
    // Validate that all sections have a day selected
    for (const section of daySections) {
      if (!section.day) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please select a day for all sections.",
        });
        return;
      }
    }

    // Validate time slots
    for (const section of daySections) {
      for (const slot of section.timeSlots) {
        if (!slot.from || !slot.to) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: `Please fill in all time slots for ${section.day}.`,
          });
          return;
        }
        // Check if from time is before to time
        const fromMinutes = timeToMinutes(slot.from);
        const toMinutes = timeToMinutes(slot.to);
        if (fromMinutes >= toMinutes) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: `"From" time must be before "To" time for ${section.day}.`,
          });
          return;
        }
      }
    }

    try {
      await setAvailability({
        trainerId,
        availability: daySections.map((section) => ({
          day: section.day,
          timeSlots: section.timeSlots,
          isActive: true,
        })),
      });

      toast({
        variant: "success",
        title: "Success",
        description: "Availability updated successfully!",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update availability.",
      });
    }
  };

  const timeToMinutes = (time24h: string): number => {
    const [hours, minutes] = time24h.split(":").map(Number);
    return hours * 60 + minutes;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Availability</DialogTitle>
          <DialogDescription>
            Set the days and time slots when this trainer is available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {daySections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No availability days added yet.</p>
              <p className="text-xs mt-1">Click "Add More" to get started.</p>
            </div>
          )}
          {daySections.map((section, dayIndex) => (
            <div
              key={dayIndex}
              className="rounded-lg border bg-card p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Day</label>
                  <Select
                    value={section.day || undefined}
                    onValueChange={(value) => updateDay(dayIndex, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day) => {
                        // Show all days, but disable if already selected in another section
                        const isSelectedElsewhere =
                          day !== section.day &&
                          daySections.some(
                            (s, i) => i !== dayIndex && s.day === day
                          );
                        return (
                          <SelectItem
                            key={day}
                            value={day}
                            disabled={isSelectedElsewhere}
                          >
                            {day}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {daySections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDaySection(dayIndex)}
                    className="mt-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {section.day && (
                <div className="space-y-3">
                  <label className="text-sm font-medium block">
                    Time Slots
                  </label>
                  {section.timeSlots.map((slot, timeSlotIndex) => (
                    <div
                      key={timeSlotIndex}
                      className="flex items-center gap-3"
                    >
                      <ColumnTimePicker
                        value={slot.from}
                        onChange={(value) =>
                          updateTimeSlot(dayIndex, timeSlotIndex, "from", value)
                        }
                        className="flex-1"
                      />
                      <span className="text-muted-foreground font-medium text-sm">
                        to
                      </span>
                      <ColumnTimePicker
                        value={slot.to}
                        onChange={(value) =>
                          updateTimeSlot(dayIndex, timeSlotIndex, "to", value)
                        }
                        className="flex-1"
                      />
                      <div className="flex gap-1">
                        {timeSlotIndex === section.timeSlots.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => addTimeSlot(dayIndex)}
                            className="h-9 w-9"
                            title="Add time slot"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        {section.timeSlots.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              removeTimeSlot(dayIndex, timeSlotIndex)
                            }
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Remove time slot"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addDaySection}
            className="w-full"
            disabled={availableDays.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add More
          </Button>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Save Availability
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
