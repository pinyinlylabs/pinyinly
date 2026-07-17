// pyly-not-src-test
import { createJudge, describeEval } from "vitest-evals";
import type { JudgeContext } from "vitest-evals";
import { buildMnemonicActorProfilePrompt } from "#util/prompts.ts";
import type {
  MnemonicActorPromptInputType,
  MnemonicActorProfileType,
} from "#util/prompts.ts";
import { createResponsePromptHarness } from "./eval";

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function hasAllCoreFields(actor: MnemonicActorProfileType): boolean {
  return (
    actor.identity.trim().length > 0 &&
    actor.nickname.trim().length > 0 &&
    actor.summary.trim().length > 0 &&
    actor.identityAnchor.trim().length > 0 &&
    actor.coreTraits.length >= 3 &&
    actor.obsession.trim().length > 0 &&
    actor.signatureAbility.trim().length > 0 &&
    actor.storyRole.trim().length > 0 &&
    actor.always.length >= 3 &&
    actor.never.length >= 3 &&
    actor.likes.length >= 3 &&
    actor.dislikes.length >= 3 &&
    actor.defaultMood.trim().length > 0 &&
    actor.bodyLanguage.trim().length > 0 &&
    actor.signatureExpression.trim().length > 0 &&
    actor.weakness.trim().length > 0
  );
}

const MnemonicActorJudge = createJudge(
  `MnemonicActorJudge`,
  async ({
    input,
    output,
  }: JudgeContext<MnemonicActorPromptInputType, MnemonicActorProfileType>) => {
    const structureScore = hasAllCoreFields(output) ? 1 : 0;
    const identityScore =
      normalized(output.identity) === normalized(input.identity) ? 1 : 0;

    return {
      score: (structureScore + identityScore) / 2,
      metadata: {
        rationale:
          structureScore === 1 && identityScore === 1
            ? `Actor profile structure is complete and identity is preserved.`
            : `Missing required actor profile content or identity mismatch.`,
      },
    };
  },
);

const promptCases: MnemonicActorPromptInputType[] = [
  { identity: `Dracula` },
  { identity: `Bear` },
  { identity: `Julius Caesar` },
];

describeEval(
  `buildMnemonicActorProfilePrompt eval`,
  {
    harness: createResponsePromptHarness(buildMnemonicActorProfilePrompt),
    judges: [MnemonicActorJudge],
  },
  (it) => {
    it.for(promptCases)(`$identity`, async (spec, { run }) => {
      await run(spec);
    });
  },
);
