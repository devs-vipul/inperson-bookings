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
      .filter(
        (q) =>
          q.and(
            q.eq(q.field("startTime"), args.startTime),
            q.eq(q.field("endTime"), args.endTime),
            q.eq(q.field("duration"), args.duration)
          )
      )
      .first();

    if (existing) {
      // Update existing slot
      await ctx.db.patch(existing._id, {
        isActive: args.isActive,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new slot override
      return await ctx.db.insert("trainerSlots", {
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
      args.slots.map(
        (s) => `${s.startTime}-${s.endTime}-${s.duration}`
      )
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
