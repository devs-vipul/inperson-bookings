import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get all trainers (excluding archived)
export const getAll = query({
  handler: async (ctx) => {
    const allTrainers = await ctx.db.query("trainers").order("desc").collect();
    // Filter out archived trainers
    return allTrainers.filter((trainer) => !trainer.isArchived);
  },
});

// Query to get only active trainers (for public display)
export const getActiveTrainers = query({
  handler: async (ctx) => {
    const allTrainers = await ctx.db
      .query("trainers")
      .withIndex("by_status", (q) => q.eq("status", true))
      .order("desc")
      .collect();
    // Filter out archived trainers
    return allTrainers.filter((trainer) => !trainer.isArchived);
  },
});

// Query to get a single trainer by ID
export const getById = query({
  args: { id: v.id("trainers") },
  handler: async (ctx, args) => {
    const trainer = await ctx.db.get(args.id);
    // Return null if trainer is archived (users shouldn't see archived trainers)
    if (trainer && trainer.isArchived) {
      return null;
    }
    return trainer;
  },
});

// Mutation to create a trainer
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    expertise: v.array(v.string()),
    description: v.optional(v.string()),
    profilePicture: v.optional(v.id("_storage")),
    availableDays: v.optional(v.array(v.string())),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if trainer with same email already exists
    const existing = await ctx.db
      .query("trainers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Trainer with this email already exists");
    }

    const trainerId = await ctx.db.insert("trainers", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      expertise: args.expertise,
      description: args.description,
      profilePicture: args.profilePicture,
      availableDays: args.availableDays || [],
      status: true, // Default to active
      isArchived: false, // Default to not archived
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return trainerId;
  },
});

// Mutation to update trainer status (active/inactive)
export const updateStatus = mutation({
  args: {
    id: v.id("trainers"),
    status: v.boolean(),
  },
  handler: async (ctx, args) => {
    const trainer = await ctx.db.get(args.id);
    if (!trainer) {
      throw new Error("Trainer not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to update trainer
export const update = mutation({
  args: {
    id: v.id("trainers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    expertise: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    profilePicture: v.optional(v.id("_storage")),
    availableDays: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const trainer = await ctx.db.get(id);
    
    if (!trainer) {
      throw new Error("Trainer not found");
    }

    // If email is being updated, check for duplicates
    if (updates.email && updates.email !== trainer.email) {
      const existing = await ctx.db
        .query("trainers")
        .withIndex("by_email", (q) => q.eq("email", updates.email!))
        .first();

      if (existing) {
        throw new Error("Trainer with this email already exists");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Query to get archived trainers
export const getArchived = query({
  handler: async (ctx) => {
    const allTrainers = await ctx.db.query("trainers").order("desc").collect();
    // Return only archived trainers
    return allTrainers.filter((trainer) => trainer.isArchived === true);
  },
});

// Mutation to archive a trainer
export const archive = mutation({
  args: { id: v.id("trainers") },
  handler: async (ctx, args) => {
    const trainer = await ctx.db.get(args.id);
    if (!trainer) {
      throw new Error("Trainer not found");
    }

    await ctx.db.patch(args.id, {
      isArchived: true,
      status: false, // Also set status to inactive
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to unarchive a trainer
export const unarchive = mutation({
  args: { id: v.id("trainers") },
  handler: async (ctx, args) => {
    const trainer = await ctx.db.get(args.id);
    if (!trainer) {
      throw new Error("Trainer not found");
    }

    await ctx.db.patch(args.id, {
      isArchived: false,
      status: true, // Set status to active when unarchiving
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to delete a trainer
export const remove = mutation({
  args: { id: v.id("trainers") },
  handler: async (ctx, args) => {
    const trainer = await ctx.db.get(args.id);
    if (!trainer) {
      throw new Error("Trainer not found");
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
