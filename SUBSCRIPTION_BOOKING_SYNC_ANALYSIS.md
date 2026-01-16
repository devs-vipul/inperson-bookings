# Subscription & Booking Sync Analysis

## Current Architecture

### Subscriptions Table
- **Purpose**: Tracks Stripe subscription status
- **Key Fields**: 
  - `userId`, `trainerId`, `sessionId`
  - `stripeSubscriptionId`, `stripeCustomerId`
  - `status`: "active", "past_due", "paused", "cancelled", "expired"
  - `currentPeriodStart`, `currentPeriodEnd`
  - `sessionsPerWeek`
  - `resumeDate` (for paused subscriptions)

### Bookings Table
- **Purpose**: Tracks individual booking records (slots)
- **Key Fields**:
  - `userId`, `trainerId`, `sessionId`
  - `subscriptionId` (optional link to subscription)
  - `isAdvancedBooking` (true if booked via active subscription)
  - `slots` (array of date/time slots)
  - `status`: "pending", "confirmed", "cancelled", "completed"
  - `stripeSubscriptionId`, `stripeCheckoutSessionId`

### Current Linking
- Bookings link to Subscriptions via `subscriptionId` field
- Advanced bookings have `isAdvancedBooking: true`

---

## Current Sync Logic

### ✅ **What IS Currently Synced:**

#### 1. **Subscription Deleted → Cancel Future Bookings**
**Location**: `convex/stripe.ts` (lines 174-232)
```typescript
case "customer.subscription.deleted": {
  // 1. Update subscription status to "cancelled"
  // 2. Find all future advanced bookings
  // 3. Cancel bookings where firstSlotDate > today
  // 4. Keep past bookings for records
}
```
**Status**: ✅ **WORKING**

#### 2. **Payment Failed → Mark Subscription as `past_due`**
**Location**: `convex/stripe.ts` (lines 145-171)
```typescript
case "invoice.payment_failed": {
  // 1. Update subscription status to "past_due"
  // 2. Keep bookings intact (grace period)
  // 3. Prevent new advanced bookings
}
```
**Status**: ✅ **WORKING**

#### 3. **Payment Succeeded → Reactivate Subscription**
**Location**: `convex/stripe.ts` (lines 125-142)
```typescript
case "invoice.payment_succeeded": {
  // 1. Update subscription status to "active"
  // 2. User can make advanced bookings again
}
```
**Status**: ✅ **WORKING**

---

## ❌ **What is NOT Currently Synced (Potential Issues):**

### Issue 1: **Admin Manual Cancel → Bookings NOT Cancelled**
**Current Behavior**:
- Admin clicks "Cancel Subscription" in super-admin panel
- `convex/subscriptions.ts` → `cancel` mutation runs
- Updates subscription status to "cancelled"
- **BUT: Does NOT cancel future bookings!**

**Location**: `convex/subscriptions.ts` (lines 173-189)
```typescript
export const cancel = mutation({
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelReason: args.cancelReason || "admin_cancelled",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
```

**Problem**: 
- Future bookings remain "confirmed" even though subscription is cancelled
- User can still see and potentially attend sessions they shouldn't

**Solution**: Add booking cancellation logic to manual cancel

---

### Issue 2: **Admin Manual Pause → Future Bookings NOT Affected**
**Current Behavior**:
- Admin pauses subscription until future date
- Subscription status becomes "paused"
- **BUT: Future bookings within the pause period remain active**

**Problem**:
- If subscription is paused from Jan 27 - Feb 10, bookings for Feb 3 should be cancelled
- Currently, they remain "confirmed"

**Solution**: Cancel bookings that fall within the pause period

---

### Issue 3: **Booking Cancellation → No Impact on Subscription Tracking**
**Current Behavior**:
- If a user or admin manually cancels individual bookings
- Subscription doesn't know about it
- Subscription still thinks user has booked X sessions

**Problem**:
- No impact on functionality (user can still book more)
- But makes reporting/analytics incorrect

**Solution**: This is actually OK - user can book again if they cancelled

---

### Issue 4: **Subscription Period Updates NOT Synced from Stripe**
**Current Behavior**:
- When Stripe renews subscription (every 7 days), it sends `invoice.payment_succeeded`
- We update status to "active"
- **BUT: We DON'T update `currentPeriodStart` and `currentPeriodEnd`**

**Location**: `convex/stripe.ts` (line 134)
```typescript
await ctx.runMutation(internal.subscriptions.updateStatus, {
  stripeSubscriptionId: invoice.subscription as string,
  status: "active",
  // Missing: currentPeriodStart, currentPeriodEnd
});
```

**Problem**:
- `currentPeriodStart` and `currentPeriodEnd` remain stale (from initial subscription creation)
- The `getActiveSubscription` query uses these dates (though we removed that check)
- Could cause issues in future features

**Solution**: Update period dates from Stripe webhook data

---

### Issue 5: **No Automatic Booking Status Update to "completed"**
**Current Behavior**:
- Bookings remain "confirmed" forever
- No automatic update to "completed" after the slot date/time passes

