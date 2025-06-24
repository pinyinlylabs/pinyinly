import { formatRelativeTime } from "#util/date.ts";
import { describe, expect, test } from "vitest";

describe(`${formatRelativeTime.name} suite`, () => {
  // Past date tests (ago)
  test(`formats years correctly for past dates`, () => {
    const start = new Date(`2023-01-01T00:00:00Z`);
    const end = new Date(`2025-01-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`2 years ago`);
  });

  test(`formats months correctly for past dates`, () => {
    const start = new Date(`2025-01-01T00:00:00Z`);
    const end = new Date(`2025-04-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`3 months ago`);
  });

  test(`formats weeks correctly for past dates`, () => {
    const start = new Date(`2025-06-01T00:00:00Z`);
    const end = new Date(`2025-06-15T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`2 weeks ago`);
  });

  test(`formats days correctly for past dates`, () => {
    const start = new Date(`2025-06-20T00:00:00Z`);
    const end = new Date(`2025-06-23T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`3 days ago`);
  });

  test(`formats hours correctly for past dates`, () => {
    const start = new Date(`2025-06-23T10:00:00Z`);
    const end = new Date(`2025-06-23T15:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`5 hours ago`);
  });

  test(`formats minutes correctly for past dates`, () => {
    const start = new Date(`2025-06-23T14:30:00Z`);
    const end = new Date(`2025-06-23T14:45:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`15 minutes ago`);
  });

  // Future date tests (in)
  test(`formats years correctly for future dates`, () => {
    const start = new Date(`2027-01-01T00:00:00Z`);
    const end = new Date(`2025-01-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`in 2 years`);
  });

  test(`formats months correctly for future dates`, () => {
    const start = new Date(`2025-09-01T00:00:00Z`);
    const end = new Date(`2025-06-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`in 3 months`);
  });

  test(`formats weeks correctly for future dates`, () => {
    const start = new Date(`2025-06-29T00:00:00Z`);
    const end = new Date(`2025-06-15T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`in 2 weeks`);
  });

  test(`formats days correctly for future dates`, () => {
    const start = new Date(`2025-06-26T00:00:00Z`);
    const end = new Date(`2025-06-23T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`in 3 days`);
  });

  test(`formats hours correctly for future dates`, () => {
    const start = new Date(`2025-06-23T20:00:00Z`);
    const end = new Date(`2025-06-23T15:00:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`in 5 hours`);
  });

  test(`formats minutes correctly for future dates`, () => {
    const start = new Date(`2025-06-23T15:00:00Z`);
    const end = new Date(`2025-06-23T14:45:00Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`in 15 minutes`);
  });

  test(`formats "just now" correctly`, () => {
    const start = new Date(`2025-06-23T14:30:00Z`);
    const end = new Date(`2025-06-23T14:30:01Z`);
    const result = formatRelativeTime(start, end);
    expect(result).toBe(`just now`);
  });

  test(`defaults to current time when end date is not provided (past)`, () => {
    // This test is harder to assert precisely without mocking Date.now()
    // but we can at least verify it returns something with the right format
    const pastDate = new Date(Date.now() - 60_000); // 1 minute ago
    const result = formatRelativeTime(pastDate);
    expect(result).toMatch(/\d+ minutes? ago/);
  });

  test(`defaults to current time when end date is not provided (future)`, () => {
    // This test is harder to assert precisely without mocking Date.now()
    // but we can at least verify it returns something with the right format
    const futureDate = new Date(Date.now() + 60_000); // 1 minute in future
    const result = formatRelativeTime(futureDate);
    expect(result).toMatch(/in \d+ minutes?/);
  });
});
