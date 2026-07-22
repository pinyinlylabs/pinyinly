import {
  pinyinSoundLocationIdentityImageSetting,
  pinyinSoundLocationIdentityImageSettingKey,
  pinyinSoundLocationNameSetting,
  pinyinSoundLocationNameSettingKey,
  pinyinSoundLocationSpecificationSetting,
  pinyinSoundLocationSetNameSetting,
  pinyinSoundLocationSetNameSettingKey,
} from "@/data/userSettings";
import * as s from "@/server/pgSchema";
import {
  buildEvaluateLocationSpecPrompt,
  buildLocationSpecPrompt,
  buildRefineLocationSpecificationPrompt,
  hasMajorCriticisms,
  locationSpecSchema,
} from "@/util/prompts/location";
import { buildLocationIdentityImagePrompt } from "@/util/prompts/locationIdentityImage";
import type { LocationSpec } from "@/util/prompts/location";
import { and, eq } from "drizzle-orm";
import { invoke } from "inngest";
import z from "zod";
import { nanoid } from "@/util/nanoid";
import { setUserSetting } from "@/server/lib/userSettings";
import { withDrizzle } from "@/server/lib/db";
import {
  inngest,
  locationPopulateLocationEvent,
  locationPopulateLocationSetIdentityImageEvent,
  locationPopulateLocationSetNameEvent,
  locationPopulateLocationSpecEvent,
} from "./client";
import {
  getLocationSpec,
  getLocationSetIdentityImage,
  setLocationSetIdentityImage,
} from "@/server/lib/queries";
import { geminiRequestImageAsAsset } from "./gemini";
import { invariant } from "@pinyinly/lib/invariant";
import { requestOpenAiResponseJson } from "@/server/lib/ai";

export const generateLocationSpecFunc = inngest.createFunction(
  {
    id: `location/generateLocationSpec`,
    triggers: invoke(
      z.object({
        location: z.string().min(1),
        maxAttempts: z.number().int().min(1).optional(),
      }),
    ),
  },
  async ({ event, step, logger }): Promise<LocationSpec> => {
    const { location } = event.data;
    const maxAttempts = event.data.maxAttempts ?? 3;

    let bestLocationSpec: LocationSpec | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    let currentLocationSpec = await step.run(
      `location-spec-initial-generate`,
      async () => {
        const response = await requestOpenAiResponseJson(
          buildLocationSpecPrompt({ location }),
        );
        return response.data;
      },
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const locationSpecForEvaluation = currentLocationSpec;

      const evaluation = await step.run(
        `location-spec-evaluate-attempt-${attempt}`,
        async () => {
          const response = await requestOpenAiResponseJson(
            buildEvaluateLocationSpecPrompt({
              location,
              locationSpec: locationSpecForEvaluation,
            }),
          );

          return response.data;
        },
      );

      if (evaluation.score > bestScore) {
        bestScore = evaluation.score;
        bestLocationSpec = locationSpecForEvaluation;
      }

      logger.info(
        { location, attempt, evaluation },
        `Evaluated location spec attempt`,
      );

      if (!hasMajorCriticisms(evaluation)) {
        break;
      }

      const locationSpecForRefine = currentLocationSpec;
      const criticismsForRefine = evaluation.criticisms;

      const refinedLocationSpec = await step.run(
        `location-spec-refine-attempt-${attempt}`,
        async () => {
          const response = await requestOpenAiResponseJson(
            buildRefineLocationSpecificationPrompt({
              location,
              locationSpecification: locationSpecForRefine,
              criticisms: criticismsForRefine,
            }),
          );

          return response.data;
        },
      );

      const refinedEvaluation = await step.run(
        `location-spec-evaluate-refinement-attempt-${attempt}`,
        async () => {
          const response = await requestOpenAiResponseJson(
            buildEvaluateLocationSpecPrompt({
              location,
              locationSpec: refinedLocationSpec,
            }),
          );

          return response.data;
        },
      );

      if (refinedEvaluation.score > bestScore) {
        bestScore = refinedEvaluation.score;
        bestLocationSpec = refinedLocationSpec;
      }

      if (refinedEvaluation.score > evaluation.score) {
        currentLocationSpec = refinedLocationSpec;

        logger.info(
          {
            location,
            attempt,
            previousScore: evaluation.score,
            refinedScore: refinedEvaluation.score,
            refinedLocationSpec,
          },
          `Accepted refined location spec attempt`,
        );

        continue;
      }

      logger.info(
        {
          location,
          attempt,
          previousScore: evaluation.score,
          refinedScore: refinedEvaluation.score,
        },
        `Rejected refined location spec attempt`,
      );
    }

    return bestLocationSpec ?? currentLocationSpec;
  },
);

