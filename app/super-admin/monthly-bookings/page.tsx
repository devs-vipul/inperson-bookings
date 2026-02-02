"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  getDayName,
  dateToLocalString,
  formatTime12Hour,
  formatDate,
  generateTimeSlots,
  type TimeSlot,
} from "@/lib/booking-utils";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Users,
  User,
  CalendarDays,
  TrendingUp,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TabType = "trainer" | "user";

export default function MonthlyBookingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("trainer");
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(
    null
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30);
  const [showSlotManagement, setShowSlotManagement] = useState(false);
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null);
  const [isTogglingAll, setIsTogglingAll] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Debounce search term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(userSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  // Fetch all trainers
  const trainers = useQuery(api.trainers.getAll);

  // Fetch all users
  const allUsers = useQuery(api.users.getAll);

  // Fetch searched users (backend-driven search) - only when debounced term changes
  const searchedUsers = useQuery(
    api.users.search,
    debouncedSearchTerm.trim() ? { searchTerm: debouncedSearchTerm } : "skip"
  );

  // Use searched users if search term exists, otherwise use all users
  const usersToDisplay = debouncedSearchTerm.trim() ? searchedUsers : allUsers;

  // Fetch monthly bookings for selected trainer
  const monthlyBookingsByTrainer = useQuery(
    (api as any).monthlyBookings?.getByTrainerId,
    selectedTrainerId
      ? { trainerId: selectedTrainerId as Id<"trainers"> }
      : "skip"
  );

  // Fetch monthly bookings for selected user
  const monthlyBookingsByUser = useQuery(
    (api as any).monthlyBookings?.getByUserId,
    selectedUserId ? { userId: selectedUserId as Id<"users"> } : "skip"
  );

  // Fetch trainer availability
  const availability = useQuery(
    api.availability.getByTrainerId,
    selectedTrainerId
      ? { trainerId: selectedTrainerId as Id<"trainers"> }
      : "skip"
  );

  // Fetch weekly bookings for the trainer (to check slot conflicts)
  const weeklyBookings = useQuery(
    api.bookings.getByTrainerId,
    selectedTrainerId
      ? { trainerId: selectedTrainerId as Id<"trainers"> }
      : "skip"
  );

  // Fetch existing slot overrides
  const existingSlots = useQuery(
    api.trainerSlots.getByTrainer,
    selectedTrainerId
      ? { trainerId: selectedTrainerId as Id<"trainers"> }
      : "skip"
  );

  // Get slots for selected date
  const slotsForDate = useQuery(
    api.trainerSlots.getByTrainerAndDate,
    selectedDate && selectedTrainerId
      ? {
          trainerId: selectedTrainerId as Id<"trainers">,
          date: dateToLocalString(selectedDate),
          duration: selectedDuration,
        }
      : "skip"
  );

  // Mutations for slot management
  const toggleSlot = useMutation(api.trainerSlots.toggleSlot);
  const setSlotsForDate = useMutation(api.trainerSlots.setSlotsForDate);

  // Get users with active monthly subscriptions (use searched users if search exists)
  const usersWithSubscriptions = useMemo(() => {
    if (!usersToDisplay) return [];
    // Show all users (filter will happen when they select)
    return usersToDisplay;
  }, [usersToDisplay]);

  // Get slots for selected date (trainer view)
  const getSlotsForDate = useMemo(() => {
    if (!selectedDate || !monthlyBookingsByTrainer || !selectedTrainerId)
      return [];

    const dateString = dateToLocalString(selectedDate);
    const slotsMap = new Map<
      string,
      Array<{
        startTime: string;
        endTime: string;
        duration: number;
        users: Array<{
          name: string | undefined;
          email: string | undefined;
          userId: Id<"users">;
        }>;
        bookingIds: Array<Id<"monthlyBookings">>;
      }>
    >();

    // Collect all bookings for this date
    for (const booking of monthlyBookingsByTrainer) {
      if (booking.status !== "confirmed") continue;

      for (const slot of booking.slots) {
        if (slot.date === dateString) {
          const slotKey = `${slot.startTime}-${slot.endTime}`;
          const existing = slotsMap.get(slotKey) || [];

          const userInfo = {
            name: booking.user?.name,
            email: booking.user?.email,
            userId: booking.userId,
          };

          // Check if user already added
          const userExists = existing.some((s) =>
            s.users.some((u) => u.userId === booking.userId)
          );
          if (!userExists) {
            if (existing.length === 0) {
              slotsMap.set(slotKey, [
                {
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  duration: slot.duration || 30,
                  users: [userInfo],
                  bookingIds: [booking._id],
                },
              ]);
            } else {
              existing[0].users.push(userInfo);
              existing[0].bookingIds.push(booking._id);
            }
          }
        }
      }
    }

    // Convert map to array and sort by time
    return Array.from(slotsMap.values())
      .map((arr) => arr[0])
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDate, monthlyBookingsByTrainer, selectedTrainerId]);

  // Get bookings for selected user
  const getUserBookings = useMemo(() => {
    if (!monthlyBookingsByUser || !selectedUserId) return [];

    // Group bookings by date
    const bookingsByDate = new Map<
      string,
      Array<{
        date: string;
        dayName: string;
        slots: Array<{
          startTime: string;
          endTime: string;
          duration: number;
          trainerName: string;
          trainerId: Id<"trainers">;
        }>;
      }>
    >();

    for (const booking of monthlyBookingsByUser) {
      if (booking.status !== "confirmed") continue;

      for (const slot of booking.slots) {
        const dateString = slot.date;
        const dayName = getDayName(dateString);
        const existing = bookingsByDate.get(dateString) || [];

        existing.push({
          date: dateString,
          dayName,
          slots: [
            {
              startTime: slot.startTime,
              endTime: slot.endTime,
              duration: slot.duration || 30,
              trainerName: booking.trainer?.name || "Unknown Trainer",
              trainerId: booking.trainerId,
            },
          ],
        });

        bookingsByDate.set(dateString, existing);
      }
    }

    // Convert to array and sort by date
    return Array.from(bookingsByDate.entries())
      .map(([date, entries]) => ({
        date,
        dayName: getDayName(date),
        slots: entries.flatMap((e) => e.slots),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlyBookingsByUser, selectedUserId]);

  // Check if date has bookings (trainer view)
  const hasBookings = (date: Date): boolean => {
    if (!monthlyBookingsByTrainer) return false;
    const dateString = dateToLocalString(date);
    return monthlyBookingsByTrainer.some(
      (booking) =>
        booking.status === "confirmed" &&
        booking.slots.some((slot) => slot.date === dateString)
    );
  };

  // Get available dates (next 90 days)
  const getAvailableDates = useMemo(() => {
    const dates = new Set<string>();
    if (!availability) return dates;

    const today = new Date();
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

  // Helper to check if a slot is booked (checks BOTH weekly and monthly)
  const isSlotBooked = (
    dateString: string,
    startTime: string,
    endTime: string
  ): boolean => {
    // Convert times to minutes for comparison
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const requestedStart = timeToMinutes(startTime);
    const requestedEnd = timeToMinutes(endTime);

    // Check weekly bookings (these block the slot completely - 1 user per slot)
    if (weeklyBookings) {
      for (const booking of weeklyBookings) {
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
              return true; // Weekly booking blocks the slot
            }
          }
        }
      }
    }

    // Check monthly bookings - if a slot has 5 users, it's full and blocks
    if (monthlyBookingsByTrainer) {
      let monthlyCount = 0;
      for (const booking of monthlyBookingsByTrainer) {
        if (booking.status !== "confirmed") continue;
        for (const slot of booking.slots) {
          if (
            slot.date === dateString &&
            slot.startTime === startTime &&
            slot.endTime === endTime
          ) {
            monthlyCount++;
            break;
          }
        }
      }
      // If slot is full (5 users), it blocks
      if (monthlyCount >= 5) {
        return true;
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
  }, [generatedSlots, slotsForDate, selectedDate, weeklyBookings, monthlyBookingsByTrainer]);

  // Determine if all slots are currently active (excluding booked slots)
  const allSlotsActive = useMemo(() => {
    if (allSlots.length === 0) return true;
    const nonBookedSlots = allSlots.filter((slot) => !slot.isBooked);
    if (nonBookedSlots.length === 0) return true; // All slots are booked
    return nonBookedSlots.every((slot) => slot.isActive);
  }, [allSlots]);

  // Handle slot toggle
  const handleSlotToggle = async (
    slot: TimeSlot & { isActive: boolean; hasOverride: boolean; isBooked?: boolean },
    isActive: boolean
  ) => {
    if (!selectedDate || !selectedTrainerId || slot.isBooked) return;

    const slotId = `${slot.startTime}-${slot.endTime}-${selectedDuration}`;
    setTogglingSlotId(slotId);
    try {
      await toggleSlot({
        trainerId: selectedTrainerId as Id<"trainers">,
        date: dateToLocalString(selectedDate),
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: selectedDuration,
        isActive,
      });

      toast({
        variant: "default",
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

  // Handle toggle all slots
  const handleToggleAllSlots = async (isActive: boolean) => {
    if (!selectedDate || !selectedTrainerId || generatedSlots.length === 0) return;

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
        trainerId: selectedTrainerId as Id<"trainers">,
        date: dateString,
        slots: nonBookedSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: selectedDuration,
          isActive,
        })),
      });

      toast({
        variant: "default",
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

  // Get statistics
  const stats = useMemo(() => {
    const bookings = activeTab === "trainer" 
      ? monthlyBookingsByTrainer 
      : monthlyBookingsByUser;
    
    if (!bookings) return null;

    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const totalSlots = confirmed.reduce(
      (sum, b) => sum + b.slots.length,
      0
    );
    const uniqueUsers = new Set(
      confirmed.map((b) => b.userId)
    ).size;

    return {
      totalBookings: confirmed.length,
      totalSlots,
      uniqueUsers,
    };
  }, [activeTab, monthlyBookingsByTrainer, monthlyBookingsByUser]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <Link href="/super-admin/monthly">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#F2D578" }}>
                Monthly Bookings Management
              </h1>
              <p className="text-muted-foreground mt-1">
                View and manage monthly subscription bookings by trainer or user
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="w-full md:w-fit grid grid-cols-2 border-b-2"
            style={{ borderColor: "#F2D578" }}
          >
            <button
              onClick={() => {
                setActiveTab("trainer");
                setSelectedUserId(null);
              }}
              style={{
                backgroundColor: activeTab === "trainer" ? "#F2D578" : "#000000",
                color: activeTab === "trainer" ? "#000000" : "#F2D578",
                border: "2px solid #F2D578",
              }}
              className="py-3 px-6 text-base font-bold transition-all flex items-center justify-center gap-2"
            >
              <User className="h-4 w-4" />
              By Trainer
            </button>
            <button
              onClick={() => {
                setActiveTab("user");
                setSelectedTrainerId(null);
              }}
              style={{
                backgroundColor: activeTab === "user" ? "#F2D578" : "#000000",
                color: activeTab === "user" ? "#000000" : "#F2D578",
                border: "2px solid #F2D578",
              }}
              className="py-3 px-6 text-base font-bold transition-all flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              By User
            </button>
          </div>
        </motion.div>

        {/* Statistics */}
        {stats && (
          <motion.div
            className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2" style={{ borderColor: "#F2D578" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-bold" style={{ color: "#F2D578" }}>
                      {stats.totalBookings}
                    </p>
                  </div>
                  <CalendarDays className="h-8 w-8" style={{ color: "#F2D578" }} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-2" style={{ borderColor: "#F2D578" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Slots</p>
                    <p className="text-2xl font-bold" style={{ color: "#F2D578" }}>
                      {stats.totalSlots}
                    </p>
                  </div>
                  <Clock className="h-8 w-8" style={{ color: "#F2D578" }} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-2" style={{ borderColor: "#F2D578" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Users</p>
                    <p className="text-2xl font-bold" style={{ color: "#F2D578" }}>
                      {stats.uniqueUsers}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8" style={{ color: "#F2D578" }} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Trainer Tab */}
        {activeTab === "trainer" && (
          <div className="space-y-6">
            {/* Trainer Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                <CardHeader>
                  <CardTitle style={{ color: "#F2D578" }}>Select Trainer</CardTitle>
                  <CardDescription>
                    Choose a trainer to view their monthly bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedTrainerId || undefined}
                    onValueChange={setSelectedTrainerId}
                  >
                    <SelectTrigger className="w-full md:w-[400px] bg-black border-2" style={{ borderColor: "#F2D578" }}>
                      <SelectValue placeholder="Select a trainer..." />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-2" style={{ borderColor: "#F2D578" }}>
                      {trainers?.map((trainer) => (
                        <SelectItem key={trainer._id} value={trainer._id} className="hover:bg-[#F2D578]/20">
                          {trainer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </motion.div>

            {selectedTrainerId && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <motion.div
                  className="lg:col-span-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                    <CardHeader>
                      <CardTitle style={{ color: "#F2D578" }}>Calendar</CardTitle>
                      <CardDescription>
                        Dates with bookings are highlighted
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setCurrentMonth(date);
                          }
                        }}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        modifiers={{
                          hasBookings: (date) => hasBookings(date),
                          available: (date) => isDateAvailable(date),
                        }}
                        modifiersClassNames={{
                          hasBookings:
                            "bg-yellow-500/20 border-yellow-500 border-2 rounded",
                          available: "",
                        }}
                        className="rounded-md border"
                      />
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded border-2 border-yellow-500 bg-yellow-500/20"></div>
                          <span>Has Monthly Bookings</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bookings for Selected Date */}
                <motion.div
                  className="lg:col-span-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle style={{ color: "#F2D578" }}>
                            {selectedDate
                              ? `${formatDate(selectedDate)} - ${getDayName(
                                  dateToLocalString(selectedDate)
                                )}`
                              : "Select a date"}
                          </CardTitle>
                          <CardDescription>
                            View all monthly bookings for the selected date
                          </CardDescription>
                        </div>
                        {selectedDate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSlotManagement(!showSlotManagement)}
                            className="border-2"
                            style={{ borderColor: "#F2D578" }}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            {showSlotManagement ? "Hide" : "Manage"} Slots
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!selectedDate ? (
                        <p className="text-muted-foreground text-center py-8">
                          Please select a date from the calendar
                        </p>
                      ) : getSlotsForDate.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No monthly bookings for this date
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {getSlotsForDate.map((slot, index) => (
                            <motion.div
                              key={`${slot.startTime}-${slot.endTime}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="rounded-lg border-2 p-4"
                              style={{
                                borderColor: "#F2D578",
                                backgroundColor: "rgba(242, 213, 120, 0.05)",
                              }}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Clock
                                    className="h-5 w-5"
                                    style={{ color: "#F2D578" }}
                                  />
                                  <span className="font-bold text-lg">
                                    {formatTime12Hour(slot.startTime)} -{" "}
                                    {formatTime12Hour(slot.endTime)}
                                  </span>
                                  <Badge variant="outline" className="ml-2">
                                    {slot.duration} min
                                  </Badge>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="font-bold"
                                  style={{
                                    backgroundColor:
                                      slot.users.length >= 5 ? "#ef4444" : "#F2D578",
                                    color: slot.users.length >= 5 ? "white" : "black",
                                  }}
                                >
                                  {slot.users.length} / 5 users
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                  <Users className="h-4 w-4" />
                                  <span>Booked by:</span>
                                </div>
                                <div className="space-y-1 pl-6">
                                  {slot.users.map((user, userIndex) => (
                                    <div
                                      key={user.userId}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <User
                                        className="h-3 w-3"
                                        style={{ color: "#F2D578" }}
                                      />
                                      <span className="font-medium">
                                        {user.name || user.email || "Unknown User"}
                                      </span>
                                      {user.email && user.name && (
                                        <span className="text-muted-foreground text-xs">
                                          ({user.email})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Slot Management Section */}
                      {showSlotManagement && selectedDate && (
                        <div className="mt-6 pt-6 border-t-2" style={{ borderColor: "#F2D578" }}>
                          <div className="space-y-4">
                            {/* Duration Tabs */}
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

                            {/* Toggle All Slots */}
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
                                    : `${allSlots.filter((s) => !s.isActive && !s.isBooked).length} slot${allSlots.filter((s) => !s.isActive && !s.isBooked).length !== 1 ? "s" : ""} disabled`}
                                </p>
                              </div>
                              <Switch
                                checked={allSlotsActive}
                                onCheckedChange={handleToggleAllSlots}
                                disabled={!selectedDate || generatedSlots.length === 0 || isTogglingAll}
                              />
                            </div>

                            {/* Slots List */}
                            {allSlots.length === 0 ? (
                              <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: "#F2D578" }}>
                                <p className="text-sm font-medium text-muted-foreground">
                                  No slots available for this date.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {allSlots.map((slot, index) => (
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
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {!selectedTrainerId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                  <CardContent className="p-12 text-center">
                    <User className="h-16 w-16 mx-auto mb-4" style={{ color: "#F2D578" }} />
                    <p className="text-muted-foreground text-lg">
                      Please select a trainer to view monthly bookings
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {/* User Tab */}
        {activeTab === "user" && (
          <div className="space-y-6">
            {/* User Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                <CardHeader>
                  <CardTitle style={{ color: "#F2D578" }}>Select User</CardTitle>
                  <CardDescription>
                    Choose a user to view their monthly bookings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Input with Results */}
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">Search & Select User</label>
                    <div className="relative">
                      <Input
                        placeholder="Search by name or email..."
                        value={userSearchTerm}
                        onChange={(e) => {
                          setUserSearchTerm(e.target.value);
                          setShowUserDropdown(true);
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        onBlur={() => {
                          // Delay hiding to allow click on dropdown items
                          setTimeout(() => setShowUserDropdown(false), 200);
                        }}
                        className="bg-black border-2 pr-10"
                        style={{ borderColor: "#F2D578" }}
                      />
                      {userSearchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => {
                            setUserSearchTerm("");
                            setSelectedUserId(null);
                          }}
                        >
                          ×
                        </Button>
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showUserDropdown && (
                      <div
                        className="absolute z-50 w-full mt-1 bg-black border-2 rounded-md shadow-lg max-h-[300px] overflow-y-auto"
                        style={{ borderColor: "#F2D578" }}
                      >
                        {(() => {
                          // Show all users if no search term, otherwise show search results
                          const displayUsers = debouncedSearchTerm.trim() 
                            ? usersToDisplay 
                            : allUsers;
                          
                          if (displayUsers === undefined) {
                            return (
                              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                {debouncedSearchTerm ? "Searching..." : "Loading..."}
                              </div>
                            );
                          }
                          
                          if (displayUsers && displayUsers.length > 0) {
                            return (
                              <>
                                <div className="px-4 py-2 text-xs text-muted-foreground border-b" style={{ borderColor: "#F2D578" }}>
                                  {debouncedSearchTerm.trim() 
                                    ? `${displayUsers.length} user${displayUsers.length !== 1 ? "s" : ""} found`
                                    : `${displayUsers.length} user${displayUsers.length !== 1 ? "s" : ""} total`}
                                </div>
                                {displayUsers.map((user) => (
                              <button
                                key={user._id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent input blur
                                  setSelectedUserId(user._id);
                                  setUserSearchTerm(user.name || user.email || "");
                                  setShowUserDropdown(false);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-3 hover:bg-[#F2D578]/20 transition-colors border-b last:border-b-0",
                                  selectedUserId === user._id && "bg-[#F2D578]/30",
                                  "border-[#F2D578]/20"
                                )}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.name || "Unknown User"}
                                  </span>
                                  {user.email && (
                                    <span className="text-xs text-muted-foreground">
                                      {user.email}
                                    </span>
                                  )}
                                </div>
                              </button>
                                ))}
                              </>
                            );
                          }
                          
                          return (
                            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                              No users found
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Selected User Display */}
                    {selectedUserId && usersToDisplay && (
                      <div className="mt-2 p-3 rounded-lg border-2" style={{ borderColor: "#F2D578", backgroundColor: "rgba(242, 213, 120, 0.05)" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {usersToDisplay.find((u) => u._id === selectedUserId)?.name || "Unknown User"}
                            </p>
                            {usersToDisplay.find((u) => u._id === selectedUserId)?.email && (
                              <p className="text-sm text-muted-foreground">
                                {usersToDisplay.find((u) => u._id === selectedUserId)?.email}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(null);
                              setUserSearchTerm("");
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {selectedUserId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                  <CardHeader>
                    <CardTitle style={{ color: "#F2D578" }}>
                      User Bookings Overview
                    </CardTitle>
                    <CardDescription>
                      All monthly bookings for the selected user
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getUserBookings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No monthly bookings found for this user
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {getUserBookings.map((dayBooking, index) => (
                          <motion.div
                            key={dayBooking.date}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="rounded-lg border-2 p-4"
                            style={{
                              borderColor: "#F2D578",
                              backgroundColor: "rgba(242, 213, 120, 0.05)",
                            }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <CalendarIcon
                                  className="h-5 w-5"
                                  style={{ color: "#F2D578" }}
                                />
                                <div>
                                  <h3 className="font-bold text-lg">
                                    {formatDate(new Date(dayBooking.date + "T00:00:00"))}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {dayBooking.dayName}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="font-bold">
                                {dayBooking.slots.length} slot
                                {dayBooking.slots.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <div className="space-y-2 pl-8">
                              {dayBooking.slots.map((slot, slotIndex) => (
                                <div
                                  key={slotIndex}
                                  className="flex items-center justify-between p-2 rounded border"
                                  style={{ borderColor: "#F2D578" }}
                                >
                                  <div className="flex items-center gap-3">
                                    <Clock
                                      className="h-4 w-4"
                                      style={{ color: "#F2D578" }}
                                    />
                                    <span className="font-medium">
                                      {formatTime12Hour(slot.startTime)} -{" "}
                                      {formatTime12Hour(slot.endTime)}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {slot.duration} min
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <User
                                      className="h-4 w-4"
                                      style={{ color: "#F2D578" }}
                                    />
                                    <span className="text-sm font-medium">
                                      {slot.trainerName}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {!selectedUserId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-2" style={{ borderColor: "#F2D578" }}>
                  <CardContent className="p-12 text-center">
                    <Users className="h-16 w-16 mx-auto mb-4" style={{ color: "#F2D578" }} />
                    <p className="text-muted-foreground text-lg">
                      Please select a user to view their monthly bookings
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