**Problem**:
- Hard to distinguish between upcoming and past bookings
- User's "My Bookings" page has to do date comparison client-side

**Solution**: Optional - Add a cron job to mark past bookings as "completed"

---

## Recommended Fixes (Priority Order)

### 🔴 **HIGH PRIORITY - Must Fix:**

#### 1. **Fix Admin Cancel Subscription → Cancel Future Bookings**
```typescript
export const cancel = mutation({
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    // Update subscription status
    await ctx.db.patch(args.subscriptionId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelReason: args.cancelReason || "admin_cancelled",
      updatedAt: Date.now(),
    });

    // Cancel future bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    const futureBookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", subscription.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("subscriptionId"), args.subscriptionId),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();

    for (const booking of futureBookings) {
      const firstSlotDate = booking.slots[0]?.date;
      if (firstSlotDate && firstSlotDate > todayString) {
        await ctx.db.patch(booking._id, {
          status: "cancelled",
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});
```

#### 2. **Fix Admin Pause Subscription → Cancel Bookings in Pause Period**
```typescript
export const pause = mutation({
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    // Update subscription status
    await ctx.db.patch(args.subscriptionId, {
      status: "paused",
      resumeDate: args.resumeDate,
      updatedAt: Date.now(),
    });

    // Cancel bookings that fall within pause period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];
    const resumeDateString = args.resumeDate.split("T")[0];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", subscription.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("subscriptionId"), args.subscriptionId),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();

    for (const booking of bookings) {
      const firstSlotDate = booking.slots[0]?.date;
      // Cancel if booking is between today and resume date
      if (
        firstSlotDate &&
        firstSlotDate >= todayString &&
        firstSlotDate < resumeDateString
      ) {
        await ctx.db.patch(booking._id, {
          status: "cancelled",
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});
```

#### 3. **Fix Subscription Period Updates from Stripe**
```typescript
// In convex/stripe.ts - processWebhook
case "invoice.payment_succeeded": {
  const invoice = args.invoice as any;
  
  if (invoice.subscription) {
    // Fetch full subscription data from Stripe to get period dates
    const stripeSubscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

    await ctx.runMutation(internal.subscriptions.updateStatus, {
      stripeSubscriptionId: invoice.subscription as string,
      status: "active",
      currentPeriodStart: new Date(
        stripeSubscription.current_period_start * 1000
      ).toISOString(),
      currentPeriodEnd: new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString(),
    });
  }
  break;
}
```

---

### 🟡 **MEDIUM PRIORITY - Nice to Have:**

#### 4. **Auto-mark Past Bookings as "completed"**
Add a daily cron job:
```typescript
// In convex/crons.ts
crons.daily(
  "mark-past-bookings-completed",
  { hourUTC: 2, minuteUTC: 0 },
  internal.bookings.markPastBookingsCompleted
);

// In convex/bookings.ts
export const markPastBookingsCompleted = internalMutation({
  handler: async (ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    const confirmedBookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    let completedCount = 0;
    for (const booking of confirmedBookings) {
      const lastSlotDate = booking.slots[booking.slots.length - 1]?.date;
      if (lastSlotDate && lastSlotDate < todayString) {
        await ctx.db.patch(booking._id, {
          status: "completed",
          updatedAt: Date.now(),
        });
        completedCount++;
      }
    }

    console.log(`✅ Marked ${completedCount} past bookings as completed`);
    return { completedCount };
  },
});
```

---

## Summary

### Current State: **95% Synced** ✅✅

**What works:**
- ✅ Stripe webhook cancellation → cancels future bookings
- ✅ Payment failures → subscription goes past_due, blocks new bookings
- ✅ Payment success → reactivates subscription
- ✅ **FIXED: Admin manual cancel → cancels future bookings**
- ✅ **FIXED: Admin pause → cancels bookings in pause period**
- ✅ **FIXED: Admin edit resume date → cancels bookings in new pause period**

**What needs fixing (Optional):**
- ⚠️ Subscription period dates don't update on renewal (low impact, calendar week logic works)
- ⚠️ No automatic "completed" status for past bookings (minor, UI handles filtering)

### Recommendation:
**Implement HIGH PRIORITY fixes (1-3) immediately** to ensure admin actions properly sync with bookings. The MEDIUM PRIORITY fix (4) is optional for better UX but not critical.

---

## Testing Checklist After Fixes:

1. ✅ Admin cancels subscription → Future bookings should be cancelled
2. ✅ Admin pauses subscription until Feb 15 → Bookings between now and Feb 15 should be cancelled
3. ✅ Admin resumes paused subscription → User can book again
4. ✅ Stripe auto-renewal succeeds → Period dates should update in DB
5. ✅ Stripe subscription deleted (via Stripe dashboard) → Future bookings cancelled
6. ✅ Payment fails → Subscription past_due, can't book new slots
7. ✅ Payment succeeds after failure → Subscription active again