const populateLocation = inngest.createFunction(
  {
    id: `location/populateLocation`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationEvent,
  },
  async ({ event, step }): Promise<void> => {
    const { userId, locationId } = event.data;

    const locationSpec = await step.invoke(`populate location spec`, {
      function: populateLocationSpec,
      data: {
        userId,
        locationId,
      },
    });

    for (const role of [
      `arrival`,
      `heart`,
      `below`,
      `ascent`,
      `summit`,
    ] as const) {
      await step.sendEvent(
        `emit image set populate name for ${role}`,
        locationPopulateLocationSetNameEvent.create({
          locationId,
          userId,
          role,
        }),
      );

      await step.sendEvent(
        `emit image set populate identity image for ${role}`,
        locationPopulateLocationSetIdentityImageEvent.create({
          locationId,
          userId,
          role,
        }),
      );
    }

    const currentLocationImage = await step.run(
      `read location identity image`,
      async () =>
        withDrizzle(async (db) => {
          const setting = await db.query.userSetting.findFirst({
            where: and(
              eq(s.userSetting.userId, userId),
              eq(
                s.userSetting.key,
                pinyinSoundLocationIdentityImageSettingKey(locationId),
              ),
            ),
          });

          if (setting == null) {
            return null;
          }

          const decoded = pinyinSoundLocationIdentityImageSetting.decode(
            { placeId: locationId },
            setting.value,
          );

          return decoded?.imageId ?? null;
        }),
    );

    if (currentLocationImage == null) {
      const generatedLocationImageAssetId = await step.invoke(
        `generate location identity image`,
        {
          function: geminiRequestImageAsAsset,
          data: {
            prompt: buildLocationIdentityImagePrompt({
              input: {
                locationSpec,
              },
            }),
          },
        },
      );

      await step.run(`write location identity image`, async () =>
        withDrizzle(async (db) => {
          await setUserSetting(db, userId, {
            key: pinyinSoundLocationIdentityImageSettingKey(locationId),
            value: pinyinSoundLocationIdentityImageSetting.entity.marshalValue({
              placeId: locationId,
              imageId: generatedLocationImageAssetId,
            }),
            now: new Date(),
            skipHistory: false,
            historyId: nanoid(),
          });
        }),
      );
    }
  },
);

