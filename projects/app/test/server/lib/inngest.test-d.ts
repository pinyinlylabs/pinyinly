import { inngest } from "#server/lib/inngest.ts";
import { test } from "vitest";

test(`@inngest/eslint-plugin is configured correctly`, () => {
  inngest.createFunction(
    { id: `test-fn` },
    { event: `test/test-fn` },
    async ({ step }) => {
      await step.run(`a`, async () => {
        // eslint-disable-next-line @inngest/no-nested-steps
        await step.run(`b`, () => {
          return null;
        });
      });

      return null;
    },
  );
});
