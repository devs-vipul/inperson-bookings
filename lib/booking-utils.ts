/**
 * Utility functions for booking system
 */

export interface TimeSlot {
  startTime: string; // "HH:MM" format (24-hour)
  endTime: string; // "HH:MM" format (24-hour)
  displayStart: string; // "7:00 AM" format
  displayEnd: string; // "7:30 AM" format
}

export interface AvailabilityWindow {
  from: string; // "HH:MM" format (24-hour)
  to: string; // "HH:MM" format (24-hour)
}

/**
 * Convert 24-hour time to 12-hour display format
 */
export function formatTime12Hour(time24h: string): string {
  const [hours, minutes] = time24h.split(":").map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const period = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Convert time to minutes for comparison
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string
 */
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Generate time slots for a given availability window and duration
 * For 30-min slots: 7:00-7:30, 7:30-8:00, etc. (rounded to nearest 30-min interval)
 * For 60-min slots: 7:00-8:00, 8:00-9:00, etc. (aligned to hour)
 */
export function generateTimeSlots(
  availabilityWindows: AvailabilityWindow[],
  duration: number // 30 or 60 minutes
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const window of availabilityWindows) {
    const windowStart = timeToMinutes(window.from);
    const windowEnd = timeToMinutes(window.to);

    // Round start time to clean intervals
    let currentStart = windowStart;

    if (duration === 30) {
      // Round up to the next 30-minute interval if not already on :00 or :30
      const minutes = currentStart % 60;
      if (minutes > 0 && minutes !== 30) {
        // Round up to next 30-minute mark
        const hours = Math.floor(currentStart / 60);
        if (minutes < 30) {
          currentStart = hours * 60 + 30; // Round to :30
        } else {
          currentStart = (hours + 1) * 60; // Round to next hour :00
        }
      }
    } else if (duration === 60) {
      // Round up to the next hour if not already on the hour
      const hours = Math.floor(currentStart / 60);
      const minutes = currentStart % 60;
      if (minutes > 0) {
        currentStart = (hours + 1) * 60; // Next hour
      }
    }

    while (currentStart + duration <= windowEnd) {
      const currentEnd = currentStart + duration;
      const startTime = minutesToTime(currentStart);
      const endTime = minutesToTime(currentEnd);

      slots.push({
        startTime,
        endTime,
        displayStart: formatTime12Hour(startTime),
        displayEnd: formatTime12Hour(endTime),
      });

      // Move to next slot
      currentStart += duration;
    }
  }

  return slots;
}

/**
 * Get day name from date string (YYYY-MM-DD)
 * Uses local timezone to avoid day shift issues
 */
export function getDayName(dateString: string): string {
  // Parse date in local timezone to avoid UTC conversion issues
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

/**
 * Check if a date is available based on trainer availability
 */
export function isDateAvailable(
  dateString: string,
  availability: Array<{ day: string; isActive: boolean }>
): boolean {
  const dayName = getDayName(dateString);
  return availability.some((avail) => avail.day === dayName && avail.isActive);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Convert Date object to YYYY-MM-DD string in local timezone
 * This prevents timezone shift issues
 */
export function dateToLocalString(date: Date | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to dateToLocalString");
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
