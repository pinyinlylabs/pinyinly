// hhh-standalone-test

import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";
import { z } from "zod/v4";

const workflowSchema = z.object({
  jobs: z.record(
    z.string(),
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
  ),
});

await test(`no missing EXPO_PUBLIC_ environment variables`, async () => {
  const projectRoot = import.meta.dirname + `/..`;
  const workspaceRoot = projectRoot + `/../..`;
  const githubWorkflowsPath = `.github/workflows`;

  // Read the expected set of EXPO_PUBLIC_ named environment variables from `.env.local.sample`
  const envLocalSample = await fs.readFile(
    projectRoot + `/.env.local.sample`,
    `utf8`,
  );
  const expoPublicEnvVars = envLocalSample
    .match(/^EXPO_PUBLIC_[A-Z_]+=/gm)
    ?.map((line) => line.split(`=`)[0]);

  const expectedEnvVars = new Set(expoPublicEnvVars);

  // For each Github workflow, find each `env` key for a step that contains at
  // least one `EXPO_PUBLIC_` environment variable and check that it includes
  // all of the ones defined in `.env.local.sample`.
  const workflowFileNames = await fs.readdir(
    `${workspaceRoot}/${githubWorkflowsPath}`,
  );
  for (const workflowFileName of workflowFileNames) {
    const workflowPath = `${githubWorkflowsPath}/${workflowFileName}`;

    const workflowContents = await fs.readFile(
      `${workspaceRoot}/${workflowPath}`,
      `utf8`,
    );
    const workflow = workflowSchema.parse(YAML.parse(workflowContents));

    for (const [_jobName, job] of Object.entries(workflow.jobs)) {
      for (const step of job.steps) {
        if (step.env != null) {
          const stepExpoPublicEnvVars = new Set(
            Object.keys(step.env).filter((key) =>
              key.startsWith(`EXPO_PUBLIC_`),
            ),
          );
          if (stepExpoPublicEnvVars.size > 0) {
            assert.deepEqual(
              stepExpoPublicEnvVars,
              expectedEnvVars,
              `Mismatched EXPO_PUBLIC_ environment variables in ${workflowPath}`,
            );
          }
        }
      }
    }
  }
});
