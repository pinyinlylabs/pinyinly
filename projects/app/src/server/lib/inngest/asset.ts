import { verifyObjectExists } from "@/server/lib/s3/asset";
import { getBucketObjectKeyForId } from "@/util/assetId";
import {
  assetUploadRequestedEvent,
  assetUploadSucessEvent,
  inngest,
} from "./client";
import { nonNullable } from "@pinyinly/lib/invariant";

export const assetWaitForUploadAndEmitUploaded = inngest.createFunction(
  {
    id: `asset/waitForUploadAndEmitUploaded`,
    singleton: {
      key: `event.data.assetId`,
      mode: `skip`,
    },
    triggers: [assetUploadRequestedEvent],
  },
  async ({ event, step, logger }) => {
    const { userId, assetId, expiresAt } = event.data;
    const assetKey = getBucketObjectKeyForId(assetId);

    const delays = [`2s`, `4s`, `8s`, `12s`, `20s`, `60s`, `5m`];

    for (let i = 0; ; i++) {
      const delay = nonNullable(delays.at(i) ?? delays.at(-1));

      await step.sleep(`wait-for-upload`, delay);

      const existResult = await step.run(`check-upload`, async () => {
        return verifyObjectExists(assetKey);
      });

      if (existResult.exists) {
        await step.sendEvent(
          `emit-asset-uploaded`,
          assetUploadSucessEvent.create({
            userId,
            assetId,
            contentType: existResult.contentType,
            contentLength: existResult.contentLength,
          }),
        );
        return { emitted: true, checkResult: existResult };
      }

      if (Date.now() > expiresAt) {
        // Do this at the end of the loop rather than at the start so that the last
        // .sleep() is honored.
        break;
      }
    }

    logger.info(
      { assetId, assetKey, userId },
      `Asset upload never appeared in storage after upload requested`,
    );
    return { emitted: false, reason: `not_found` as const };
  },
);

export const functions = [assetWaitForUploadAndEmitUploaded];
