import { placeIdSchema } from "@/data/model";
import {
  pinyinSoundLocationIdentityImageSetting,
  pinyinSoundLocationIdentityImageSettingKey,
  pinyinSoundLocationNameSetting,
  pinyinSoundLocationNameSettingKey,
  pinyinSoundLocationSpecificationSetting,
  pinyinSoundLocationSetIdentityImageSetting,
  pinyinSoundLocationSetIdentityImageSettingKey,
  pinyinSoundLocationSetNameSetting,
  pinyinSoundLocationSetNameSettingKey,
} from "@/data/userSettings";
import * as s from "@/server/pgSchema";
import {
  evaluateLocationSpecification,
  generateLocationSpecification,
  hasMajorCriticisms,
  isFundamentalFailure,
  locationSpecificationSchema,
  refineLocationSpecification,
  updateBestAttempt,
} from "@/util/prompts/location";
import { buildLocationIdentityImagePrompt } from "@/util/prompts/locationIdentityImage";
import { buildLocationSetIdentityImagePrompt } from "@/util/prompts/locationSetIdentityImage";
import type {
  LocationSetRole,
  LocationSpecificationRefinementAttemptType,
} from "@/util/prompts/location";
import { and, eq } from "drizzle-orm";
import { invoke } from "inngest";
import z from "zod";
import { nanoid } from "@/util/nanoid";
import { setUserSetting } from "@/server/lib/userSettings";
import { withDrizzle } from "@/server/lib/db";
import { requestGeminiImageAsAsset } from "@/server/lib/gemini";
import { inngest } from "./client";

export const runLocationSpecificationRefinementFunction =
  inngest.createFunction(
    {
      id: `runLocationSpecificationRefinement`,
      triggers: [
        invoke(
          z.object({
            location: z.string().min(1),
            maxAttempts: z.number().int().min(1).optional(),
          }),
        ),
      ],
    },
    async ({ event, step, logger }) => {
      const { location } = event.data;
      const maxAttempts = event.data.maxAttempts ?? 3;

      if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
        throw new Error(
          `maxAttempts must be an integer greater than or equal to 1`,
        );
      }

      const attempts: LocationSpecificationRefinementAttemptType[] = [];
      let bestAttempt: LocationSpecificationRefinementAttemptType | null = null;

      let currentLocationSpecification = await step.run(
        `location-specification-initial-generate`,
        async () => {
          return generateLocationSpecification({ location });
        },
      );

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const locationSpecificationForEvaluation = currentLocationSpecification;
        const evaluation = await step.run(
          `location-specification-evaluate-attempt-${attempt}`,
          async () => {
            return evaluateLocationSpecification({
              location,
              locationSpecification: locationSpecificationForEvaluation,
            });
          },
        );

        const currentAttempt: LocationSpecificationRefinementAttemptType = {
          attempt,
          locationSpecification: currentLocationSpecification,
          evaluation,
        };

        attempts.push(currentAttempt);
        bestAttempt = updateBestAttempt(bestAttempt, currentAttempt);

        logger.info(
          {
            location,
            attempt,
            score: evaluation.score,
            passed: evaluation.passed,
            majorCriticisms: evaluation.criticisms.filter(
              (criticism) => criticism.severity === `major`,
            ).length,
          },
          `Evaluated location specification attempt`,
        );

        if (!hasMajorCriticisms(evaluation)) {
          return {
            attempts,
            succeeded: true,
            stopReason: `no_major_criticisms`,
            finalLocationSpecification: currentLocationSpecification,
            finalEvaluation: evaluation,
          };
        }

        if (attempt === maxAttempts) {
          const selectedAttempt = bestAttempt;

          return {
            attempts,
            succeeded: false,
            stopReason: `max_attempts_reached`,
            finalLocationSpecification: selectedAttempt.locationSpecification,
            finalEvaluation: selectedAttempt.evaluation,
          };
        }

        const shouldRegenerate = isFundamentalFailure(evaluation);
        const evaluationForRefinement = evaluation;
        const locationSpecificationForRefinement = currentLocationSpecification;
        currentLocationSpecification = await step.run(
          shouldRegenerate
            ? `location-specification-regenerate-attempt-${attempt}`
            : `location-specification-refine-attempt-${attempt}`,
          async () => {
            if (shouldRegenerate) {
              return generateLocationSpecification({ location });
            }

            return refineLocationSpecification({
              location,
              locationSpecification: locationSpecificationForRefinement,
              criticisms: evaluationForRefinement.criticisms,
            });
          },
        );
      }

      throw new Error(`Unexpected location specification refinement state`);
    },
  );

