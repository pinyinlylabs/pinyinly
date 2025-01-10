import { inngest } from "@/server/lib/inngest";

function typeChecks(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

typeChecks(`@inngest/eslint-plugin is configured correctly`, async () => {
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
