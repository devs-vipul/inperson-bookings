# Toggle Behavior Explanation

## Current Implementation

### Day-Level Toggle (Available Days & Timing)
**Location**: Trainer Details Page (`/super-admin/manage-trainer/trainers/[trainerId]`)

**What it does**:
- Toggles the **entire day** on/off
- Database field: `availability.isActive` (boolean)
- Effect: When OFF, users **cannot see or book ANY slots** for that day

```typescript
// Current toggle mutation
await toggleSlot({
  id: avail._id,  // availability record ID
  isActive: checked, // true/false
});
```

**User Impact**:
- ✅ When `isActive = true` → All slots for that day are available for booking
- ❌ When `isActive = false` → Entire day disappears from user booking calendar

---

## Manage Slots Page - "All Slots" Toggle

### Question: Is it the same or different?

**ANSWER: It's DIFFERENT (but related)**

### Day-Level Toggle vs All-Slots Toggle

| Feature | Day-Level Toggle | All-Slots Toggle (Manage Slots) |
|---------|-----------------|--------------------------------|
| **Location** | Trainer Details Page | Manage Slots Calendar |
| **Scope** | ONE specific day (Monday, Tuesday, etc.) | All individual time slots on a specific DATE |
| **Database** | `availability.isActive` | `trainerSlots` table |
| **Purpose** | Enable/disable recurring weekly day | Enable/disable specific date's generated slots |

---

## How They Work Together

### Architecture:

```
1. Day-Level Toggle (Weekly Schedule)
   ↓
   Controls: "Is Monday available at all?"
   ↓
2. Slot Generation (Based on availability)
   ↓
   Creates: Individual 30/60-min slots for specific dates
   ↓
3. All-Slots Toggle (Date-Specific Overrides)
   ↓
   Controls: "Disable all slots for Jan 20, 2026 only"
```

### Example Scenario:

**Weekly Schedule**:
- Monday: ✅ **ON** (7:00 AM - 11:45 PM)
- Tuesday: ❌ **OFF**

**Specific Date Overrides** (Manage Slots):
- Monday, Jan 20, 2026: ❌ All slots disabled (Vacation day)
- Monday, Jan 27, 2026: ✅ All slots enabled (Normal operation)

**User Experience**:
- User sees Monday dates in calendar (because weekly toggle is ON)
- **Jan 20** has no available slots (all-slots toggle is OFF for that date)
- **Jan 27** shows all time slots normally

---

## Implementation Plan for "All Slots" Toggle

### Current Database Schema:

```typescript
// convex/schema.ts
trainerSlots: defineTable({
  trainerId: v.id("trainers"),
  date: v.string(), // "2026-01-20"
  startTime: v.string(), // "09:00"
  endTime: v.string(), // "10:00"
  duration: v.number(), // 30 or 60
  isActive: v.boolean(), // Currently used for INDIVIDUAL slots
})
```

### What We Need to Add:

**Option 1: Batch Update (Simpler)**
```typescript
// Mutation to toggle all slots for a specific date
toggleAllSlotsForDate({
  trainerId: Id<"trainers">,
  date: string, // "2026-01-20"
  isActive: boolean,
})
```

**Implementation**:
```typescript
// convex/trainerSlots.ts
export const toggleAllSlotsForDate = mutation({
  args: {
    trainerId: v.id("trainers"),
    date: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find all slots for this trainer on this date
    const slots = await ctx.db
      .query("trainerSlots")
      .withIndex("by_trainer_date", (q) =>
        q.eq("trainerId", args.trainerId).eq("date", args.date)
      )
      .collect();

    // Update all slots
    for (const slot of slots) {
      await ctx.db.patch(slot._id, {
        isActive: args.isActive,
      });
    }

    return { updated: slots.length };
  },
});
```

**UI in Manage Slots Page**:
```tsx
<Switch
  checked={allSlotsActive}
  onCheckedChange={async (checked) => {
    await toggleAllSlotsForDate({
      trainerId,
      date: selectedDate,
      isActive: checked,
    });
  }}
/>
```

---

### Option 2: Date Override Table (More Scalable)

**New Table**:
```typescript
dateOverrides: defineTable({
  trainerId: v.id("trainers"),
  date: v.string(), // "2026-01-20"
  isAvailable: v.boolean(), // false = all slots disabled
  reason: v.optional(v.string()), // "Vacation", "Holiday"
})
```

**Benefits**:
- Doesn't modify individual slot records
- Cleaner separation of concerns
- Can add metadata (reason, notes)
- Easier to revert

**Query Logic**:
```typescript
// When fetching available slots
const dateOverride = await ctx.db
  .query("dateOverrides")
  .withIndex("by_trainer_date")
  .filter((q) => q.eq("date", selectedDate))
  .first();

if (dateOverride && !dateOverride.isAvailable) {
  return []; // No slots available for this date
}
```

---

## Recommendation

### For "All Slots" Toggle: Use **Option 1** (Batch Update)

**Why?**
- ✅ Uses existing schema (no migration needed)
- ✅ Simpler to implement
- ✅ Works with current booking flow
- ✅ No breaking changes

**When to Use Each Toggle**:

| Scenario | Use Which Toggle? |
|----------|------------------|
| Trainer never works Sundays | **Day-Level Toggle** (disable Sunday) |
| Trainer on vacation Jan 20 | **All-Slots Toggle** (disable that specific date) |
| Trainer changes weekly schedule permanently | **Day-Level Toggle** |
| Trainer takes a sick day | **All-Slots Toggle** |

---

## Sync Behavior Summary

### Q: Will they conflict?

**A: No, they work in layers:**

1. **First Check**: Is the day enabled? (Day-Level Toggle)
   - If NO → User won't even see the date
   - If YES → Proceed to check slots

2. **Second Check**: Are the specific slots enabled? (All-Slots Toggle)
   - If NO → Date appears but shows "No available slots"
   - If YES → Show individual slot availability

**Priority**: Day-Level Toggle **overrides** All-Slots Toggle
- If Monday is disabled at day-level, all-slots toggle doesn't matter
- Both must be enabled for slots to appear

---

## Implementation Ready?

✅ **Yes, we can implement this safely!**

**Steps**:
1. Add `toggleAllSlotsForDate` mutation
2. Add "All Slots" toggle UI in Manage Slots page
3. Update booking flow to check both toggles
4. Test scenarios:
   - Day ON, All-Slots OFF → No slots shown for that date
   - Day OFF, All-Slots ON → Date hidden entirely
   - Both ON → Normal operation

**No breaking changes** - existing bookings and availability remain intact!