const populateLocationSetIdentityImage = inngest.createFunction(
  {
    id: `location/populateLocationSetIdentityImage`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId + "-" + event.data.role`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationSetIdentityImageEvent,
  },
  async ({ event, step, logger }) => {
    const { userId, locationId, role } = event.data;

    const { locationSpec, existingImage } = await step.run(
      `load location specification`,
      async () => {
        return withDrizzle(async (db) => {
          const locationSpec = await getLocationSpec(db, userId, locationId);
          const existingImage = await getLocationSetIdentityImage(
            db,
            userId,
            locationId,
            role,
          );

          return {
            locationSpec,
            existingImage,
          };
        });
      },
    );

    if (locationSpec == null) {
      logger.error(
        { locationId, userId, role },
        `Missing location specification for set identity image generation`,
      );
      return;
    }

    if (existingImage != null) {
      return;
    }

    const generatedAssetId = await step.invoke(
      `generate location identity image`,
      {
        function: geminiRequestImageAsAsset,
        data: {
          prompt: buildLocationIdentityImagePrompt({
            input: {
              locationSpec,
            },
          }),
        },
      },
    );

    await step.run(`write set identity image`, async () =>
      withDrizzle(async (db) => {
        await setLocationSetIdentityImage(
          db,
          userId,
          locationId,
          role,
          generatedAssetId,
        );
      }),
    );
  },
);

const populateLocationSetName = inngest.createFunction(
  {
    id: `location/populateLocationSetName`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId + "-" + event.data.role`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationSetNameEvent,
  },
  async ({ event, step, logger }) => {
    const { userId, locationId, role } = event.data;

    await step.run(`read set name (${role})`, async () =>
      withDrizzle(async (db) => {
        const setting = await db.query.userSetting.findFirst({
          where: and(
            eq(s.userSetting.userId, userId),
            eq(
              s.userSetting.key,
              pinyinSoundLocationSetNameSettingKey(locationId, role),
            ),
          ),
        });

        if (setting == null) {
          return null;
        }

        const decoded = pinyinSoundLocationSetNameSetting.decode(
          { placeId: locationId, role },
          setting.value,
        );

        const currentName = decoded?.text ?? null;

        if (currentName != null && currentName.trim().length > 0) {
          return;
        }

        const locationSpec = await getLocationSpec(db, userId, locationId);

        if (locationSpec == null) {
          logger.error(
            { locationId, userId, role },
            `Missing location specification for set name generation`,
          );
          return;
        }

        await setUserSetting(db, userId, {
          key: pinyinSoundLocationSetNameSettingKey(locationId, role),
          value: pinyinSoundLocationSetNameSetting.entity.marshalValue({
            placeId: locationId,
            role,
            text: locationSpec.sets[role].name,
          }),
          now: new Date(),
          skipHistory: false,
          historyId: nanoid(),
        });
      }),
    );
  },
);

const populateLocationSpec = inngest.createFunction(
  {
    id: `location/populateLocationSpec`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationSpecEvent,
  },
  async ({ event, step }): Promise<LocationSpec> => {
    const { userId, locationId } = event.data;

    let locationSpec = await step.run(
      `load location specification`,
      async () => {
        return withDrizzle(async (db) => {
          return getLocationSpec(db, userId, locationId);
        });
      },
    );

    if (locationSpec == null) {
      const locationName = await step.run(`read location name`, async () =>
        withDrizzle(async (db) => {
          const setting = await db.query.userSetting.findFirst({
            where: and(
              eq(s.userSetting.userId, userId),
              eq(
                s.userSetting.key,
                pinyinSoundLocationNameSettingKey(locationId),
              ),
            ),
          });

          if (setting == null) {
            return null;
          }

          const decoded = pinyinSoundLocationNameSetting.decode(
            { placeId: locationId },
            setting.value,
          );

          const text = decoded?.text.trim();
          return text == null || text.length === 0 ? null : text;
        }),
      );

      invariant(
        locationName != null,
        `Missing location name for location specification generation`,
      );

      locationSpec = await step.invoke(`refine-location-spec`, {
        function: generateLocationSpecFunc,
        data: {
          location: locationName,
          maxAttempts: 3,
        },
      });

      locationSpecSchema.parse(locationSpec);

      await step.run(`write location specification`, async () =>
        withDrizzle(async (db) => {
          await setUserSetting(db, userId, {
            key: pinyinSoundLocationSpecificationSetting.entity.marshalKey({
              placeId: locationId,
            }),
            value: pinyinSoundLocationSpecificationSetting.entity.marshalValue({
              placeId: locationId,
              text: JSON.stringify(locationSpec),
            }),
            now: new Date(),
            skipHistory: false,
            historyId: nanoid(),
          });
        }),
      );
    }

    return locationSpec;
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  generateLocationSpecFunc,
  populateLocation,
  populateLocationSetIdentityImage,
  populateLocationSetName,
  populateLocationSpec,
];
