# Stripe Integration Setup Guide

## Environment Variables Required

Add the following to your `.env.local` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard > Webhooks)

# Convex URL (should already exist)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## Stripe Dashboard Setup

1. **Get API Keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to Developers > API keys
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Add to `.env.local` as `STRIPE_SECRET_KEY`

2. **Set up Webhook:**
   - Go to Developers > Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Select events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (starts with `whsec_`)
   - Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

3. **Enable Recurring Payments:**
   - Ensure your Stripe account has subscriptions enabled
   - No additional setup needed - the code handles weekly recurring payments automatically

## How It Works

### Initial Booking Flow:
1. User selects slots and clicks "Book X Sessions"
2. System checks if user has active subscription:
   - **If YES**: Creates booking directly (no payment needed - advanced booking)
   - **If NO**: Redirects to Stripe Checkout
3. User completes payment in Stripe
4. Stripe webhook confirms payment
5. Booking is created in database with subscription ID
6. User is redirected to confirmation page

### Recurring Payments:
- Stripe automatically charges the customer weekly
- Each week, `invoice.payment_succeeded` webhook fires
- System updates booking payment status
- User can continue booking additional slots without payment (advanced booking)

### Advanced Booking System:
When a user has an active subscription:
- They can book additional slots for future weeks
- No payment required (already paying weekly)
- All bookings are properly registered in database
- Slots are reserved immediately

## Testing

### Test Mode:
- Use `sk_test_...` keys
- Use test card: `4242 4242 4242 4242`
- Any future expiry date and CVC

### Production:
- Use `sk_live_...` keys
- Real payments will be processed
- Ensure webhook URL is publicly accessible

## Important Notes

1. **Webhook Security**: The webhook endpoint verifies Stripe signatures to ensure requests are from Stripe
2. **Idempotency**: Stripe handles duplicate webhook events automatically
3. **Error Handling**: Failed payments are logged and booking status is updated
4. **Subscription Management**: Users can cancel subscriptions through Stripe Dashboard (or you can add UI for this)
