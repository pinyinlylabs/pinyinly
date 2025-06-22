import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";

export function formatRelativeTime(date: Date, now = new Date()): string {
  // Determine if the date is in the future or past
  const isFuture = date.getTime() > now.getTime();

  // Make sure start is always the earlier date for duration calculation
  const [start, end] = isFuture ? [now, date] : [date, now];

  const duration = intervalToDuration({ start, end });

  // Convert days to weeks when appropriate
  if (
    duration.days !== undefined &&
    duration.days >= 7 &&
    (duration.weeks === undefined || duration.weeks === 0)
  ) {
    duration.weeks = Math.floor(duration.days / 7);
    duration.days = duration.days % 7;
  }

  // Find the most significant time unit for simplicity
  const timeUnits = [
    `years`,
    `months`,
    `weeks`,
    `days`,
    `hours`,
    `minutes`,
  ] as const;
  const mostSignificantUnit = timeUnits.find((unit) => {
    const value = duration[unit];
    return typeof value === `number` && value > 0;
  });

  if (mostSignificantUnit === undefined) {
    return `just now`; // No significant duration found
  }

  // Format only the most significant unit
  const formatted = formatDuration(duration, {
    format: [mostSignificantUnit],
    zero: false,
    delimiter: `, `,
  });

  // Handle the case where there's no meaningful duration (less than a minute)
  if (!formatted) {
    return `just now`;
  }

  // Add "in" prefix for future dates, "ago" suffix for past dates
  return isFuture ? `in ${formatted}` : `${formatted} ago`;
}
