import {
  pinyinSoundLocationSetDescriptionSetting,
  locationIdentityImageSetting,
  pinyinSoundLocationNameSetting,
  locationSpecJsonSetting,
  pinyinSoundLocationThoughtChainsSetting,
  pinyinSoundLocationSetNameSetting,
} from "@/data/userSettings";
import * as s from "@/server/pgSchema";
import { buildLocationSoundThoughtChain } from "@/util/prompts/locationSoundThoughtChain";
import { buildLocationIdentityImagePrompt } from "@/util/prompts/locationIdentityImage";
import { locationSpecSchema } from "@/data/model";
import type { LocationSpec, PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  isFinalSoundId,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { and, eq } from "drizzle-orm";
import { invoke } from "inngest";
import z from "zod";
import { nanoid } from "@/util/nanoid";
import { setUserSetting } from "@/server/lib/userSettings";
import { withDrizzle } from "@/server/lib/db";
import {
  inngest,
  locationPopulateLocationEvent,
  locationPopulateLocationSoundThoughtChainEvent,
  locationPopulateLocationSetDescriptionEvent,
  locationPopulateLocationSetIdentityImageEvent,
  locationPopulateLocationSetNameEvent,
  locationPopulateLocationSpecEvent,
} from "./client";
import {
  getLocationSpec,
  getLocationSetIdentityImage,
  setLocationSetIdentityImage,
} from "@/server/lib/query";
import { geminiRequestImageAsAsset } from "./gemini";
import { invariant } from "@pinyinly/lib/invariant";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { buildLocationSetIdentityImagePrompt } from "@/util/prompts/locationSetIdentityImage";
import {
  locationSoundThoughtChainCandidateSchema,
  locationSoundThoughtChainsBySoundIdSchema,
} from "@/util/locationSoundThoughtChain";
import type { LocationSoundThoughtChainsBySoundIdType } from "@/util/locationSoundThoughtChain";
import { buildLocationNameSuggestionsPrompt } from "@/util/prompts/locationNameSuggestions";
import { buildLocationPopulateSetDescriptionPrompt } from "@/util/prompts/locationPopulateSetDescription";
import { buildLocationSpecPrompt } from "@/util/prompts/locationSpec";
import { buildLocationSpecRefinePrompt } from "@/util/prompts/locationSpecRefine";
import {
  buildLocationSpecEvaluatePrompt,
  hasMajorCriticisms,
} from "@/util/prompts/locationSpecEvaluate";

export const generateLocationSpec = inngest.createFunction(
  {
    id: `location/generateLocationSpec`,
    triggers: invoke(
      z.object({
        location: z.string(),
        maxAttempts: z.number().int().min(1).optional(),
      }),
    ),
  },
  async ({ event, step, logger }): Promise<LocationSpec> => {
    const { location } = event.data;
    const maxAttempts = event.data.maxAttempts ?? 3;

    let bestLocationSpec: LocationSpec | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    let currentLocationSpec: LocationSpec = await step.run(
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
            buildLocationSpecEvaluatePrompt({
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
            buildLocationSpecRefinePrompt({
              location,
              locationSpec: locationSpecForRefine,
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
            buildLocationSpecEvaluatePrompt({
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

    for (const setKey of [
      `arrival`,
      `heart`,
      `below`,
      `ascent`,
      `summit`,
    ] as const) {
      await step.sendEvent(
        `emit image set populate description for ${setKey}`,
        locationPopulateLocationSetDescriptionEvent.create({
          locationId,
          userId,
          setKey,
        }),
      );

      await step.sendEvent(
        `emit image set populate name for ${setKey}`,
        locationPopulateLocationSetNameEvent.create({
          locationId,
          userId,
          setKey,
        }),
      );

      await step.sendEvent(
        `emit image set populate identity image for ${setKey}`,
        locationPopulateLocationSetIdentityImageEvent.create({
          locationId,
          userId,
          setKey,
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
                locationIdentityImageSetting.entity.marshalKey({ locationId }),
              ),
            ),
          });

          if (setting == null) {
            return null;
          }

          const decoded = locationIdentityImageSetting.decode(
            { locationId: locationId },
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
              locationSpec,
            }),
          },
        },
      );

      await step.run(`write location identity image`, async () =>
        withDrizzle(async (db) => {
          await setUserSetting(db, userId, {
            key: locationIdentityImageSetting.entity.marshalKey({ locationId }),
            value: locationIdentityImageSetting.entity.marshalValue({
              locationId: locationId,
              imageId: generatedLocationImageAssetId,
            }),
            now: new Date(),
            skipHistory: false,
            historyId: nanoid(),
          });
        }),
      );
    }

    const finalSoundIds = loadPylyPinyinChart().soundIds.filter((soundId) =>
      isFinalSoundId(soundId),
    );

    const existingThoughtChainsBySoundId = await step.run(
      `read location sound thought chains`,
      async () =>
        withDrizzle(
          async (db): Promise<LocationSoundThoughtChainsBySoundIdType> => {
            const setting = await db.query.userSetting.findFirst({
              where: and(
                eq(s.userSetting.userId, userId),
                eq(
                  s.userSetting.key,
                  pinyinSoundLocationThoughtChainsSetting.entity.marshalKey({
                    locationId,
                  }),
                ),
              ),
            });

            if (setting == null) {
              return {};
            }

            const decoded = pinyinSoundLocationThoughtChainsSetting.decode(
              { locationId },
              setting.value,
            );

            const thoughtChainsBySoundId =
              locationSoundThoughtChainsBySoundIdSchema.safeParse(
                decoded?.value,
              );

            return thoughtChainsBySoundId.success
              ? thoughtChainsBySoundId.data
              : {};
          },
        ),
    );

    const missingSoundIds: PinyinSoundId[] = [];

    for (const finalSoundId of finalSoundIds) {
      const existingCandidates = existingThoughtChainsBySoundId[finalSoundId];
      const existingCandidatesResult = z
        .array(locationSoundThoughtChainCandidateSchema)
        .safeParse(existingCandidates);
      const hasUsableExistingCandidates =
        existingCandidatesResult.success &&
        existingCandidatesResult.data.length > 0;

      if (hasUsableExistingCandidates) {
        continue;
      }

      missingSoundIds.push(finalSoundId);
    }

    for (const soundId of missingSoundIds) {
      await step.sendEvent(
        `emit location sound thought chain populate (${soundId})`,
        locationPopulateLocationSoundThoughtChainEvent.create({
          userId,
          locationId,
          soundId,
        }),
      );
    }
  },
);

const populateLocationSoundThoughtChain = inngest.createFunction(
  {
    id: `location/populateLocationSoundThoughtChain`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId + "-" + event.data.soundId`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationSoundThoughtChainEvent,
  },
  async ({ event, step, logger }) => {
    const { userId, locationId, soundId } = event.data;

    if (!isFinalSoundId(soundId)) {
      logger.error(
        { soundId, locationId, userId },
        `populateLocationSoundThoughtChain requires a final sound id`,
      );
      return;
    }

    const locationSpec = await step.run(
      `load location specification`,
      async () =>
        withDrizzle(async (db) => {
          return getLocationSpec(db, userId, locationId);
        }),
    );

    if (locationSpec == null) {
      logger.error(
        { soundId, locationId, userId },
        `Missing location specification for thought chain generation`,
      );
      return;
    }

    const existingThoughtChainsBySoundId = await step.run(
      `read location sound thought chains (${soundId})`,
      async () =>
        withDrizzle(
          async (db): Promise<LocationSoundThoughtChainsBySoundIdType> => {
            const setting = await db.query.userSetting.findFirst({
              where: and(
                eq(s.userSetting.userId, userId),
                eq(
                  s.userSetting.key,
                  pinyinSoundLocationThoughtChainsSetting.entity.marshalKey({
                    locationId,
                  }),
                ),
              ),
            });

            if (setting == null) {
              return {};
            }

            const decoded = pinyinSoundLocationThoughtChainsSetting.decode(
              { locationId },
              setting.value,
            );

            const thoughtChainsBySoundId =
              locationSoundThoughtChainsBySoundIdSchema.safeParse(
                decoded?.value,
              );

            return thoughtChainsBySoundId.success
              ? thoughtChainsBySoundId.data
              : {};
          },
        ),
    );

    const existingCandidatesResult = z
      .array(locationSoundThoughtChainCandidateSchema)
      .safeParse(existingThoughtChainsBySoundId[soundId]);
    const hasUsableExistingCandidates =
      existingCandidatesResult.success &&
      existingCandidatesResult.data.length > 0;

    if (hasUsableExistingCandidates) {
      return;
    }

    const response = await step.run(
      `generate location sound thought chains (${soundId})`,
      async () => {
        return requestOpenAiResponseJson(
          buildLocationSoundThoughtChain({
            syllable: soundId,
            pronunciationHint:
              defaultPinyinSoundInstructions[soundId] ?? soundId,
            location: locationSpec.location,
          }),
        );
      },
    );

    await step.run(
      `write location sound thought chains (${soundId})`,
      async () =>
        withDrizzle(async (db) => {
          // Re-read inside the write step so concurrent per-sound workers merge
          // against the latest stored map instead of a stale pre-generation
          // snapshot. This prevents workers from clobbering each other's keys.
          const latestSetting = await db.query.userSetting.findFirst({
            where: and(
              eq(s.userSetting.userId, userId),
              eq(
                s.userSetting.key,
                pinyinSoundLocationThoughtChainsSetting.entity.marshalKey({
                  locationId,
                }),
              ),
            ),
          });

          const latestDecoded = pinyinSoundLocationThoughtChainsSetting.decode(
            { locationId },
            latestSetting?.value ?? null,
          );

          const latestThoughtChainsBySoundIdResult =
            locationSoundThoughtChainsBySoundIdSchema.safeParse(
              latestDecoded?.value,
            );

          const latestThoughtChainsBySoundId: LocationSoundThoughtChainsBySoundIdType =
            latestThoughtChainsBySoundIdResult.success
              ? latestThoughtChainsBySoundIdResult.data
              : {};

          const mergedThoughtChainsBySoundId: LocationSoundThoughtChainsBySoundIdType =
            {
              ...latestThoughtChainsBySoundId,
              [soundId]: response.data.candidates,
            };

          await setUserSetting(db, userId, {
            key: pinyinSoundLocationThoughtChainsSetting.entity.marshalKey({
              locationId,
            }),
            value: pinyinSoundLocationThoughtChainsSetting.entity.marshalValue({
              locationId,
              value: mergedThoughtChainsBySoundId,
            }),
            now: new Date(),
            skipHistory: false,
            historyId: nanoid(),
          });
        }),
    );
  },
);

const populateLocationSetIdentityImage = inngest.createFunction(
  {
    id: `location/populateLocationSetIdentityImage`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId + "-" + event.data.setKey`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationSetIdentityImageEvent,
  },
  async ({ event, step, logger }) => {
    const { userId, locationId, setKey } = event.data;

    const { locationSpec, existingImage } = await step.run(
      `load location specification`,
      async () => {
        return withDrizzle(async (db) => {
          const locationSpec = await getLocationSpec(db, userId, locationId);
          const existingImage = await getLocationSetIdentityImage(
            db,
            userId,
            locationId,
            setKey,
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
        { locationId, userId, setKey },
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
          prompt: buildLocationSetIdentityImagePrompt({
            input: {
              locationSpec,
              targetSet: setKey,
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
          setKey,
          generatedAssetId,
        );
      }),
    );
  },
);

const populateLocationSetDescription = inngest.createFunction(
  {
    id: `location/populateLocationSetDescription`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId + "-" + event.data.setKey`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationSetDescriptionEvent,
  },
  async ({ event, step, logger }) => {
    const { userId, locationId, setKey } = event.data;

    await step.run(`read set description (${setKey})`, async () =>
      withDrizzle(async (db) => {
        const setting = await db.query.userSetting.findFirst({
          where: and(
            eq(s.userSetting.userId, userId),
            eq(
              s.userSetting.key,
              pinyinSoundLocationSetDescriptionSetting.entity.marshalKey({
                locationId,
                setKey,
              }),
            ),
          ),
        });

        if (setting == null) {
          return null;
        }

        const decoded = pinyinSoundLocationSetDescriptionSetting.decode(
          { locationId, setKey },
          setting.value,
        );

        const currentDescription = decoded?.text ?? null;

        if (
          currentDescription != null &&
          currentDescription.trim().length > 0
        ) {
          return;
        }

        const locationSpec = await getLocationSpec(db, userId, locationId);

        if (locationSpec == null) {
          logger.error(
            { locationId, userId, setKey },
            `Missing location specification for set description generation`,
          );
          return;
        }

        const response = await requestOpenAiResponseJson(
          buildLocationPopulateSetDescriptionPrompt({
            locationSpec,
            setKey,
          }),
        );

        await setUserSetting(db, userId, {
          key: pinyinSoundLocationSetDescriptionSetting.entity.marshalKey({
            locationId,
            setKey,
          }),
          value: pinyinSoundLocationSetDescriptionSetting.entity.marshalValue({
            locationId,
            setKey,
            text: response.data.description,
          }),
          now: new Date(),
          skipHistory: false,
          historyId: nanoid(),
        });
      }),
    );
  },
);

const populateLocationSetName = inngest.createFunction(
  {
    id: `location/populateLocationSetName`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId + "-" + event.data.setKey`,
      mode: `skip`,
    },
    triggers: locationPopulateLocationSetNameEvent,
  },
  async ({ event, step, logger }) => {
    const { userId, locationId, setKey } = event.data;

    await step.run(`read set name (${setKey})`, async () =>
      withDrizzle(async (db) => {
        const setting = await db.query.userSetting.findFirst({
          where: and(
            eq(s.userSetting.userId, userId),
            eq(
              s.userSetting.key,
              pinyinSoundLocationSetNameSetting.entity.marshalKey({
                locationId,
                setKey,
              }),
            ),
          ),
        });

        if (setting == null) {
          return null;
        }

        const decoded = pinyinSoundLocationSetNameSetting.decode(
          { locationId, setKey },
          setting.value,
        );

        const currentName = decoded?.text ?? null;

        if (currentName != null && currentName.trim().length > 0) {
          return;
        }

        const locationSpec = await getLocationSpec(db, userId, locationId);

        if (locationSpec == null) {
          logger.error(
            { locationId, userId, setKey },
            `Missing location specification for set name generation`,
          );
          return;
        }

        await setUserSetting(db, userId, {
          key: pinyinSoundLocationSetNameSetting.entity.marshalKey({
            locationId,
            setKey,
          }),
          value: pinyinSoundLocationSetNameSetting.entity.marshalValue({
            locationId,
            setKey,
            text: locationSpec.sets[setKey].name,
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

    let locationSpec: LocationSpec | null = await step.run(
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
                pinyinSoundLocationNameSetting.entity.marshalKey({
                  locationId,
                }),
              ),
            ),
          });

          if (setting == null) {
            return null;
          }

          const decoded = pinyinSoundLocationNameSetting.decode(
            { locationId: locationId },
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
        function: generateLocationSpec,
        data: {
          location: locationName,
          maxAttempts: 3,
        },
      });

      locationSpec = locationSpecSchema.parse(locationSpec);

      await step.run(`write location specification`, async () =>
        withDrizzle(async (db) => {
          await setUserSetting(db, userId, {
            key: locationSpecJsonSetting.entity.marshalKey({
              locationId: locationId,
            }),
            value: locationSpecJsonSetting.entity.marshalValue({
              locationId: locationId,
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

const runLocationNameSuggestions = inngest.createFunction(
  {
    id: `location/runLocationNameSuggestions`,
    triggers: [
      invoke(
        z.object({
          syllable: z.string(),
          count: z.number().optional(),
        }),
      ),
    ],
  },
  async ({ event, step }) => {
    const { syllable, count = 5 } = event.data;

    const prompt = buildLocationNameSuggestionsPrompt({
      syllable,
      count,
    });

    return step.run(`run prompt`, async () => {
      const response = await requestOpenAiResponseJson(prompt);
      return response.data;
    });
  },
);

export const functions = [
  generateLocationSpec,
  populateLocation,
  populateLocationSoundThoughtChain,
  populateLocationSetDescription,
  populateLocationSetIdentityImage,
  populateLocationSetName,
  populateLocationSpec,
  runLocationNameSuggestions,
];
