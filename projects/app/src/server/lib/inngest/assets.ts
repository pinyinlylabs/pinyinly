import * as s from "@/server/pgSchema";
import { subMinutes } from "date-fns/subMinutes";
import { lt } from "drizzle-orm";
import { withDrizzle } from "@/server/lib/db";
import { inngest } from "./client";

export const assetPendingUploadGarbageCollection = inngest.createFunction(
  {
    id: `assetPendingUploadGarbageCollection`,
    singleton: { mode: `skip` },
    triggers: [{ cron: `*/5 * * * *` }],
  },
  async ({ step, logger }) => {
    const cutoff = subMinutes(new Date(), 30);

    const deletedRowCount = await step.run(
      `delete stale assetPendingUpload rows`,
      async () =>
        withDrizzle(async (db) => {
          const deletedRows = await db
            .delete(s.assetPendingUpload)
            .where(lt(s.assetPendingUpload.createdAt, cutoff))
            .returning({ id: s.assetPendingUpload.id });

          return deletedRows.length;
        }),
    );

    if (deletedRowCount > 0) {
      logger.info(
        {
          cutoff: cutoff,
          deletedRowCount,
        },
        `Deleted stale assetPendingUpload rows`,
      );
    }

    return {
      deletedRowCount,
      cutoff: cutoff.toISOString(),
    };
  },
);

export const functions = [assetPendingUploadGarbageCollection];
