# BWF Fitness In-Person Bookings

Trainer availability, slot management, and user bookings built with Next.js, Convex, and shadcn/ui.

## Features
- Super-admin trainer management: create trainers, edit availability, create sessions.
- Calendar-based slot management per trainer/date (30 & 60 min), with bulk toggle and per-slot toggles; booked slots are visible and locked.
- User booking flow: availability-aware calendar, clean time slots, booked/disabled slots prevented, multi-slot selection up to package limit.
- User bookings list page.
- Robust timezone handling (`dateToLocalString`, `getDayName`) to avoid UTC day shifts; slots generated on clean intervals.

## Tech Stack
- Next.js / React
- Convex (data + mutations/queries)
- shadcn/ui for UI components
- TypeScript

## Key Paths
- Admin trainer detail: `app/super-admin/manage-trainer/trainers/[trainerId]/page.tsx`
- Admin calendar: `app/super-admin/manage-trainer/trainers/[trainerId]/calendar/page.tsx`
- User booking: `app/(user)/book/[trainerId]/[sessionId]/page.tsx`
- User bookings list: `app/(user)/your-bookings/page.tsx`
- Availability logic: `convex/availability.ts`
- Slot overrides: `convex/trainerSlots.ts`
- Bookings: `convex/bookings.ts`
- Time helpers: `lib/booking-utils.ts`

## Development
1) Install deps: `npm install`
2) Run dev server: `npm run dev`
3) Env: ensure Convex is configured (`npx convex dev`) and set required env vars (e.g., `NEXT_PUBLIC_CONVEX_URL`, auth keys if applicable).

## Notes
- Always use shadcn components for new UI.
- Bulk “All Slots” toggle excludes booked slots; booked slots show `(Booked)` and their switches are disabled.
- Disable past dates and dates without availability in calendars.
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