export interface GenerateLocationSetIdentityImagesOutput {
  locationId: string;
  updatedSetNames: LocationSetRole[];
  generatedImages: LocationSetRole[];
  generatedLocationSpecification: boolean;
  generatedLocationIdentityImage: boolean;
  failures: Array<{
    role: LocationSetRole | `location`;
    stage: `name` | `image`;
    message: string;
  }>;
}

const generateLocationSetIdentityImages = inngest.createFunction(
  {
    id: `generateLocationSetIdentityImages`,
    singleton: {
      key: `event.data.userId + "-" + event.data.locationId`,
      mode: `skip`,
    },
    triggers: [
      invoke(
        z
          .object({
            userId: z.string().min(1),
            locationId: placeIdSchema,
          })
          .strict(),
      ),
    ],
  },
  async ({
    event,
    step,
    logger,
  }): Promise<GenerateLocationSetIdentityImagesOutput> => {
    const { userId, locationId } = event.data;

    let locationSpec = await step.run(
      `load location specification`,
      async () => {
        return withDrizzle(async (db) => {
          const setting = await db.query.userSetting.findFirst({
            where: and(
              eq(s.userSetting.userId, userId),
              eq(
                s.userSetting.key,
                pinyinSoundLocationSpecificationSetting.entity.marshalKey({
                  placeId: locationId,
                }),
              ),
            ),
          });

          if (setting == null) {
            return null;
          }

          const decoded = pinyinSoundLocationSpecificationSetting.decode(
            { placeId: locationId },
            setting.value,
          );

          if (decoded == null) {
            return null;
          }

          try {
            const parsed = JSON.parse(decoded.text) as unknown;
            const result = locationSpecificationSchema.safeParse(parsed);
            return result.success ? result.data : null;
          } catch {
            return null;
          }
        });
      },
    );

    let generatedLocationSpecification = false;
    if (locationSpec == null) {
      try {
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

        if (locationName == null) {
          logger.error({ locationId, userId }, `Missing location name`);
          return {
            locationId,
            updatedSetNames: [],
            generatedImages: [],
            generatedLocationSpecification: false,
            generatedLocationIdentityImage: false,
            failures: [
              {
                role: `location`,
                stage: `name`,
                message: `Missing location name required to generate location specification`,
              },
            ],
          };
        }

        const refinementResult = await step.invoke(`refine-location-spec`, {
          function: runLocationSpecificationRefinementFunction,
          data: {
            location: locationName,
            maxAttempts: 3,
          },
        });

        locationSpec = refinementResult.finalLocationSpecification;

        await step.run(`write location specification`, async () =>
          withDrizzle(async (db) => {
            await setUserSetting(db, userId, {
              key: pinyinSoundLocationSpecificationSetting.entity.marshalKey({
                placeId: locationId,
              }),
              value:
                pinyinSoundLocationSpecificationSetting.entity.marshalValue({
                  placeId: locationId,
                  text: JSON.stringify(locationSpec),
                }),
              now: new Date(),
              skipHistory: false,
              historyId: nanoid(),
            });
          }),
        );

        generatedLocationSpecification = true;

        logger.info(
          {
            locationId,
            userId,
            locationName,
            refinementStopReason: refinementResult.stopReason,
            refinementSucceeded: refinementResult.succeeded,
            refinementScore: refinementResult.finalEvaluation.score,
          },
          `Generated location specification`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          { err: error, locationId, userId },
          `Failed to generate location specification`,
        );
        return {
          locationId,
          updatedSetNames: [],
          generatedImages: [],
          generatedLocationSpecification: false,
          generatedLocationIdentityImage: false,
          failures: [
            {
              role: `location`,
              stage: `name`,
              message: `Failed to generate location specification: ${message}`,
            },
          ],
        };
      }
    }

    const summary: GenerateLocationSetIdentityImagesOutput = {
      locationId,
      updatedSetNames: [],
      generatedImages: [],
      generatedLocationSpecification,
      generatedLocationIdentityImage: false,
      failures: [],
    };

    const processRole = async (role: LocationSetRole) => {
      try {
        const currentName = await step.run(
          `read set name (${role})`,
          async () =>
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

              return decoded?.text ?? null;
            }),
        );

        if (currentName == null || currentName.trim().length === 0) {
          await step.run(`write set name (${role})`, async () =>
            withDrizzle(async (db) => {
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

          summary.updatedSetNames.push(role);
        }
      } catch (error) {
        summary.failures.push({
          role,
          stage: `name`,
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      try {
        const existingImage = await step.run(
          `read set identity image (${role})`,
          async () =>
            withDrizzle(async (db) => {
              const setting = await db.query.userSetting.findFirst({
                where: and(
                  eq(s.userSetting.userId, userId),
                  eq(
                    s.userSetting.key,
                    pinyinSoundLocationSetIdentityImageSettingKey(
                      locationId,
                      role,
                    ),
                  ),
                ),
              });

              if (setting == null) {
                return null;
              }

              const decoded = pinyinSoundLocationSetIdentityImageSetting.decode(
                { placeId: locationId, role },
                setting.value,
              );

              return decoded?.imageId ?? null;
            }),
        );

        if (existingImage != null) {
          return;
        }

        const generatedAssetId = await step.run(
          `generate set identity image (${role})`,
          async () => {
            return requestGeminiImageAsAsset(
              buildLocationSetIdentityImagePrompt({
                input: {
                  locationSpec,
                  targetSet: role,
                },
              }),
            );
          },
        );

        await step.run(`write set identity image (${role})`, async () =>
          withDrizzle(async (db) => {
            await setUserSetting(db, userId, {
              key: pinyinSoundLocationSetIdentityImageSettingKey(
                locationId,
                role,
              ),
              value:
                pinyinSoundLocationSetIdentityImageSetting.entity.marshalValue({
                  placeId: locationId,
                  role,
                  imageId: generatedAssetId,
                }),
              now: new Date(),
              skipHistory: false,
              historyId: nanoid(),
            });
          }),
        );

        summary.generatedImages.push(role);
      } catch (error) {
        summary.failures.push({
          role,
          stage: `image`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    for (const role of [
      `arrival`,
      `heart`,
      `below`,
      `ascent`,
      `summit`,
    ] as const) {
      await processRole(role);
    }

    try {
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
        const generatedLocationImageAssetId = await step.run(
          `generate location identity image`,
          async () => {
            return requestGeminiImageAsAsset(
              buildLocationIdentityImagePrompt({
                input: {
                  locationSpec,
                },
              }),
            );
          },
        );

        await step.run(`write location identity image`, async () =>
          withDrizzle(async (db) => {
            await setUserSetting(db, userId, {
              key: pinyinSoundLocationIdentityImageSettingKey(locationId),
              value:
                pinyinSoundLocationIdentityImageSetting.entity.marshalValue({
                  placeId: locationId,
                  imageId: generatedLocationImageAssetId,
                }),
              now: new Date(),
              skipHistory: false,
              historyId: nanoid(),
            });
          }),
        );

        summary.generatedLocationIdentityImage = true;
      }
    } catch (error) {
      summary.failures.push({
        role: `location`,
        stage: `image`,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info(
      {
        locationId,
        userId,
        updatedSetNames: summary.updatedSetNames,
        generatedImages: summary.generatedImages,
        generatedLocationSpecification: summary.generatedLocationSpecification,
        generatedLocationIdentityImage: summary.generatedLocationIdentityImage,
        failureCount: summary.failures.length,
      },
      `Generated location set identity images`,
    );

    return summary;
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  runLocationSpecificationRefinementFunction,
  generateLocationSetIdentityImages,
];
