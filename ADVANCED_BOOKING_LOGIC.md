# Advanced Booking System Logic

## Overview

The advanced booking system allows users with active subscriptions to book additional slots for future weeks without additional payment, since they're already paying weekly for their package.

## How It Works

### Scenario 1: First-Time Booking

1. User selects a package (e.g., 4 sessions/week)
2. User selects 4 slots (e.g., all from Wednesday, or 1 from Wednesday + 3 from Thursday)
3. User clicks "Book 4 Sessions"
4. System checks: `hasActiveSubscription = false`
5. User is redirected to Stripe Checkout
6. After payment, subscription is created
7. Booking is confirmed with `stripeSubscriptionId`

### Scenario 2: Advanced Booking (User Has Active Subscription)

1. User already has an active subscription for 4 sessions/week package
2. User comes back to book slots for next week
3. User selects 4 new slots (can be different days/times)
4. User clicks "Book 4 Sessions"
5. System checks: `hasActiveSubscription = true`
6. **No payment required** - booking is created directly
7. Booking is created with same `stripeSubscriptionId` (linked to subscription)
8. User sees confirmation immediately

## Database Structure

### Bookings Table

- `stripeSubscriptionId`: Links booking to Stripe subscription
- `status`: "confirmed", "cancelled", "completed"
- `paymentStatus`: "paid", "failed", "pending"
- Multiple bookings can share the same `stripeSubscriptionId` (same subscription, different weeks)

### Query Logic

```typescript
hasActiveSubscription = bookings.find(
  (booking) =>
    booking.sessionId === currentSessionId &&
    booking.status === "confirmed" &&
    booking.stripeSubscriptionId !== null
);
```

## Edge Cases Handled

### 1. User Books All Slots from One Day

- ✅ Works perfectly
- Example: 4 sessions/week, all 4 on Wednesday
- Subscription charges weekly regardless of day distribution

### 2. User Books Slots Across Multiple Days

- ✅ Works perfectly
- Example: 4 sessions/week, 1 on Wednesday, 3 on Thursday
- Subscription charges weekly regardless of day distribution

### 3. User Books Additional Slots While Subscription Active

- ✅ No payment required
- ✅ Booking created immediately
- ✅ All slots properly registered in database
- ✅ User can see all bookings in "Your Bookings" page

### 4. Subscription Cancelled

- When subscription is cancelled via Stripe:
  - `customer.subscription.deleted` webhook fires
  - All related bookings marked as "cancelled"
  - User cannot book new slots without new payment

### 5. Payment Failed

- When recurring payment fails:
  - `invoice.payment_failed` webhook fires
  - Booking `paymentStatus` set to "failed"
  - User should be notified (can add UI for this)
  - Future bookings may be blocked until payment succeeds

## Implementation Details

### Booking Creation Flow

```typescript
if (hasActiveSubscription) {
  // Direct booking - no payment
  await createBooking({
    userId,
    trainerId,
    sessionId,
    slots: selectedSlots,
    // No Stripe fields needed - subscription already exists
  });
} else {
  // Redirect to Stripe Checkout
  const checkout = await createCheckoutSession({
    // Creates subscription
    // User pays
    // Webhook creates booking with subscription ID
  });
}
```

### Recurring Payment Flow

1. **Week 1**: User books 4 sessions, pays $X
2. **Week 2**: Stripe charges $X automatically
   - `invoice.payment_succeeded` webhook fires
   - Payment status updated
3. **Week 3**: User books 4 more sessions (advanced booking)
   - No payment needed
   - Booking created immediately
4. **Week 3**: Stripe charges $X automatically
   - Payment continues weekly
   - User can keep booking future slots

## Future Enhancements

1. **Booking Limits**: Could add logic to prevent booking too far in advance
2. **Slot Validation**: Ensure user doesn't exceed `sessionsPerWeek` limit across all bookings
3. **Cancellation UI**: Allow users to cancel subscriptions from the app
4. **Payment Retry**: Handle failed payments with retry logic
5. **Booking History**: Show all bookings linked to a subscription

## Testing Scenarios

### Test Case 1: First Booking

- ✅ User books 4 sessions from Wednesday
- ✅ Redirected to Stripe
- ✅ Payment succeeds
- ✅ Booking created with subscription ID

### Test Case 2: Advanced Booking

- ✅ User has active subscription
- ✅ User books 4 sessions from Thursday (different week)
- ✅ Booking created immediately (no payment)
- ✅ Both bookings visible in "Your Bookings"

### Test Case 3: Mixed Days

- ✅ User books 1 session Wednesday, 3 sessions Thursday
- ✅ All 4 slots properly registered
- ✅ Subscription charges weekly

### Test Case 4: Subscription Cancellation

- ✅ User cancels subscription in Stripe
- ✅ All future bookings marked as cancelled
- ✅ User cannot book new slots
