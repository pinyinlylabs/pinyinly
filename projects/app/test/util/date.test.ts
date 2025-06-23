import { formatRelativeTime } from "#util/date.ts";
import assert from "node:assert/strict";
import test from "node:test";

await test(`${formatRelativeTime.name} suite`, async () => {
  // Past date tests (ago)
  await test(`formats years correctly for past dates`, () => {
    const start = new Date(`2023-01-01T00:00:00Z`);
    const end = new Date(`2025-01-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `2 years ago`);
  });

  await test(`formats months correctly for past dates`, () => {
    const start = new Date(`2025-01-01T00:00:00Z`);
    const end = new Date(`2025-04-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `3 months ago`);
  });

  await test(`formats weeks correctly for past dates`, () => {
    const start = new Date(`2025-06-01T00:00:00Z`);
    const end = new Date(`2025-06-15T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `2 weeks ago`);
  });

  await test(`formats days correctly for past dates`, () => {
    const start = new Date(`2025-06-20T00:00:00Z`);
    const end = new Date(`2025-06-23T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `3 days ago`);
  });

  await test(`formats hours correctly for past dates`, () => {
    const start = new Date(`2025-06-23T10:00:00Z`);
    const end = new Date(`2025-06-23T15:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `5 hours ago`);
  });

  await test(`formats minutes correctly for past dates`, () => {
    const start = new Date(`2025-06-23T14:30:00Z`);
    const end = new Date(`2025-06-23T14:45:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `15 minutes ago`);
  });

  // Future date tests (in)
  await test(`formats years correctly for future dates`, () => {
    const start = new Date(`2027-01-01T00:00:00Z`);
    const end = new Date(`2025-01-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `in 2 years`);
  });

  await test(`formats months correctly for future dates`, () => {
    const start = new Date(`2025-09-01T00:00:00Z`);
    const end = new Date(`2025-06-01T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `in 3 months`);
  });

  await test(`formats weeks correctly for future dates`, () => {
    const start = new Date(`2025-06-29T00:00:00Z`);
    const end = new Date(`2025-06-15T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `in 2 weeks`);
  });

  await test(`formats days correctly for future dates`, () => {
    const start = new Date(`2025-06-26T00:00:00Z`);
    const end = new Date(`2025-06-23T00:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `in 3 days`);
  });

  await test(`formats hours correctly for future dates`, () => {
    const start = new Date(`2025-06-23T20:00:00Z`);
    const end = new Date(`2025-06-23T15:00:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `in 5 hours`);
  });

  await test(`formats minutes correctly for future dates`, () => {
    const start = new Date(`2025-06-23T15:00:00Z`);
    const end = new Date(`2025-06-23T14:45:00Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `in 15 minutes`);
  });

  await test(`formats "just now" correctly`, () => {
    const start = new Date(`2025-06-23T14:30:00Z`);
    const end = new Date(`2025-06-23T14:30:01Z`);
    const result = formatRelativeTime(start, end);
    assert.equal(result, `just now`);
  });

  await test(`defaults to current time when end date is not provided (past)`, () => {
    // This test is harder to assert precisely without mocking Date.now()
    // but we can at least verify it returns something with the right format
    const pastDate = new Date(Date.now() - 60_000); // 1 minute ago
    const result = formatRelativeTime(pastDate);
    assert.match(result, /\d+ minutes? ago/);
  });

  await test(`defaults to current time when end date is not provided (future)`, () => {
    // This test is harder to assert precisely without mocking Date.now()
    // but we can at least verify it returns something with the right format
    const futureDate = new Date(Date.now() + 60_000); // 1 minute in future
    const result = formatRelativeTime(futureDate);
    assert.match(result, /in \d+ minutes?/);
  });
});
