import { nonNullable } from "@haohaohow/lib/invariant";
import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";

export function formatTimeSince(start: Date, end = new Date()): string {
  const duration = intervalToDuration({ start, end });
  const formatted = formatDuration(duration, {
    format: [`years`, `months`, `weeks`, `days`, `hours`, `minutes`],
    zero: false,
    delimiter: `, `,
  });

  return `${nonNullable(formatted.split(`, `)[0])} ago`;
}
