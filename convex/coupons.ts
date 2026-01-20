import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create coupon in database (called after Stripe coupon is created)
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    disc_type: v.union(v.literal("percentage"), v.literal("flat")),
    add_disc: v.number(),
    stripeCouponId: v.string(),
    stripePromotionCodeId: v.optional(v.string()),
    validity: v.number(),
  },
  handler: async (ctx, args) => {
    const couponId = await ctx.db.insert("discountCode", {
      name: args.name,
      code: args.code,
      disc_type: args.disc_type,
      add_disc: args.add_disc,
      stripeCouponId: args.stripeCouponId,
      stripePromotionCodeId: args.stripePromotionCodeId,
      validity: args.validity,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return couponId;
  },
});

// Get all coupons
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const coupons = await ctx.db
      .query("discountCode")
      .order("desc")
      .collect();

    return coupons;
  },
});

// Get active (non-archived) coupons
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const coupons = await ctx.db
      .query("discountCode")
      .withIndex("by_archived", (q) => q.eq("isArchived", false))
      .collect();

    return coupons;
  },
});

// Get coupon by ID
export const getById = query({
  args: { id: v.id("discountCode") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get coupon by code
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("discountCode")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

// Archive coupon (soft delete)
export const archive = mutation({
  args: { id: v.id("discountCode") },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.id);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    await ctx.db.patch(args.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Unarchive coupon
export const unarchive = mutation({
  args: { id: v.id("discountCode") },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.id);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    await ctx.db.patch(args.id, {
      isArchived: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete coupon from database (called after Stripe deletion)
export const deleteCoupon = mutation({
  args: { id: v.id("discountCode") },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.id);
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
