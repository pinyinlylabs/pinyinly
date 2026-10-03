// pyly-not-src-test

import { projectRoot, workspaceRoot } from "#bin/util/paths.ts";
import * as fs from "@pinyinly/lib/fs";
import { expect, test } from "vitest";
import YAML from "yaml";
import { z } from "zod";

const workflowSchema = z.object({
  jobs: z.record(
    z.string(),
    z.union([
      z.object({
        steps: z.array(
          z
            .object({
              name: z.string(),
              env: z.record(z.string(), z.unknown()),
            })
            .partial(),
        ),
      }),
      z.object({
        uses: z.string(),
      }),
    ]),
  ),
});

test(`no missing EXPO_PUBLIC_ environment variables`, async () => {
  // Read the expected set of EXPO_PUBLIC_ named environment variables from `.env.local.sample`
  const envLocalSample = await fs.readFile(
    projectRoot + `/.env.local.sample`,
    `utf8`,
  );
  const expoPublicEnvVars = envLocalSample
    .match(/^EXPO_PUBLIC_[A-Z_]+=/gmu)
    ?.map((line) => line.split(`=`)[0]);

  const expectedEnvVars = new Set(expoPublicEnvVars);

  let expectCount = 0;

  // For each GitHub workflow, find each `env` key for a step that contains at
  // least one `EXPO_PUBLIC_` environment variable and check that it includes
  // all of the ones defined in `.env.local.sample`.
  for (const workflowPath of await fs.glob(
    `${workspaceRoot}/.github/workflows/*.yml`,
  )) {
    const workflowContents = await fs.readFile(workflowPath, `utf8`);
    const workflow = workflowSchema.parse(YAML.parse(workflowContents));

    for (const [_jobName, job] of Object.entries(workflow.jobs)) {
      if (!(`steps` in job)) {
        continue;
      }
      for (const step of job.steps) {
        if (step.env != null) {
          const stepExpoPublicEnvVars = new Set(
            Object.keys(step.env).filter((key) =>
              key.startsWith(`EXPO_PUBLIC_`),
            ),
          );
          if (stepExpoPublicEnvVars.size > 0) {
            expect({
              file: workflowPath,
              envVars: stepExpoPublicEnvVars,
            }).toEqual({ file: workflowPath, envVars: expectedEnvVars });
            expectCount++;
          }
        }
      }
    }
  }

  expect(expectCount).toBeGreaterThan(0);
});

test(`workflow schema supports reusable workflow jobs alongside step jobs`, () => {
  expect(
    workflowSchema.parse({
      jobs: {
        appPreview: { uses: `./.github/workflows/app-preview.yml` },
        test: { steps: [{ name: `Run tests` }] },
      },
    }),
  ).toEqual({
    jobs: {
      appPreview: { uses: `./.github/workflows/app-preview.yml` },
      test: { steps: [{ name: `Run tests` }] },
    },
  });
  expect(workflowSchema.safeParse({ jobs: { test: {} } }).success).toBe(false);
});
