# BWF Fitness In-Person Bookings

Trainer availability, slot management, and user bookings built with Next.js, Convex, and shadcn/ui.

📖 **[Complete Documentation](./COMPLETE_DOCUMENTATION.md)** - Everything you need to know in one place!

## Features

- **Advanced Booking System**: Active subscribers can book up to 3 weeks ahead without payment, with automatic weekly billing.
- **Subscription Management**: Admin controls for pause/resume/cancel with automatic future booking cancellation.
- **Super-admin trainer management**: Create trainers, edit availability, create sessions with automatic Stripe product creation.
- **Calendar-based slot management**: Per trainer/date (30 & 60 min), with bulk toggle and per-slot toggles; booked slots are visible and locked.
- **User booking flow**: Availability-aware calendar, clean time slots, booked/disabled slots prevented, multi-slot selection up to package limit
- **Stripe payment integration**: Recurring weekly subscriptions, automatic checkout, webhook handling, payment failure recovery.
- **Email notifications**: Branded email templates with yellow theme, automatic booking confirmation to both user and trainer.
- **Booking confirmation page**: Modern, aesthetic confirmation screen with subscription status indicators.
- **User bookings list page**: View all booked sessions with trainer details (upcoming and past tabs).
- **Robust timezone handling**: `dateToLocalString`, `getDayName` to avoid UTC day shifts; slots generated on clean intervals.

## Tech Stack

- Next.js / React
- Convex (data + mutations/queries)
- Stripe (payments & subscriptions)
- Clerk (authentication)
- shadcn/ui for UI components
- TypeScript

## Key Paths

- Admin trainer detail: `app/super-admin/manage-trainer/trainers/[trainerId]/page.tsx`
- Admin calendar: `app/super-admin/manage-trainer/trainers/[trainerId]/calendar/page.tsx`
- User booking: `app/(user)/book/[trainerId]/[sessionId]/page.tsx`
- Booking confirmation: `app/(user)/booking-confirmation/page.tsx`
- User bookings list: `app/(user)/my-bookings/page.tsx`
- Stripe checkout API: `app/api/stripe/checkout/route.ts`
- Stripe webhook handler: `app/api/stripe/webhook/route.ts`
- Stripe product creation: `app/api/stripe/create-product/route.ts`
- Availability logic: `convex/availability.ts`
- Slot overrides: `convex/trainerSlots.ts`
- Bookings: `convex/bookings.ts`
- Stripe mutations: `convex/stripe.ts`
- Email sending: `convex/emails.ts`
- Email templates: `src/emails/booking-confirmation-user.tsx`, `src/emails/booking-confirmation-trainer.tsx`
- Time helpers: `lib/booking-utils.ts`

## Development

### Setup

1. Install dependencies: `npm install`
2. Run Convex dev: `npx convex dev`
3. Run dev server: `npm run dev`

### Environment Variables

Create `.env.local` with:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Stripe
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe CLI or Dashboard)

# Resend (Email Service)
RESEND_API_KEY=re_... (get from https://resend.com/api-keys)
RESEND_FROM_EMAIL=onboarding@resend.dev (optional - defaults to Resend's test domain)

# Stripe Bypass (Testing Only - Set to "true" to bypass Stripe payment)
NEXT_PUBLIC_BYPASS_STRIPE=false

# Clerk (if using)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

**Important Notes:**

- **RESEND_API_KEY**: Add this to your `.env.local` file. Get your API key from [Resend Dashboard](https://resend.com/api-keys)
- **RESEND_FROM_EMAIL**: (Optional) Set the "from" email address. Defaults to `onboarding@resend.dev` (Resend's test domain) if not set.
  - For testing: Use `onboarding@resend.dev` (works immediately, no domain verification needed)
  - For production: Use your verified domain (e.g., `noreply@yourdomain.com`)
  - If `breezewayfitness.com` is already registered in Resend, you can:
    1. Use `onboarding@resend.dev` for testing (recommended)
    2. Verify a subdomain (e.g., `mail.breezewayfitness.com`)
    3. Contact Resend support to transfer the domain to your account
- For Convex to access environment variables, you need to set them in your Convex dashboard under Settings > Environment Variables.
- **NEXT_PUBLIC_BYPASS_STRIPE**: Set to `"true"` to bypass Stripe payment for testing. When enabled, bookings are created directly and emails are sent. Set to `"false"` or remove to use normal Stripe payment flow.

### Stripe Webhook Setup

#### Local Development (localhost)

**Use Stripe CLI** - No Dashboard configuration needed:

```bash
# Run in a separate terminal (keep it running)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Important:**

- Replace `3000` with your actual Next.js port if different
- Keep this terminal window open while developing
- Copy the webhook signing secret (starts with `whsec_`) from the output
- Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`
- **Don't create webhook in Stripe Dashboard** - CLI handles it automatically

**Test webhook:**

```bash
stripe trigger checkout.session.completed
```

#### Production (Live/Domain)

**Use Stripe Dashboard** - Configure webhook endpoint:

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to production environment variables as `STRIPE_WEBHOOK_SECRET`

**Note:** For localhost, use Stripe CLI. For production, use Dashboard.

## Payment & Booking Flow

### Booking Process:

1. User selects slots and clicks "Book X Sessions"
2. System redirects to Stripe Checkout for payment
3. User completes payment (creates weekly recurring subscription)
4. Stripe webhook confirms payment (`checkout.session.completed`)
5. Booking is created in database with `stripeSubscriptionId`
6. User redirected to booking confirmation page

### Stripe Integration:

- **Products created automatically**: When super-admin creates a session, Stripe product and price are created automatically
- **Recurring payments**: Weekly subscriptions charge automatically
- **Webhook handling**: All payment events processed via webhooks
- **Booking confirmation**: Modern confirmation page shows booking details

### Key Files:

- Stripe checkout: `app/api/stripe/checkout/route.ts`
- Webhook handler: `app/api/stripe/webhook/route.ts`
- Product creation: `app/api/stripe/create-product/route.ts`
- Stripe mutations: `convex/stripe.ts`
- Booking confirmation: `app/(user)/booking-confirmation/page.tsx`

## Notes

- Always use shadcn components for new UI.
- Bulk "All Slots" toggle excludes booked slots; booked slots show `(Booked)` and their switches are disabled.
- Disable past dates and dates without availability in calendars.
- Stripe products are created when sessions are created by super-admin.
- Webhook forwarding must be running during local development.
  This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
