import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get sessions by trainer ID
export const getByTrainerId = query({
  args: { trainerId: v.id("trainers") },
  handler: async (ctx, args) => {
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    // Filter out archived sessions
    return allSessions.filter((session) => !session.isArchived);
  },
});

// Query to get sessions by trainer ID and duration
export const getByTrainerIdAndDuration = query({
  args: {
    trainerId: v.id("trainers"),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_trainer_duration", (q) =>
        q.eq("trainerId", args.trainerId).eq("duration", args.duration)
      )
      .collect();

    // Filter out archived sessions
    return allSessions.filter((session) => !session.isArchived);
  },
});

// Query to get session by ID
export const getById = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query to get archived sessions by trainer ID
export const getArchivedByTrainerId = query({
  args: { trainerId: v.id("trainers") },
  handler: async (ctx, args) => {
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", args.trainerId))
      .collect();

    // Return only archived sessions
    return allSessions.filter((session) => session.isArchived === true);
  },
});

// Mutation to create a session
export const create = mutation({
  args: {
    trainerId: v.id("trainers"),
    name: v.string(),
    description: v.string(),
    sessionsPerWeek: v.number(),
    duration: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate duration
    if (args.duration !== 30 && args.duration !== 60) {
      throw new Error("Duration must be 30 or 60 minutes");
    }

    // Validate sessions per week
    if (args.sessionsPerWeek < 1 || args.sessionsPerWeek > 5) {
      throw new Error("Sessions per week must be between 1 and 5");
    }

    // Get trainer info for Stripe product
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer) {
      throw new Error("Trainer not found");
    }

    const sessionId = await ctx.db.insert("sessions", {
      trainerId: args.trainerId,
      name: args.name,
      description: args.description,
      sessionsPerWeek: args.sessionsPerWeek,
      duration: args.duration,
      price: args.price,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    // Note: Stripe product creation is handled by the frontend after session creation
    // The create-session-dialog component will call /api/stripe/create-product
    // This ensures Stripe products are created when sessions are created

    return sessionId;
  },
});

// Internal mutation to update Stripe IDs after product creation
export const updateStripeIds = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    stripeProductId: v.string(),
    stripePriceId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      stripeProductId: args.stripeProductId,
      stripePriceId: args.stripePriceId,
      updatedAt: Date.now(),
    });
  },
});

// Mutation to update a session
export const update = mutation({
  args: {
    id: v.id("sessions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sessionsPerWeek: v.optional(v.number()),
    duration: v.optional(v.number()),
    price: v.optional(v.number()),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const session = await ctx.db.get(id);

    if (!session) {
      throw new Error("Session not found");
    }

    // Validate duration if provided
    if (updates.duration !== undefined) {
      if (updates.duration !== 30 && updates.duration !== 60) {
        throw new Error("Duration must be 30 or 60 minutes");
      }
    }

    // Validate sessions per week if provided
    if (updates.sessionsPerWeek !== undefined) {
      if (updates.sessionsPerWeek < 1 || updates.sessionsPerWeek > 5) {
        throw new Error("Sessions per week must be between 1 and 5");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to archive a session
export const archive = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to unarchive a session
export const unarchive = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.id, {
      isArchived: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to delete a session
export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) {
      throw new Error("Session not found");
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
