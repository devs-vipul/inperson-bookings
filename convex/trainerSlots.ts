import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get all slots for a trainer on a specific date
export const getByTrainerAndDate = query({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(), // "YYYY-MM-DD"
    duration: v.optional(v.number()), // 30 or 60, optional filter
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("trainerSlots")
      .withIndex("by_trainer_date", (q) =>
        q.eq("trainerId", args.trainerId).eq("date", args.date)
      );

    const slots = await query.collect();

    // Filter by duration if provided
    if (args.duration !== undefined) {
      return slots.filter((slot) => slot.duration === args.duration);
    }

    return slots;
  },
});

// Query to get all slots for a trainer (for calendar view)
export const getByTrainer = query({
  args: { trainerId: v.id("trainers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainerSlots")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();
  },
});

// Helper function to convert time to minutes for comparison
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Helper function to convert minutes back to time string
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Helper function to check if two time slots overlap
function slotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // Check if slots overlap (one contains the other or they partially overlap)
  return (
    (start1Min <= start2Min && end1Min > start2Min) ||
    (start2Min <= start1Min && end2Min > start1Min) ||
    (start1Min >= start2Min && end1Min <= end2Min) ||
    (start2Min >= start1Min && end2Min <= end1Min)
  );
}

// Mutation to toggle a single slot
export const toggleSlot = mutation({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(), // "YYYY-MM-DD"
    startTime: v.string(), // "HH:MM"
    endTime: v.string(), // "HH:MM"
    duration: v.number(), // 30 or 60
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing slot
    const existing = await ctx.db
      .query("trainerSlots")
      .withIndex("by_trainer_date", (q) =>
        q.eq("trainerId", args.trainerId).eq("date", args.date)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("startTime"), args.startTime),
          q.eq(q.field("endTime"), args.endTime),
          q.eq(q.field("duration"), args.duration)
        )
      )
      .first();

    let slotId: Id<"trainerSlots">;

    if (existing) {
      // Update existing slot
      await ctx.db.patch(existing._id, {
        isActive: args.isActive,
        updatedAt: now,
      });
      slotId = existing._id;
    } else {
      // Create new slot override
      slotId = await ctx.db.insert("trainerSlots", {
        trainerId: args.trainerId,
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
        duration: args.duration,
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });
    }

    // If disabling a slot, also disable overlapping slots of different duration
    if (!args.isActive) {
      // Get all slots for this date to find overlapping ones
      const allSlotsForDate = await ctx.db
        .query("trainerSlots")
        .withIndex("by_trainer_date", (q) =>
          q.eq("trainerId", args.trainerId).eq("date", args.date)
        )
        .collect();

      // Calculate overlapping slots based on duration
      const overlappingSlotsToDisable: Array<{
        startTime: string;
        endTime: string;
        duration: number;
      }> = [];

      const startMin = timeToMinutes(args.startTime);
      const endMin = timeToMinutes(args.endTime);

      if (args.duration === 30) {
        // If disabling a 30-min slot, disable overlapping 60-min slots
        // A 30-min slot can be:
        // 1. First half: 9:00-9:30 → overlaps with 9:00-10:00 (60 min)
        // 2. Second half: 9:30-10:00 → overlaps with 9:00-10:00 (60 min)

        // Find the hour boundary this 30-min slot belongs to
        const hourStart = Math.floor(startMin / 60) * 60;
        const hourEnd = hourStart + 60;

        // Check if this 30-min slot is within a 60-min window (either first or second half)
        if (startMin >= hourStart && endMin <= hourEnd) {
          const hourStartTime = minutesToTime(hourStart);
          const hourEndTime = minutesToTime(hourEnd);
          overlappingSlotsToDisable.push({
            startTime: hourStartTime,
            endTime: hourEndTime,
            duration: 60,
          });
        }
      } else if (args.duration === 60) {
        // If disabling a 60-min slot, disable overlapping 30-min slots
        // A 60-min slot (e.g., 9:00-10:00) contains two 30-min slots: 9:00-9:30 and 9:30-10:00
        const firstHalfStart = startMin;
        const firstHalfEnd = startMin + 30;
        const secondHalfStart = startMin + 30;
        const secondHalfEnd = endMin;

        overlappingSlotsToDisable.push(
          {
            startTime: minutesToTime(firstHalfStart),
            endTime: minutesToTime(firstHalfEnd),
            duration: 30,
          },
          {
            startTime: minutesToTime(secondHalfStart),
            endTime: minutesToTime(secondHalfEnd),
            duration: 30,
          }
        );
      }

      // Process each overlapping slot
      for (const overlappingSlot of overlappingSlotsToDisable) {
        // Check if slot already exists
        const existingOverlapping = allSlotsForDate.find(
          (slot) =>
            slot.startTime === overlappingSlot.startTime &&
            slot.endTime === overlappingSlot.endTime &&
            slot.duration === overlappingSlot.duration
        );

        if (existingOverlapping) {
          // Update existing slot to disabled
          if (existingOverlapping.isActive) {
            await ctx.db.patch(existingOverlapping._id, {
              isActive: false,
              updatedAt: now,
            });
          }
        } else {
          // Create new slot override as disabled
          await ctx.db.insert("trainerSlots", {
            trainerId: args.trainerId,
            date: args.date,
            startTime: overlappingSlot.startTime,
            endTime: overlappingSlot.endTime,
            duration: overlappingSlot.duration,
            isActive: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return slotId;
  },
});

// Mutation to toggle all slots for a date
export const toggleAllSlotsForDate = mutation({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(), // "YYYY-MM-DD"
    duration: v.optional(v.number()), // 30 or 60, optional filter
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all slots for this date
    let slots = await ctx.db
      .query("trainerSlots")
      .withIndex("by_trainer_date", (q) =>
        q.eq("trainerId", args.trainerId).eq("date", args.date)
      )
      .collect();

    // Filter by duration if provided
    if (args.duration !== undefined) {
      slots = slots.filter((slot) => slot.duration === args.duration);
    }

    // Update all slots
    for (const slot of slots) {
      await ctx.db.patch(slot._id, {
        isActive: args.isActive,
        updatedAt: now,
      });
    }

    return { updated: slots.length };
  },
});

// Mutation to bulk create/update slots for a date
export const setSlotsForDate = mutation({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(), // "YYYY-MM-DD"
    slots: v.array(
      v.object({
        startTime: v.string(), // "HH:MM"
        endTime: v.string(), // "HH:MM"
        duration: v.number(), // 30 or 60
        isActive: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing slots for this date
    const existing = await ctx.db
      .query("trainerSlots")
      .withIndex("by_trainer_date", (q) =>
        q.eq("trainerId", args.trainerId).eq("date", args.date)
      )
      .collect();

    // Delete existing slots that are not in the new list
    const newSlotKeys = new Set(
      args.slots.map((s) => `${s.startTime}-${s.endTime}-${s.duration}`)
    );

    for (const existingSlot of existing) {
      const key = `${existingSlot.startTime}-${existingSlot.endTime}-${existingSlot.duration}`;
      if (!newSlotKeys.has(key)) {
        await ctx.db.delete(existingSlot._id);
      }
    }

    // Create or update slots
    const slotIds = [];
    for (const slot of args.slots) {
      const existingSlot = existing.find(
        (s) =>
          s.startTime === slot.startTime &&
          s.endTime === slot.endTime &&
          s.duration === slot.duration
      );

      if (existingSlot) {
        await ctx.db.patch(existingSlot._id, {
          isActive: slot.isActive,
          updatedAt: now,
        });
        slotIds.push(existingSlot._id);
      } else {
        const id = await ctx.db.insert("trainerSlots", {
          trainerId: args.trainerId,
          date: args.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
          isActive: slot.isActive,
          createdAt: now,
          updatedAt: now,
        });
        slotIds.push(id);
      }
    }

    return slotIds;
  },
});
