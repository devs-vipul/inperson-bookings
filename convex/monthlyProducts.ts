import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get all active monthly products
export const getActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("monthlyProducts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Query to get all monthly products (including inactive)
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("monthlyProducts").collect();
  },
});

// Query to get monthly product by ID
export const getById = query({
  args: { id: v.id("monthlyProducts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutation to create a monthly product
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    durationMonths: v.number(),
    stripeProductId: v.string(),
    stripePriceId: v.string(),
  },
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert("monthlyProducts", {
      name: args.name,
      description: args.description,
      price: args.price,
      durationMonths: args.durationMonths,
      stripeProductId: args.stripeProductId,
      stripePriceId: args.stripePriceId,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Mutation to update a monthly product
export const update = mutation({
  args: {
    id: v.id("monthlyProducts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    durationMonths: v.optional(v.number()),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.durationMonths !== undefined) updateData.durationMonths = updates.durationMonths;
    if (updates.stripeProductId !== undefined) updateData.stripeProductId = updates.stripeProductId;
    if (updates.stripePriceId !== undefined) updateData.stripePriceId = updates.stripePriceId;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    await ctx.db.patch(id, updateData);
  },
});

// Mutation to archive a monthly product
export const archive = mutation({
  args: { id: v.id("monthlyProducts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      isArchived: true,
      updatedAt: Date.now(),
    });
  },
});

// Mutation to unarchive a monthly product
export const unarchive = mutation({
  args: { id: v.id("monthlyProducts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: true,
      isArchived: false,
      updatedAt: Date.now(),
    });
  },
});

// Mutation to delete a monthly product
export const remove = mutation({
  args: { id: v.id("monthlyProducts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
