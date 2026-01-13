import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - links Clerk users to Convex
  users: defineTable({
    clerkUserId: v.string(), // Clerk user ID
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()), // "user", "trainer", "super_admin"
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"]),

  // Trainers table
  trainers: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    expertise: v.array(v.string()),
    description: v.optional(v.string()), // Trainer description/bio
    profilePicture: v.optional(v.id("_storage")), // Storage ID for the image
    availableDays: v.optional(v.array(v.string())), // ["MON", "TUE", etc.]
    status: v.boolean(), // active/inactive
    createdBy: v.optional(v.id("users")), // Super admin who created this
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // Sessions table - training session packages
  sessions: defineTable({
    trainerId: v.id("trainers"),
    name: v.string(), // Session name (e.g., "ONE SESSION", "TWO SESSIONS")
    description: v.string(), // Session description
    sessionsPerWeek: v.number(), // 1-5 sessions per week
    duration: v.number(), // 30 or 60 minutes
    price: v.number(), // Price per week
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trainer_id", ["trainerId"])
    .index("by_trainer_duration", ["trainerId", "duration"])
    .index("by_trainer_archived", ["trainerId", "isArchived"]),

  // Trainer availability slots
  trainerAvailability: defineTable({
    trainerId: v.id("trainers"),
    day: v.string(), // "Monday", "Tuesday", etc.
    timeSlots: v.array(
      v.object({
        from: v.string(), // Time in "HH:MM" format (24-hour)
        to: v.string(), // Time in "HH:MM" format (24-hour)
      })
    ),
    isActive: v.boolean(), // Toggle for enabling/disabling
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trainer_id", ["trainerId"])
    .index("by_trainer_day", ["trainerId", "day"]),

  // Bookings table - user bookings for trainer sessions
  bookings: defineTable({
    userId: v.id("users"), // User who made the booking
    trainerId: v.id("trainers"),
    sessionId: v.id("sessions"), // Session package booked
    slots: v.array(
      v.object({
        date: v.string(), // Date in "YYYY-MM-DD" format
        startTime: v.string(), // Time in "HH:MM" format (24-hour)
        endTime: v.string(), // Time in "HH:MM" format (24-hour)
      })
    ),
    status: v.string(), // "pending", "confirmed", "cancelled", "completed"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_trainer_id", ["trainerId"])
    .index("by_session_id", ["sessionId"])
    .index("by_user_status", ["userId", "status"]),

  // Trainer slots - individual slot management per date
  trainerSlots: defineTable({
    trainerId: v.id("trainers"),
    date: v.string(), // Date in "YYYY-MM-DD" format
    startTime: v.string(), // Time in "HH:MM" format (24-hour)
    endTime: v.string(), // Time in "HH:MM" format (24-hour)
    duration: v.number(), // 30 or 60 minutes
    isActive: v.boolean(), // Toggle for enabling/disabling individual slot
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trainer_id", ["trainerId"])
    .index("by_trainer_date", ["trainerId", "date"])
    .index("by_trainer_date_duration", ["trainerId", "date", "duration"]),
});
