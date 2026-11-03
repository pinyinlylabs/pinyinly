import { passkeyChallengeGarbageCollection } from "#server/lib/inngest/healthCheck.ts";
import * as s from "#server/pgSchema.ts";
import { dbTest } from "#test/server/lib/dbHelpers.ts";
import type { TestDb } from "#test/server/lib/dbHelpers.ts";
import { InngestTestEngine } from "@inngest/test";
import { eq } from "drizzle-orm";
import { afterEach, expect, vi } from "vitest";

const { mockWithDrizzle } = vi.hoisted(() => ({ mockWithDrizzle: vi.fn() }));
vi.mock(`#server/lib/db.ts`, async (importOriginal) => ({
  ...(await importOriginal<typeof import("#server/lib/db.ts")>()),
  withDrizzle: mockWithDrizzle,
}));

afterEach(() => {
  vi.useRealTimers();
  mockWithDrizzle.mockReset();
});

dbTest(
  `deletes challenges expired for over an hour in checkpointed batches`,
  async ({ db }) => {
    mockWithDrizzle.mockImplementation(
      async (callback: (database: TestDb) => Promise<unknown>) => callback(db),
    );
    vi.useFakeTimers();
    const now = new Date(`2026-01-02T03:00:00.000Z`);
    vi.setSystemTime(now);
    const cutoff = new Date(now.getTime() - 60 * 60 * 1000);
    await db.insert(s.authPasskeyChallenge).values([
      ...Array.from({ length: 1001 }, (_, index) => ({
        id: `expired-${index}`,
        kind: `add` as const,
        rpId: `localhost`,
        expiresAt: new Date(cutoff.getTime() - 1),
      })),
      {
        id: `cutoff`,
        kind: `add` as const,
        rpId: `localhost`,
        expiresAt: cutoff,
      },
      {
        id: `recent`,
        kind: `login` as const,
        rpId: `localhost`,
        expiresAt: new Date(cutoff.getTime() + 1),
      },
    ]);

    const engine = new InngestTestEngine({
      function: passkeyChallengeGarbageCollection,
    });
    const { result, error } = await engine.execute({
      events: [{ name: `inngest/function.invoked`, data: {} }],
    });

    if (error != null) {
      throw error instanceof Error
        ? error
        : new Error(`Passkey challenge garbage collection failed`);
    }
    expect(result).toEqual({ deletedRowCount: 1001 });
    const remaining = await db
      .select({ id: s.authPasskeyChallenge.id })
      .from(s.authPasskeyChallenge)
      .where(eq(s.authPasskeyChallenge.rpId, `localhost`));
    expect(remaining.map(({ id }) => id).sort()).toEqual([`cutoff`, `recent`]);
  },
);
