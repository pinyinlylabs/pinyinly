---
applyTo: "projects/app/src/server/lib/inngest/**"
---

# Inngest functions

## Garbage collection

- Implement scheduled cleanup in `healthCheck.ts` and include the function in its exported
  `functions` array so `inngest/index.ts` registers it.
- Use an hourly cron and `singleton: { mode: "skip" }` for routine database cleanup.
- Define retention explicitly from the row's expiry timestamp. For passkey challenges, delete rows
  only after they have been expired for one hour; do not delete them opportunistically in request
  handlers.
- Delete in bounded batches (currently 1,000 rows) to limit transaction size and lock duration. Run
  each batch inside a separately named `step.run` so Inngest can checkpoint it.
- Make the step name unique per batch and stop when a batch deletes fewer rows than its limit.
- Add an Inngest test with `InngestTestEngine` and database fixtures covering rows on both sides of
  the retention cutoff.

## Function registration and execution

- Define functions with the shared `inngest` client from `./client`.
- Give each function a stable, unique `id`; add a concise description for scheduled maintenance.
- Register functions by including them in the module's exported `functions` array. The central
  `inngest/index.ts` combines these arrays for the API endpoint.
- Use stable, descriptive `step.run` names for database operations and other work that should be
  checkpointed. Keep external side effects inside steps so retries do not repeat uncheckpointed
  work.
- For recurring work, use a cron trigger and account for overlapping executions where needed.
- Prefer focused Vitest tests with `InngestTestEngine`; use database fixtures when verifying
  persistence behavior.
