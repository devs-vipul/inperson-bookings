# BWF Fitness In-Person Training - Complete Documentation

**Version**: 1.0.0  
**Last Updated**: January 16, 2026  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Setup & Installation](#setup--installation)
4. [Environment Variables](#environment-variables)
5. [Stripe Integration](#stripe-integration)
6. [Advanced Booking System](#advanced-booking-system)
7. [Subscription Management](#subscription-management)
8. [Availability & Toggle System](#availability--toggle-system)
9. [Key Features](#key-features)
10. [File Structure](#file-structure)
11. [Development Workflow](#development-workflow)
12. [Testing Guide](#testing-guide)
13. [Production Deployment](#production-deployment)
14. [Troubleshooting](#troubleshooting)

---

## 📖 Project Overview

BWF Fitness In-Person Training is a comprehensive booking system for trainers and clients, featuring:

- Trainer availability management with calendar-based slot controls
- User booking flow with real-time availability
- Stripe subscription-based recurring weekly payments
- Advanced booking system for active subscribers
- Email notifications for bookings
- Super-admin dashboard for managing trainers, sessions, and bookings

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Convex (Real-time database, mutations, queries, actions)
- **Payments**: Stripe (Subscriptions, Checkout, Webhooks)
- **Authentication**: Clerk
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Email**: Resend + React Email
- **Animations**: Framer Motion

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+ installed
- npm/yarn/pnpm package manager
- Stripe account (test mode for development)
- Convex account
- Clerk account (for authentication)

### Installation Steps

1. **Clone the repository**

   ```bash
   cd /path/to/Breezeway-New/InPerson-bookings/bwf-fitness-inperson
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up environment variables** (see [Environment Variables](#environment-variables))

4. **Start Convex development server**

   ```bash
   npx convex dev
   ```

   - Keep this terminal running
   - It will sync your schema and functions

5. **Start Next.js development server**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - User side: `/`
   - Admin dashboard: `/super-admin`

---

## 🔐 Environment Variables

### Create `.env.local` file

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Stripe
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # from Stripe CLI or Dashboard

# Resend (Email Service)
RESEND_API_KEY=re_... # get from https://resend.com/api-keys
RESEND_FROM_EMAIL=onboarding@resend.dev # or your verified domain

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Testing (Optional)
NEXT_PUBLIC_BYPASS_STRIPE=false # Set to "true" to bypass Stripe for testing
```

### Important Notes:

#### Convex Environment Variables

For Convex backend functions, you also need to set environment variables in your Convex dashboard:

```bash
# Run this command to set Stripe key in Convex
npx convex env set STRIPE_SECRET_KEY sk_test_...
```

Or set it manually:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to Settings → Environment Variables
3. Add `STRIPE_SECRET_KEY`

#### Resend Email

- **Testing**: Use `onboarding@resend.dev` (works immediately, no domain verification)
- **Production**: Use your verified domain (e.g., `noreply@yourdomain.com`)
- If domain already registered in Resend, use test domain or verify a subdomain

#### Stripe Bypass Mode

- Set `NEXT_PUBLIC_BYPASS_STRIPE=true` for testing without Stripe
- Bookings are created directly and emails are sent
- Set to `false` or remove for normal Stripe payment flow

---

## 💳 Stripe Integration

### Setup Steps

#### 1. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Add to `.env.local` as `STRIPE_SECRET_KEY`

#### 2. Install Stripe CLI (for local development)

**macOS (Option 1 - Homebrew)**:

```bash
brew install stripe/stripe-cli/stripe
```

**macOS (Option 2 - Direct Download)**:

1. Go to [Stripe CLI releases](https://github.com/stripe/stripe-cli/releases/latest)
2. Download the macOS `.tar.gz` file
3. Extract and move to PATH:
   ```bash
   tar -xzf stripe_*.tar.gz
   sudo mv stripe /usr/local/bin/
   stripe --version
   ```

**Windows (using Scoop)**:

```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

#### 3. Login to Stripe CLI

```bash
stripe login
```

- Opens browser for authentication
- Links your local CLI to Stripe account

#### 4. Set up Webhook Forwarding

##### Local Development (localhost)

Run in a **separate terminal** (keep it running):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Important:**

- Replace `3000` with your actual Next.js port if different
- Keep this terminal running while developing
- Copy the webhook signing secret (starts with `whsec_`)
- Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`
- Restart your Next.js dev server after updating `.env.local`

**Test webhook:**

```bash
stripe trigger checkout.session.completed
```

##### Production (Live/Domain)

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click "Add endpoint"
3. **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
4. **Select events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to production environment variables as `STRIPE_WEBHOOK_SECRET`

### Payment & Booking Flow

```
User Booking Flow:
1. User selects trainer and session
2. User selects time slots
3. Clicks "Book X Sessions"
4. System checks for active subscription:
   - If YES → Advanced booking (no payment)
   - If NO → Redirect to Stripe Checkout
5. User completes payment (creates weekly recurring subscription)
6. Stripe webhook confirms payment (checkout.session.completed)
7. Booking + Subscription created in database
8. User redirected to confirmation page
9. Emails sent to user and trainer
```

### Recurring Payments

- **Frequency**: Weekly
- **Mode**: Subscription (`mode: "subscription"`)
- **Interval**: Week (`recurring: { interval: "week" }`)
- Stripe automatically charges weekly
- `invoice.payment_succeeded` webhook fires on successful payment
- `invoice.payment_failed` webhook fires on failed payment

### Webhook Events Handled

| Event                           | Action                             |
| ------------------------------- | ---------------------------------- |
| `checkout.session.completed`    | Creates booking + subscription     |
| `invoice.payment_succeeded`     | Updates subscription to `active`   |
| `invoice.payment_failed`        | Updates subscription to `past_due` |
| `customer.subscription.deleted` | Cancels future bookings            |

---

## 🎯 Advanced Booking System

### Overview

The Advanced Booking System allows users with **active subscriptions** to book training sessions without additional payment. This is the core feature that enables seamless booking for returning customers.

### Key Features

#### 1. Automatic Subscription Detection

- System automatically detects if a user has an active subscription
- Shows subscription status prominently on booking page
- Displays available slots remaining in current period

#### 2. Booking Limits

- **2-Week Advance Limit**: Users can only book up to 2 weeks in advance
- **Weekly Session Limit**: Based on subscription plan (e.g., 3 sessions/week)
- **Period Tracking**: Counts bookings within current subscription period

#### 3. Payment Failure Handling

- **Grace Period**: Existing bookings preserved during payment retry
- **Booking Prevention**: New bookings blocked during `past_due` status
- **Visual Warnings**: Clear UI indicators when payment issues occur
- **Auto-Recovery**: Booking resumes automatically when payment succeeds

#### 4. Visual Indicators

- **Subscription Badge** (🔄 Subscription): Shows on booking cards
- **Status Colors**:
  - Green: Active subscription
  - Red: Payment issue (past_due)
  - Purple: Subscription booking badge
  - Yellow: Regular booking (no subscription)

### User Flow Examples

#### New User (No Subscription)

```
1. User selects trainer and session
2. User selects time slots
3. Clicks "Book Sessions"
4. Redirected to Stripe Checkout
5. Payment processed
6. Subscription created ✅
7. Booking confirmed with emails sent
```

#### Existing Subscriber (Active)

```
1. User selects trainer and session
2. System detects active subscription
3. Shows subscription status card:
   - Sessions per week
   - Already booked this period
   - Remaining sessions available
4. User selects time slots (within limits)
5. Clicks "Book with Subscription"
6. Booking created immediately (no payment) ✅
7. Confirmation emails sent
```

#### Subscriber with Payment Issues (Past Due)

```
1. User selects trainer and session
2. System detects past_due subscription
3. Shows warning message:
   "Your subscription payment failed. Stripe is attempting to process your payment."
4. Booking button disabled
5. Existing bookings remain safe ✅
6. Once payment succeeds via Stripe retry:
   - Status changes to "active"
   - User can book again
```

### Payment Failure & Grace Period

#### Stripe Auto-Retry Schedule

Stripe automatically retries failed payments:

- **1st retry**: 3 days after failure
- **2nd retry**: 5 days after failure
- **3rd retry**: 7 days after failure
- **Final**: Subscription cancelled if all retries fail

#### System Behavior

| Stage                | Subscription Status | Existing Bookings                          | New Bookings | UI State              |
| -------------------- | ------------------- | ------------------------------------------ | ------------ | --------------------- |
| **Initial Failure**  | `past_due`          | ✅ Preserved                               | ❌ Blocked   | ⚠️ Warning shown      |
| **During Retries**   | `past_due`          | ✅ Preserved                               | ❌ Blocked   | ⚠️ Warning shown      |
| **Payment Success**  | `active`            | ✅ Preserved                               | ✅ Allowed   | ✅ Normal             |
| **All Retries Fail** | `cancelled`         | Past: ✅ Preserved<br>Future: ❌ Cancelled | ❌ Blocked   | 🚫 Subscription ended |

### Technical Implementation

#### Database Schema

**Subscriptions Table** (`convex/schema.ts`):

```typescript
subscriptions: defineTable({
  userId: v.id("users"),
  trainerId: v.id("trainers"),
  sessionId: v.id("sessions"),
  stripeSubscriptionId: v.string(),
  stripeCustomerId: v.string(),
  status: v.string(), // "active", "past_due", "cancelled", "paused", "expired"
  currentPeriodStart: v.string(), // ISO date string
  currentPeriodEnd: v.string(), // ISO date string
  sessionsPerWeek: v.number(),
  resumeDate: v.optional(v.string()), // ISO date string - for paused
  cancelledAt: v.optional(v.number()),
  cancelReason: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user_id", ["userId"])
  .index("by_trainer_id", ["trainerId"])
  .index("by_session_id", ["sessionId"])
  .index("by_stripe_subscription", ["stripeSubscriptionId"])
  .index("by_user_trainer_session", ["userId", "trainerId", "sessionId"])
  .index("by_status", ["status"])
  .index("by_resume_date_status", ["resumeDate", "status"]);
```

**Bookings Table (Enhanced)**:

```typescript
bookings: defineTable({
  // ... existing fields ...
  subscriptionId: v.optional(v.id("subscriptions")),
  isAdvancedBooking: v.optional(v.boolean()), // true for subscription bookings
  // ... existing fields ...
});
```

#### Key Functions

**File**: `convex/bookings.ts`

- `createAdvancedBooking`: Creates booking without payment
  - Validates 2-week limit
  - Checks weekly session limit
  - Verifies slot availability
  - Sends confirmation emails

**File**: `convex/subscriptions.ts`

- `getActiveSubscription`: Checks for active subscription
- `getByTrainerId`: Gets all subscriptions for a trainer
- `pause`: Pauses subscription with resume date
- `resume`: Resumes paused subscription
- `cancel`: Cancels subscription
- `updateResumeDate`: Updates resume date for paused subscription

**File**: `convex/stripe.ts`

- Webhook handlers for all Stripe events
- `pauseInStripe`: Pauses subscription in Stripe
- `resumeInStripe`: Resumes subscription in Stripe
- `cancelInStripe`: Cancels subscription in Stripe

**File**: `convex/crons.ts`

- `auto-resume-subscriptions`: Runs daily at 1 AM UTC
- Resumes paused subscriptions automatically
- Updates both Convex DB and Stripe

---

## 🔄 Subscription Management

### Admin Features

#### Location

`/super-admin/manage-trainer/trainers/[trainerId]`

#### Booked Sessions Section

Shows all subscriptions for the trainer with:

- User name and email
- Package name and duration
- Sessions per week
- Current period dates
- Resume date (for paused subscriptions)
- Status badge (color-coded)

#### 3-Dot Menu Actions

**For Active Subscriptions:**

- **Pause** - Opens dialog with calendar to select resume date
- **Cancel** - Confirms and cancels subscription permanently

**For Paused Subscriptions:**

- **Resume Instantly** - Immediately resumes subscription
- **Edit Resume Date** - Opens dialog to change resume date
- **Cancel** - Confirms and cancels subscription permanently

#### UI Components

**`components/super-admin/pause-subscription-dialog.tsx`**

- Shadcn Dialog with Calendar picker
- User selects resume date
- Updates Convex database and Stripe
- Styled with yellow theme

**`components/super-admin/cancel-subscription-alert.tsx`**

- Shadcn AlertDialog for confirmation
- Cancels subscription in both Convex and Stripe
- Warns about permanent action

**`components/super-admin/edit-resume-date-dialog.tsx`**

- Shadcn Dialog with Calendar picker
- Updates resume date of paused subscription
- Updates Convex database and Stripe pause settings

### Subscription Status Flow

```
checkout.session.completed
    ↓
ACTIVE (subscription created)
    ↓
    ├─→ invoice.payment_failed → PAST_DUE
    │       ↓
    │       └─→ (Stripe retries payment)
    │               ↓
    │               ├─→ Success → ACTIVE
    │               └─→ Final Failure → CANCELLED
    │
    ├─→ Admin Pause → PAUSED
    │       ↓
    │       ├─→ Resume Instantly → ACTIVE
    │       ├─→ Auto-Resume (cron) → ACTIVE
    │       └─→ Admin Cancel → CANCELLED
    │
    └─→ Admin Cancel → CANCELLED
```

---

## 🔧 Availability & Toggle System

### Overview

The availability system has two layers of control:

1. **Day-Level Toggles** (Weekly Schedule)
2. **Slot-Level Toggles** (Date-Specific)

### Day-Level Toggles

**Location**: Trainer Details Page (`/super-admin/manage-trainer/trainers/[trainerId]`)

**What it controls**:

- Entire day on/off (Monday, Tuesday, etc.)
- Database field: `availability.isActive` (boolean)
- Effect: When OFF, users cannot see or book ANY slots for that day

**Implementation**:

```typescript
<Switch
  checked={avail.isActive}
  onCheckedChange={async (checked) => {
    await toggleSlot({
      id: avail._id,
      isActive: checked,
    });
  }}
/>
```

**User Impact**:

- ✅ When `isActive = true` → Day is visible in calendar
- ❌ When `isActive = false` → Day disappears from calendar

### Slot-Level Toggles

**Location**: Manage Slots Calendar (`/super-admin/manage-trainer/trainers/[trainerId]/calendar`)

**What it controls**:

- Individual time slots on specific dates
- Database: `trainerSlots` table
- Purpose: Disable specific dates (vacation, holidays)

**Features**:

- Toggle individual slots on/off
- "Toggle All Slots" button for bulk operations
- Booked slots are locked (cannot be toggled)
- Statistics showing total/active/inactive/booked slots

### How They Work Together

```
Architecture Flow:
┌─────────────────────────────────────────────────┐
│          Admin Toggles Day                      │
│     (Monday isActive: true → false)             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
     ┌────────────────────────┐
     │   Convex Database      │
     │   availability.isActive│
     │   = false              │
     └────────────┬───────────┘
                  │
     ┌────────────┴───────────────┐
     │                            │
     ▼                            ▼
┌────────────────┐    ┌──────────────────────┐
│   User Side    │    │   Admin Side         │
│   Booking      │    │   Manage Slots       │
│                │    │                      │
│ Monday =       │    │ Monday = disabled    │
│ hidden         │    │ (shows as inactive)  │
└────────────────┘    └──────────────────────┘
```

**Priority**: Day-Level Toggle **overrides** Slot-Level Toggle

- If Monday is disabled at day-level, slot-level toggles don't matter
- Both must be enabled for slots to appear

### When to Use Each Toggle

| Scenario                                    | Use Which Toggle?                                  |
| ------------------------------------------- | -------------------------------------------------- |
| Trainer never works Sundays                 | **Day-Level Toggle** (disable Sunday)              |
| Trainer on vacation Jan 20                  | **Slot-Level Toggle** (disable that specific date) |
| Trainer changes weekly schedule permanently | **Day-Level Toggle**                               |
| Trainer takes a sick day                    | **Slot-Level Toggle**                              |

---

## ✨ Key Features

### User Features

1. **Browse Trainers** (`/our-trainers`)
   - View all active trainers
   - See trainer profiles and expertise
   - Hover effects with trainer details
   - Book appointment button

2. **View Trainer Details** (`/our-trainers/[trainerId]`)
   - Trainer profile with image
   - Expertise list
   - Description
   - Available sessions (30-min/60-min tabs)
   - Session packages with pricing
   - "Book Now" buttons

3. **Book Sessions** (`/book/[trainerId]/[sessionId]`)
   - Calendar with available dates
   - Time slot selection
   - Subscription status card (if active)
   - Multiple slot selection
   - Visual feedback for selected slots
   - Payment via Stripe or advanced booking

4. **My Bookings** (`/your-bookings`)
   - View all bookings (upcoming/past tabs)
   - Trainer info and session details
   - Booked slots with dates/times
   - Subscription badge for advanced bookings
   - Status badges (confirmed/cancelled)

5. **Booking Confirmation** (`/booking-confirmation`)
   - Success message with booking details
   - Trainer info
   - Session details
   - All booked slots
   - Payment information

### Admin Features

1. **Trainer Management** (`/super-admin/trainers`)
   - Create new trainers
   - Edit trainer profiles
   - Set availability (days and times)
   - Upload trainer images

2. **Session Management** (Trainer Detail Page)
   - Create 30-min and 60-min session packages
   - Set pricing and sessions per week
   - Automatic Stripe product creation
   - Edit/delete sessions

3. **Slot Management** (`/super-admin/manage-trainer/trainers/[trainerId]/calendar`)
   - Calendar view for specific dates
   - Toggle individual slots
   - Bulk toggle for all slots
   - View booked slots (locked)
   - Statistics (total/active/inactive/booked)

4. **Booking Management** (`/super-admin/manage-trainer/trainers/[trainerId]/bookings`)
   - View all bookings for trainer
   - Filter by upcoming/past/all
   - User information
   - Booking details
   - Subscription indicators

5. **Subscription Management** (Trainer Detail Page - Booked Sessions)
   - View all active subscriptions
   - Pause subscriptions with resume date
   - Resume subscriptions instantly
   - Edit resume dates
   - Cancel subscriptions
   - View subscription status and period

### UI/UX Highlights

- **Yellow Theme**: Brand color (#F2D578) used throughout
- **Dark Mode**: Full dark mode support
- **Smooth Animations**: Framer Motion for buttery transitions
- **Responsive Design**: Works on all devices
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Real-time Updates**: Convex provides instant updates
- **Toast Notifications**: User feedback for all actions

---

## 📁 File Structure

### Key Paths

#### User Pages

- Homepage: `app/(user)/page.tsx`
- Trainers list: `app/(user)/our-trainers/page.tsx`
- Trainer details: `app/(user)/our-trainers/[trainerId]/page.tsx`
- Booking: `app/(user)/book/[trainerId]/[sessionId]/page.tsx`
- My bookings: `app/(user)/your-bookings/page.tsx`
- Confirmation: `app/(user)/booking-confirmation/page.tsx`
- Booking failed: `app/(user)/booking-failed/page.tsx`

#### Admin Pages

- Trainers: `app/super-admin/trainers/page.tsx`
- Trainer details: `app/super-admin/manage-trainer/trainers/[trainerId]/page.tsx`
- Manage slots: `app/super-admin/manage-trainer/trainers/[trainerId]/calendar/page.tsx`
- Trainer bookings: `app/super-admin/manage-trainer/trainers/[trainerId]/bookings/page.tsx`

#### API Routes

- Stripe checkout: `app/api/stripe/checkout/route.ts`
- Stripe webhook: `app/api/stripe/webhook/route.ts`
- Stripe product creation: `app/api/stripe/create-product/route.ts`

#### Convex Backend

- Schema: `convex/schema.ts`
- Availability: `convex/availability.ts`
- Bookings: `convex/bookings.ts`
- Subscriptions: `convex/subscriptions.ts`
- Trainer slots: `convex/trainerSlots.ts`
- Stripe: `convex/stripe.ts`
- Emails: `convex/emails.ts`
- Cron jobs: `convex/crons.ts`

#### Email Templates

- User confirmation: `src/emails/booking-confirmation-user.tsx`
- Trainer notification: `src/emails/booking-confirmation-trainer.tsx`

#### Utilities

- Booking utils: `lib/booking-utils.ts`
- Stripe: `lib/stripe.ts`
- Utils: `lib/utils.ts`

#### Components

- UI components: `components/ui/` (shadcn)
- Admin components: `components/super-admin/`
- Theme toggle: `components/theme-toggle.tsx`
- User navbar: `components/user-navbar.tsx`
- Trainer image: `components/trainer-image.tsx`

---

## 🔄 Development Workflow

### Daily Development

1. **Start Convex** (terminal 1):

   ```bash
   npx convex dev
   ```

2. **Start Stripe CLI** (terminal 2 - if testing payments):

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **Start Next.js** (terminal 3):
   ```bash
   npm run dev
   ```

### Making Changes

#### Database Schema Changes

1. Edit `convex/schema.ts`
2. Convex dev will automatically push changes
3. Check for errors in Convex terminal
4. No migration needed - Convex handles it

#### Adding New Mutations/Queries

1. Create/edit file in `convex/` directory
2. Import necessary types from `convex/values`
3. Use `mutation`, `query`, or `action` from `./_generated/server`
4. Convex dev auto-pushes changes
5. Use in frontend with `useMutation`, `useQuery`, or `useAction`

#### Frontend Changes

1. Edit files in `app/` or `components/`
2. Next.js hot-reloads automatically
3. Check browser console for errors
4. Test functionality

### Debugging

#### Convex Logs

- Check Convex dev terminal for backend logs
- Use `console.log()` in Convex functions
- View logs in [Convex Dashboard](https://dashboard.convex.dev)

#### Stripe Webhooks

- Check Stripe CLI terminal for webhook events
- Look for emoji indicators (🔔 ✅ ❌ ⚠️)
- Verify webhook signature in logs
- Test with: `stripe trigger checkout.session.completed`

#### Database Queries

In Convex Dashboard:

```javascript
// Check subscriptions
db.query("subscriptions")
  .filter((q) => q.eq(q.field("userId"), "USER_ID"))
  .collect();

// Check bookings
db.query("bookings")
  .filter((q) => q.eq(q.field("isAdvancedBooking"), true))
  .collect();
```

---

## 🧪 Testing Guide

### Test Scenarios

#### ✅ Scenario 1: New Subscription

1. Navigate to trainer booking page
2. Select 3 sessions/week package
3. Book 3 slots for current week
4. Use test card: `4242 4242 4242 4242`
5. Verify subscription created in Convex
6. Verify booking shows without "Subscription" badge

#### ✅ Scenario 2: Advanced Booking

1. With active subscription, return to booking page
2. Verify subscription status card shows
3. Book additional slots for next week
4. Verify no payment required
5. Verify booking shows "🔄 Subscription" badge

#### ✅ Scenario 3: Weekly Limit

1. Try to book more than sessions/week
2. Verify error message shows
3. Verify booking blocked

#### ✅ Scenario 4: 2-Week Limit

1. Try to book 3 weeks in advance
2. Verify error message shows
3. Verify booking blocked

#### ✅ Scenario 5: Payment Failure

1. Use Stripe test card for decline: `4000 0000 0000 0341`
2. Webhook marks subscription as `past_due`
3. Verify warning shows on booking page
4. Verify new bookings blocked
5. Verify existing bookings preserved

#### ✅ Scenario 6: Payment Recovery

1. Stripe retries payment (simulate in test mode)
2. Webhook marks subscription as `active`
3. Verify warning cleared
4. Verify new bookings allowed again

#### ✅ Scenario 7: Subscription Management

1. Pause subscription with future resume date
2. Verify status in Stripe Dashboard
3. Resume subscription instantly
4. Verify status updated everywhere
5. Cancel subscription
6. Verify future bookings cancelled

#### ✅ Scenario 8: Slot Management

1. Toggle day-level availability off
2. Verify day disappears from user calendar
3. Toggle specific date slots off
4. Verify date shows but no slots available
5. Try to toggle booked slot
6. Verify it's locked and cannot be toggled

### Stripe Test Cards

| Scenario               | Card Number         | Expiry          | CVC          |
| ---------------------- | ------------------- | --------------- | ------------ |
| **Success**            | 4242 4242 4242 4242 | Any future date | Any 3 digits |
| **Decline**            | 4000 0000 0000 0341 | Any future date | Any 3 digits |
| **Insufficient Funds** | 4000 0000 0000 9995 | Any future date | Any 3 digits |
| **Processing Error**   | 4000 0000 0000 0119 | Any future date | Any 3 digits |

### Manual Testing Checklist

#### User Flow

- [ ] Browse trainers
- [ ] View trainer details
- [ ] Select session package
- [ ] Book slots (first time - with payment)
- [ ] Complete Stripe checkout
- [ ] Verify booking confirmation page
- [ ] Check email received
- [ ] View "My Bookings" page
- [ ] Book additional slots (advanced booking)
- [ ] Verify no payment required for advanced booking

#### Admin Flow

- [ ] Create new trainer
- [ ] Upload trainer image
- [ ] Set availability (days/times)
- [ ] Create session packages
- [ ] Verify Stripe products created
- [ ] Manage slots (toggle specific dates)
- [ ] View trainer bookings
- [ ] Pause subscription
- [ ] Resume subscription
- [ ] Cancel subscription
- [ ] Verify all changes reflect in user side

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

#### Environment Variables

- [ ] Set all production environment variables
- [ ] Use `sk_live_...` for Stripe (not `sk_test_...`)
- [ ] Set production webhook secret
- [ ] Use verified email domain for Resend
- [ ] Set `NEXT_PUBLIC_BYPASS_STRIPE=false`

#### Convex

- [ ] Deploy to production: `npx convex deploy`
- [ ] Set environment variables in Convex Dashboard
- [ ] Verify all functions deployed successfully
- [ ] Test queries/mutations in production

#### Stripe

- [ ] Switch to live mode in Stripe Dashboard
- [ ] Create webhook for production URL
- [ ] Add all required events to webhook
- [ ] Copy production webhook secret
- [ ] Test webhook in live mode

#### Testing

- [ ] Test booking flow end-to-end
- [ ] Test payment processing
- [ ] Test webhook handling
- [ ] Test email sending
- [ ] Test subscription management
- [ ] Test advanced booking
- [ ] Test on mobile devices

### Deployment Steps

1. **Build Next.js**

   ```bash
   npm run build
   ```

2. **Deploy Convex**

   ```bash
   npx convex deploy
   ```

3. **Deploy to Vercel/Netlify/Your Host**

   ```bash
   # Follow your hosting provider's instructions
   vercel deploy --prod
   ```

4. **Set Environment Variables** in hosting dashboard

5. **Create Stripe Webhook** for production URL

6. **Test Production**
   - Use live Stripe cards
   - Verify all features work
   - Monitor logs for errors

### Post-Deployment

#### Monitoring

- Check Convex Dashboard for errors
- Monitor Stripe Dashboard for webhook events
- Review email delivery in Resend Dashboard
- Check application logs

#### Maintenance

- Regularly review subscription statuses
- Monitor payment failures
- Check for cancelled subscriptions
- Review booking patterns

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Stripe Webhook Not Working

**Symptoms**:

- Payment succeeds but booking not created
- Webhook events not showing in logs

**Solutions**:

- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Check Stripe CLI is running (`stripe listen...`)
- Restart Next.js dev server after updating `.env.local`
- Verify webhook URL is correct in Stripe Dashboard
- Check webhook signature verification in `app/api/stripe/webhook/route.ts`

#### 2. Convex Functions Not Updating

**Symptoms**:

- Changes to Convex files not reflected
- Old code still running

**Solutions**:

- Check Convex dev terminal for errors
- Run `npx convex dev --once` to force push
- Verify file is in `convex/` directory
- Check for TypeScript errors
- Clear browser cache

#### 3. Environment Variables Not Working

**Symptoms**:

- `undefined` errors for environment variables
- Features not working as expected

**Solutions**:

- Verify `.env.local` exists in project root
- Restart Next.js dev server after changes
- Check variable names match exactly
- For Convex variables, set in Convex Dashboard
- Use `NEXT_PUBLIC_` prefix for client-side variables

#### 4. Email Not Sending

**Symptoms**:

- Booking succeeds but no emails received
- Email errors in logs

**Solutions**:

- Verify `RESEND_API_KEY` is set
- Check Resend Dashboard for delivery status
- Use `onboarding@resend.dev` for testing
- Verify email templates are valid
- Check spam folder

#### 5. Booking Conflicts

**Symptoms**:

- Double bookings occur
- Slots show as available when booked

**Solutions**:

- Check booking conflict logic in `convex/bookings.ts`
- Verify `isSlotAvailable` query works correctly
- Check database indexes
- Verify time slot calculations

#### 6. Calendar Not Showing Available Dates

**Symptoms**:

- All dates disabled in calendar
- No time slots available

**Solutions**:

- Check trainer availability is set
- Verify day-level toggles are enabled
- Check slot-level toggles for specific dates
- Verify `isDateAvailable` function logic
- Check timezone handling

#### 7. Subscription Status Not Updating

**Symptoms**:

- Payment succeeds but status stays `past_due`
- Admin actions not reflected in Stripe

**Solutions**:

- Verify Stripe webhooks are working
- Check Convex logs for webhook processing
- Ensure `STRIPE_SECRET_KEY` is set in Convex
- Verify mutation order (Stripe first, then DB)
- Check network connectivity

#### 8. Advanced Booking Not Working

**Symptoms**:

- User with subscription still prompted to pay
- Subscription not detected

**Solutions**:

- Check `getActiveSubscription` query
- Verify subscription status is `active`
- Check subscription is linked to correct session
- Verify booking logic checks subscription
- Check current period dates

### Debug Commands

#### Check Convex Connection

```bash
npx convex dev --once
```

#### Test Stripe Webhook

```bash
stripe trigger checkout.session.completed
```

#### View Convex Logs

```bash
npx convex logs
```

#### Clear Convex Cache

```bash
npx convex dev --clear-cache
```

---

## 📚 Additional Resources

### Documentation Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Clerk Documentation](https://clerk.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Resend Documentation](https://resend.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion)

### Learning Resources

- [Convex Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [React Email Templates](https://react.email)
- [Next.js App Router](https://nextjs.org/docs/app)

---

## ✅ System Verification & Sync Status

### Advanced Booking System Verification

**Status**: ✅ ALL SYSTEMS OPERATIONAL  
**Last Verified**: January 16, 2026

#### Backend Validation

- ✅ Advance booking limit: **20 days ahead** (3 calendar weeks)
- ✅ Weekly limit: Per calendar week (Monday-Sunday), not total
- ✅ Date handling: String comparison (no timezone issues)
- ✅ Slot conflict detection: Handles all edge cases
- ✅ Booking creation: Correct flags (`isAdvancedBooking`, `subscriptionId`)
- ✅ Email notifications: Sends with proper badges

#### Frontend Validation

- ✅ Matches backend: 20 days advance limit
- ✅ UI shows current week's session count only
- ✅ Clear error messages and helpful hints
- ✅ Subscription status display with yellow theme
- ✅ Warning when weekly limit reached (with week reset info)

#### Subscription-Booking Sync

- ✅ **Stripe Webhook → Cancel Future Bookings**: Working
- ✅ **Payment Failed → Mark `past_due`**: Working
- ✅ **Payment Succeeded → Reactivate**: Working
- ✅ **Admin Cancel → Cancel Future Bookings**: **FIXED** ✅
- ✅ **Admin Pause → Cancel Bookings in Pause Period**: **FIXED** ✅
- ✅ **Admin Edit Resume Date → Update Cancelled Bookings**: **FIXED** ✅

#### Test Results

| Scenario                                     | Status  |
| -------------------------------------------- | ------- |
| Initial booking with Stripe payment          | ✅ PASS |
| Advanced booking (1 week ahead)              | ✅ PASS |
| Advanced booking (2 weeks ahead)             | ✅ PASS |
| Weekly limit enforcement (per calendar week) | ✅ PASS |
| 20-day advance booking limit                 | ✅ PASS |
| Payment failure handling                     | ✅ PASS |
| Payment recovery after retry                 | ✅ PASS |
| Admin cancel subscription                    | ✅ PASS |
| Admin pause subscription                     | ✅ PASS |
| Admin resume subscription                    | ✅ PASS |
| Stripe-Database sync                         | ✅ PASS |
| Email notifications (with badges)            | ✅ PASS |

### Key Fixes Applied

**Issue 1: Frontend/Backend Mismatch** ❌→✅

- Before: Frontend allowed 14 days, backend allowed 20 days
- After: Both allow 20 days with consistent date handling

**Issue 2: Weekly Limit Calculation** ❌→✅

- Before: Counted all bookings ever made
- After: Counts bookings per calendar week (Monday-Sunday)

**Issue 3: Date Comparison** ❌→✅

- Before: Used Date objects (timezone issues)
- After: Uses string comparison (YYYY-MM-DD)

**Issue 4: Admin Action Sync** ❌→✅

- Before: Database updated before Stripe (could fail)
- After: Stripe updated first, then database (reliable)
- Before: Admin cancel/pause didn't cancel future bookings
- After: All future bookings properly cancelled/handled

### Architecture Validation

✅ **No broken logic** - All existing functionality preserved  
✅ **Additive fixes only** - No destructive changes  
✅ **Backward compatible** - Existing bookings unaffected  
✅ **Production ready** - All systems tested and verified

---

## 🎉 Success Checklist

### ✅ Your system is production-ready when:

- [ ] All environment variables set correctly
- [ ] Convex functions deployed and working
- [ ] Stripe integration tested end-to-end
- [ ] Webhooks working in production
- [ ] Email sending verified
- [ ] Advanced booking system tested
- [ ] Subscription management working
- [ ] Payment failure handling verified
- [ ] Admin controls tested
- [ ] User flow tested on multiple devices
- [ ] Performance optimized
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Backup strategy in place

---

## 📞 Support

### Getting Help

1. **Check this documentation first**
2. **Review error messages carefully**
3. **Check Convex/Stripe dashboards for logs**
4. **Search GitHub issues** (if applicable)
5. **Contact support** (provide error logs and steps to reproduce)

### Useful Commands Reference

```bash
# Development
npm run dev                 # Start Next.js dev server
npx convex dev             # Start Convex dev server
stripe listen --forward-to localhost:3000/api/stripe/webhook  # Forward webhooks

# Building
npm run build              # Build Next.js for production
npx convex deploy          # Deploy Convex to production

# Testing
stripe trigger checkout.session.completed  # Test webhook
npx convex logs           # View Convex logs

# Environment
npx convex env set VARIABLE_NAME value  # Set Convex env variable
stripe login              # Login to Stripe CLI
```

---

## 📝 Version History

### v1.0.0 (January 16, 2026)

**Initial Production Release**

#### Core Features

- ✅ Complete booking system with Stripe subscriptions
- ✅ Advanced booking system (20 days ahead)
- ✅ Weekly recurring payments with Stripe
- ✅ Subscription management (pause/resume/cancel)
- ✅ Payment failure handling with grace period
- ✅ Admin controls for trainers/sessions/bookings
- ✅ Email notifications with branded templates
- ✅ Calendar-based availability management
- ✅ Real-time slot validation

#### UI/UX

- ✅ Modern yellow theme (#F2D578)
- ✅ Full dark mode support
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Framer Motion animations
- ✅ Accessible UI components (shadcn/ui)

#### Technical Highlights

- ✅ Next.js 14 with App Router
- ✅ Convex backend with real-time updates
- ✅ Stripe webhooks for payment events
- ✅ Clerk authentication
- ✅ TypeScript for type safety
- ✅ Cron jobs for automated tasks

#### Critical Fixes

- ✅ **Fixed**: Frontend/backend advance booking limit sync (14 days → 20 days)
- ✅ **Fixed**: Weekly limit calculation (total → per calendar week)
- ✅ **Fixed**: Date comparison timezone issues (Date objects → string comparison)
- ✅ **Fixed**: Admin actions now sync with Stripe before database updates
- ✅ **Fixed**: Admin cancel/pause now properly cancels future bookings
- ✅ **Fixed**: UI warning messages now accurate (current week vs all time)

#### Verification

- ✅ All test scenarios passing
- ✅ Subscription-booking sync verified
- ✅ Stripe integration fully tested
- ✅ Email system operational
- ✅ Admin controls verified
- ✅ **Status**: Production Ready

---

**Built with ❤️ for BWF Fitness**  
**Documentation Last Updated**: January 16, 2026  
**System Status**: ✅ Fully Operational
