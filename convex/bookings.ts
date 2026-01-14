import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Query to get bookings by user ID
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    // Populate related data
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const trainer = await ctx.db.get(booking.trainerId);
        const session = await ctx.db.get(booking.sessionId);
        return {
          ...booking,
          trainer,
          session,
        };
      })
    );

    return bookingsWithDetails;
  },
});

// Query to get bookings by trainer ID
export const getByTrainerId = query({
  args: { trainerId: v.id("trainers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();
  },
});

// Query to get booking by ID with populated data
export const getById = query({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) {
      return null;
    }

    // Populate related data
    const trainer = await ctx.db.get(booking.trainerId);
    const session = await ctx.db.get(booking.sessionId);
    const user = await ctx.db.get(booking.userId);

    return {
      ...booking,
      trainer,
      session,
      user,
    };
  },
});

// Query to check if a time slot is available
export const isSlotAvailable = query({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(), // "YYYY-MM-DD"
    startTime: v.string(), // "HH:MM"
    endTime: v.string(), // "HH:MM"
  },
  handler: async (ctx, args) => {
    // Get all bookings for this trainer on this date
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    // Check if any booking has a conflicting slot
    for (const booking of bookings) {
      for (const slot of booking.slots) {
        if (slot.date === args.date) {
          // Check for time overlap
          const slotStart = timeToMinutes(slot.startTime);
          const slotEnd = timeToMinutes(slot.endTime);
          const requestedStart = timeToMinutes(args.startTime);
          const requestedEnd = timeToMinutes(args.endTime);

          // Check if times overlap
          if (
            (requestedStart >= slotStart && requestedStart < slotEnd) ||
            (requestedEnd > slotStart && requestedEnd <= slotEnd) ||
            (requestedStart <= slotStart && requestedEnd >= slotEnd)
          ) {
            return false;
          }
        }
      }
    }

    return true;
  },
});

// Helper function to convert time to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Mutation to create a booking
export const create = mutation({
  args: {
    userId: v.id("users"),
    trainerId: v.id("trainers"),
    sessionId: v.id("sessions"),
    slots: v.array(
      v.object({
        date: v.string(), // "YYYY-MM-DD"
        startTime: v.string(), // "HH:MM"
        endTime: v.string(), // "HH:MM"
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate that all slots are available
    for (const slot of args.slots) {
      // Get all bookings for this trainer on this date
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
        .collect();

      // Check for conflicts
      for (const booking of bookings) {
        // Skip checking against cancelled bookings
        if (booking.status === "cancelled") continue;

        for (const existingSlot of booking.slots) {
          if (existingSlot.date === slot.date) {
            const existingStart = timeToMinutes(existingSlot.startTime);
            const existingEnd = timeToMinutes(existingSlot.endTime);
            const newStart = timeToMinutes(slot.startTime);
            const newEnd = timeToMinutes(slot.endTime);

            // Check if times overlap
            if (
              (newStart >= existingStart && newStart < existingEnd) ||
              (newEnd > existingStart && newEnd <= existingEnd) ||
              (newStart <= existingStart && newEnd >= existingEnd)
            ) {
              throw new Error(
                `Time slot ${slot.startTime}-${slot.endTime} on ${slot.date} is already booked`
              );
            }
          }
        }
      }
    }

    // Create the booking
    const bookingId = await ctx.db.insert("bookings", {
      userId: args.userId,
      trainerId: args.trainerId,
      sessionId: args.sessionId,
      slots: args.slots,
      status: "confirmed",
      createdAt: now,
      updatedAt: now,
    });

    return bookingId;
  },
});

// Mutation to create booking with email sending (for bypass mode)
export const createWithEmails = mutation({
  args: {
    userId: v.id("users"),
    trainerId: v.id("trainers"),
    sessionId: v.id("sessions"),
    slots: v.array(
      v.object({
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate that all slots are available (same logic as create)
    for (const slot of args.slots) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
        .collect();

      for (const booking of bookings) {
        if (booking.status === "cancelled") continue;

        for (const existingSlot of booking.slots) {
          if (existingSlot.date === slot.date) {
            const existingStart = timeToMinutes(existingSlot.startTime);
            const existingEnd = timeToMinutes(existingSlot.endTime);
            const newStart = timeToMinutes(slot.startTime);
            const newEnd = timeToMinutes(slot.endTime);

            if (
              (newStart >= existingStart && newStart < existingEnd) ||
              (newEnd > existingStart && newEnd <= existingEnd) ||
              (newStart <= existingStart && newEnd >= existingEnd)
            ) {
              throw new Error(
                `Time slot ${slot.startTime}-${slot.endTime} on ${slot.date} is already booked`
              );
            }
          }
        }
      }
    }

    // Get user, trainer, and session data for emails
    const user = await ctx.db.get(args.userId);
    const trainer = await ctx.db.get(args.trainerId);
    const session = await ctx.db.get(args.sessionId);

    if (!user || !trainer || !session) {
      throw new Error("User, trainer, or session not found");
    }

    // Create the booking
    const bookingId = await ctx.db.insert("bookings", {
      userId: args.userId,
      trainerId: args.trainerId,
      sessionId: args.sessionId,
      slots: args.slots,
      status: "confirmed",
      paymentStatus: "paid", // Mark as paid in bypass mode
      createdAt: now,
      updatedAt: now,
    });

    // Send emails asynchronously (don't block booking creation)
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendBookingConfirmationToUser,
        {
          userEmail: user.email || "",
          userName: user.name || "User",
          trainerName: trainer.name,
          sessionName: session.name,
          sessionsPerWeek: session.sessionsPerWeek,
          duration: session.duration,
          slots: args.slots,
        }
      );

      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendBookingNotificationToTrainer,
        {
          trainerEmail: trainer.email,
          trainerName: trainer.name,
          userName: user.name || "User",
          userEmail: user.email || "",
          sessionName: session.name,
          sessionsPerWeek: session.sessionsPerWeek,
          duration: session.duration,
          slots: args.slots,
        }
      );
    } catch (emailError) {
      // Log error but don't fail the booking
      console.error("Error scheduling emails:", emailError);
    }

    return bookingId;
  },
});

// Mutation to cancel a booking
export const cancel = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Query to check if user has active subscription for a session
export const hasActiveSubscription = query({
  args: {
    userId: v.union(v.id("users"), v.null()),
    sessionId: v.union(v.id("sessions"), v.null()),
  },
  handler: async (ctx, args) => {
    if (!args.userId || !args.sessionId) {
      return false;
    }

    // Find active bookings with subscription for this user and session
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId!))
      .collect();

    // Check if there's an active booking with subscription for this session
    const activeBooking = bookings.find(
      (booking) =>
        booking.sessionId === args.sessionId &&
        booking.status === "confirmed" &&
        booking.stripeSubscriptionId !== undefined &&
        booking.stripeSubscriptionId !== null
    );

    return !!activeBooking;
  },
});
