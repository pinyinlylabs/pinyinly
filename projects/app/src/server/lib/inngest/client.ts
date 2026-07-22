import { eventType, Inngest } from "inngest";
import pino from "pino";
import pretty from "pino-pretty";
import {
  assetIdSchema,
  locationSetRoleSchema,
  placeIdSchema,
} from "@/data/model";
import { z } from "zod";

declare global {
  var __pylyPino: pino.Logger | undefined;
}

// In development this module will be recreated multiple times, and pino will
// cause a large memory leak if it's re-instantiated because it hooks into
// process.on('exit') and never removes the listener. So we store it on
// globalThis to avoid re-instantiating it.
globalThis.__pylyPino ??= pino(
  { name: `inngest` },
  process.env.NODE_ENV === `development`
    ? pretty({
        colorize: true,
        ignore: `pid,hostname`,
        translateTime: `SYS:standard`,
        minimumLevel: `debug`,
      })
    : undefined,
);

// Create a client to send and receive events
export const inngest = new Inngest({
  id: `my-app`,
  logger: globalThis.__pylyPino,
  // middleware: [sentryMiddleware()],
  isDev: process.env.NODE_ENV === `development`,
  checkpointing: {
    maxRuntime: `50s`,
  },
});

export const serverSyncAssetSyncUploadEvent = eventType(
  `serverSync/asset-sync-upload`,
  {
    schema: z.object({
      remoteSyncId: z.string(),
      assetId: assetIdSchema,
    }),
  },
);

export const serverSyncAssetSyncDownloadEvent = eventType(
  `serverSync/asset-sync-download`,
  {
    schema: z.object({
      remoteSyncId: z.string(),
      assetId: assetIdSchema,
    }),
  },
);

export const locationPopulateLocationSetIdentityImageEvent = eventType(
  `location/populate-location-set-identity-image`,
  {
    schema: z.object({
      userId: z.string().min(1),
      locationId: placeIdSchema,
      role: locationSetRoleSchema,
    }),
  },
);

export const locationPopulateLocationSetNameEvent = eventType(
  `location/populate-location-set-name`,
  {
    schema: z.object({
      userId: z.string().min(1),
      locationId: placeIdSchema,
      role: locationSetRoleSchema,
    }),
  },
);

export const locationPopulateLocationSpecEvent = eventType(
  `location/populate-location-spec`,
  {
    schema: z.object({
      userId: z.string().min(1),
      locationId: placeIdSchema,
    }),
  },
);

export const locationPopulateLocationEvent = eventType(
  `location/populate-location`,
  {
    schema: z.object({
      userId: z.string().min(1),
      locationId: placeIdSchema,
    }),
  },
);
