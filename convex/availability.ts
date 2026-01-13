import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get all availability for a trainer
export const getByTrainerId = query({
  args: { trainerId: v.id("trainers") },
  handler: async (ctx, args) => {
    const availability = await ctx.db
      .query("trainerAvailability")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();
    return availability;
  },
});

// Mutation to set/update trainer availability
export const setAvailability = mutation({
  args: {
    trainerId: v.id("trainers"),
    availability: v.array(
      v.object({
        day: v.string(),
        timeSlots: v.array(
          v.object({
            from: v.string(),
            to: v.string(),
          })
        ),
        isActive: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing availability
    const existing = await ctx.db
      .query("trainerAvailability")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    // Delete existing availability
    for (const item of existing) {
      await ctx.db.delete(item._id);
    }

    // Insert new availability
    const newAvailabilityIds = [];
    for (const avail of args.availability) {
      const id = await ctx.db.insert("trainerAvailability", {
        trainerId: args.trainerId,
        day: avail.day,
        timeSlots: avail.timeSlots,
        isActive: avail.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      });
      newAvailabilityIds.push(id);
    }

    return newAvailabilityIds;
  },
});

// Mutation to toggle availability slot
export const toggleSlot = mutation({
  args: {
    id: v.id("trainerAvailability"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
