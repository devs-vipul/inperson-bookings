import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Helper function to convert time to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Query to get monthly booking by ID (for confirmation page)
export const getById = query({
  args: { id: v.id("monthlyBookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) return null;

    const trainer = await ctx.db.get(booking.trainerId);
    const user = await ctx.db.get(booking.userId);
    const subscription = await ctx.db.get(booking.monthlySubscriptionId);

    return {
      ...booking,
      trainer,
      user,
      subscription,
      slots: booking.slots,
    };
  },
});

// Query to get monthly bookings by subscription ID
export const getBySubscriptionId = query({
  args: { subscriptionId: v.id("monthlySubscriptions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("monthlyBookings")
      .withIndex("by_subscription_id", (q) =>
        q.eq("monthlySubscriptionId", args.subscriptionId)
      )
      .collect();
  },
});

// Query to get monthly bookings by trainer ID
export const getByTrainerId = query({
  args: { trainerId: v.id("trainers") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("monthlyBookings")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    // Populate user data
    return await Promise.all(
      bookings.map(async (booking) => {
        const user = await ctx.db.get(booking.userId);
        const subscription = await ctx.db.get(booking.monthlySubscriptionId);
        return {
          ...booking,
          user,
          subscription,
        };
      })
    );
  },
});

// Query to get monthly bookings by user ID
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("monthlyBookings")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    // Populate trainer and subscription data
    return await Promise.all(
      bookings.map(async (booking) => {
        const trainer = await ctx.db.get(booking.trainerId);
        const subscription = await ctx.db.get(booking.monthlySubscriptionId);
        return {
          ...booking,
          trainer,
          subscription,
        };
      })
    );
  },
});

// Query to get all monthly bookings (for admin overview)
export const getAll = query({
  handler: async (ctx) => {
    const bookings = await ctx.db
      .query("monthlyBookings")
      .order("desc")
      .collect();

    // Populate user, trainer, and subscription data
    return await Promise.all(
      bookings.map(async (booking) => {
        const user = await ctx.db.get(booking.userId);
        const trainer = await ctx.db.get(booking.trainerId);
        const subscription = await ctx.db.get(booking.monthlySubscriptionId);
        return {
          ...booking,
          user,
          trainer,
          subscription,
        };
      })
    );
  },
});

// Query to get slot capacity for a specific slot (date + time)
// Returns count of users who booked this slot (max 5 for monthly)
export const getSlotCapacity = query({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(), // "YYYY-MM-DD"
    startTime: v.string(), // "HH:MM"
    endTime: v.string(), // "HH:MM"
  },
  handler: async (ctx, args) => {
    // Get all monthly bookings for this trainer
    const monthlyBookings = await ctx.db
      .query("monthlyBookings")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    // Count users who booked this exact slot
    let count = 0;
    const users: Array<{ userId: Id<"users">; userName: string | undefined }> = [];

    for (const booking of monthlyBookings) {
      if (booking.status !== "confirmed") continue;

      for (const slot of booking.slots) {
        if (
          slot.date === args.date &&
          slot.startTime === args.startTime &&
          slot.endTime === args.endTime
        ) {
          const user = await ctx.db.get(booking.userId);
          if (user) {
            count++;
            users.push({
              userId: user._id,
              userName: user.name || user.email || "Unknown",
            });
          }
          break; // Found match, move to next booking
        }
      }
    }

    return {
      count,
      maxCapacity: 5,
      isAvailable: count < 5,
      users, // List of users who booked this slot
    };
  },
});

// Query to get all users who booked a specific slot
export const getUsersForSlot = query({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const monthlyBookings = await ctx.db
      .query("monthlyBookings")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    const users: Array<{ userId: Id<"users">; userName: string | undefined; userEmail: string | undefined }> = [];

    for (const booking of monthlyBookings) {
      if (booking.status !== "confirmed") continue;

      for (const slot of booking.slots) {
        if (
          slot.date === args.date &&
          slot.startTime === args.startTime &&
          slot.endTime === args.endTime
        ) {
          const user = await ctx.db.get(booking.userId);
          if (user) {
            users.push({
              userId: user._id,
              userName: user.name || undefined,
              userEmail: user.email || undefined,
            });
          }
          break;
        }
      }
    }

    return users;
  },
});

// Mutation to create monthly booking
export const create = mutation({
  args: {
    monthlySubscriptionId: v.id("monthlySubscriptions"),
    userId: v.id("users"),
    trainerId: v.id("trainers"),
    slots: v.array(
      v.object({
        date: v.string(), // "YYYY-MM-DD"
        startTime: v.string(), // "HH:MM"
        endTime: v.string(), // "HH:MM"
        duration: v.number(), // 30 or 60 minutes
      })
    ),
  },
  handler: async (ctx, args) => {
    // Validate subscription is active
    const subscription = await ctx.db.get(args.monthlySubscriptionId);
    if (!subscription || !subscription.isActive) {
      throw new Error("No active monthly subscription found");
    }

    // Validate subscription hasn't expired
    const now = new Date().toISOString();
    if (subscription.endDate < now) {
      throw new Error("Monthly subscription has expired");
    }

    // Validate all slots are within subscription date range
    for (const slot of args.slots) {
      const slotDate = new Date(slot.date + "T00:00:00");
      const startDate = new Date(subscription.startDate);
      const endDate = new Date(subscription.endDate);

      if (slotDate < startDate || slotDate > endDate) {
        throw new Error(
          `Slot on ${slot.date} is outside your subscription period (${subscription.startDate} to ${subscription.endDate})`
        );
      }
    }

    // Check slot capacity for each slot (max 5 users per slot)
    // Count existing monthly bookings for each slot
    const existingMonthlyBookings = await ctx.db
      .query("monthlyBookings")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    for (const slot of args.slots) {
      let count = 0;
      for (const booking of existingMonthlyBookings) {
        if (booking.status !== "confirmed") continue;
        for (const existingSlot of booking.slots) {
          if (
            existingSlot.date === slot.date &&
            existingSlot.startTime === slot.startTime &&
            existingSlot.endTime === slot.endTime
          ) {
            count++;
            break; // Found match, move to next booking
          }
        }
      }

      if (count >= 5) {
        throw new Error(
          `Time slot ${slot.startTime}-${slot.endTime} on ${slot.date} is full (5 users already booked)`
        );
      }
    }

    // Check for conflicts with weekly bookings (same trainer, date, time)
    const weeklyBookings = await ctx.db
      .query("bookings")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    for (const slot of args.slots) {
      for (const booking of weeklyBookings) {
        if (booking.status !== "confirmed") continue;

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
                `Time slot ${slot.startTime}-${slot.endTime} on ${slot.date} conflicts with an existing weekly booking`
              );
            }
          }
        }
      }
    }

    // Create the monthly booking
    const bookingId = await ctx.db.insert("monthlyBookings", {
      monthlySubscriptionId: args.monthlySubscriptionId,
      userId: args.userId,
      trainerId: args.trainerId,
      slots: args.slots,
      status: "confirmed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // TODO: Send confirmation emails (similar to weekly bookings)

    return bookingId;
  },
});

// Mutation to cancel monthly booking
export const cancel = mutation({
  args: { bookingId: v.id("monthlyBookings") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
