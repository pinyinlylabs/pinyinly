import { eventType, Inngest } from "inngest";
import pino from "pino";
import pretty from "pino-pretty";
import {
  actorIdSchema,
  assetIdSchema,
  locationSetKeySchema,
  locationIdSchema,
  pinyinSoundIdSchema,
} from "@/data/model";
import { z } from "zod";
import {
  pronunciationHintRecurringPromptAssociationStrategyKindSchema,
  pronunciationHintRecurringPromptCueSchema,
} from "@/util/prompts/pronunciationHintRecurring";

declare global {
  var __pylyPino: pino.Logger | undefined;
}

// In development this module will be recreated multiple times, and pino will
// cause a large memory leak if it's re-instantiated because it hooks into
// process.on('exit') and never removes the listener. So we store it on
// globalThis to avoid re-instantiating it.
export const logger = (globalThis.__pylyPino ??= pino(
  { name: `inngest` },
  process.env.NODE_ENV === `development`
    ? pretty({
        colorize: true,
        ignore: `pid,hostname`,
        translateTime: `SYS:standard`,
        minimumLevel: `debug`,
      })
    : undefined,
));

// Create a client to send and receive events
export const inngest = new Inngest({
  id: `my-app`,
  logger,
  // middleware: [sentryMiddleware()],
  isDev: process.env.NODE_ENV === `development`,
  checkpointing: {
    maxRuntime: `50s`,
  },
});

export const serverSyncAssetPushEvent = eventType(`serverSync/asset.push`, {
  schema: z.object({
    remoteSyncId: z.string(),
    assetId: assetIdSchema,
  }),
});

export const serverSyncAssetPullEvent = eventType(`serverSync/asset.pull`, {
  schema: z.object({
    remoteSyncId: z.string(),
    assetId: assetIdSchema,
  }),
});

export const assetUploadRequestedEvent = eventType(`asset/upload.requested`, {
  schema: z.object({
    userId: z.string(),
    assetId: assetIdSchema,
    expiresAt: z.number(),
  }),
});

export const assetUploadSucessEvent = eventType(`asset/upload.success`, {
  schema: z.object({
    userId: z.string(),
    assetId: assetIdSchema,
    contentType: z.string().optional(),
    contentLength: z.number().optional(),
  }),
});

export const locationPopulateLocationSetIdentityImageEvent = eventType(
  `location/populate-location-set-identity-image`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
      setKey: locationSetKeySchema,
    }),
  },
);

export const locationPopulateLocationSetDescriptionEvent = eventType(
  `location/populate-location-set-description`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
      setKey: locationSetKeySchema,
    }),
  },
);

export const locationPopulateLocationSetNameEvent = eventType(
  `location/populate-location-set-name`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
      setKey: locationSetKeySchema,
    }),
  },
);

export const locationPopulateLocationSpecEvent = eventType(
  `location/populate-location-spec`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
    }),
  },
);

export const locationPopulateLocationSetSpecEvent = eventType(
  `location/populate-location-set-spec`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
      setKey: locationSetKeySchema,
    }),
  },
);

export const locationPopulateLocationEvent = eventType(
  `location/populate-location`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
    }),
  },
);

export const locationPopulateLocationSoundThoughtChainEvent = eventType(
  `location/populate-location-sound-thought-chain`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
      soundId: pinyinSoundIdSchema,
    }),
  },
);

export const actorPopulateActorSpecEvent = eventType(
  `actor/populate-actor-spec`,
  {
    schema: z.object({
      userId: z.string(),
      actorId: actorIdSchema,
      actorName: z.string(),
    }),
  },
);

export const pronunciationGenerateHintEvent = eventType(
  `pronunciation/generate-hint`,
  {
    schema: z.object({
      userId: z.string(),
      locationId: locationIdSchema,
      actorId: actorIdSchema,
      setKey: locationSetKeySchema,
      cue: pronunciationHintRecurringPromptCueSchema,
      associationStrategy:
        pronunciationHintRecurringPromptAssociationStrategyKindSchema.optional(),
    }),
  },
);
