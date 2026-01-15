import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Auto-resume paused subscriptions daily at 1 AM
crons.daily(
  "auto-resume-subscriptions",
  { hourUTC: 1, minuteUTC: 0 },
  internal.subscriptions.resumeSubscriptionsScheduled
);

export default crons;
