import { createJudge, describeEval } from "vitest-evals";
import type { JudgeContext } from "vitest-evals";
import { buildActorSpecPrompt } from "#util/prompts/actorSpec.ts";
import type {
  ActorSpecInputType,
  ActorSpecType,
} from "#util/prompts/actorSpec.ts";
import { createResponsePromptHarness } from "./eval.ts";

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function hasAllCoreFields(actor: ActorSpecType): boolean {
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

const ActorJudge = createJudge(
  `ActorJudge`,
  async ({
    input,
    output,
  }: JudgeContext<ActorSpecInputType, ActorSpecType>) => {
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

const promptCases: ActorSpecInputType[] = [
  { identity: `Dracula` },
  { identity: `Bear` },
  { identity: `Julius Caesar` },
];

describeEval(
  `buildActorSpecPrompt eval`,
  {
    harness: createResponsePromptHarness(buildActorSpecPrompt),
    judges: [ActorJudge],
  },
  (it) => {
    it.for(promptCases)(`$identity`, async (spec, { run }) => {
      await run(spec);
    });
  },
);
