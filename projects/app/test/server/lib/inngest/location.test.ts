import { generateLocationSpec } from "#server/lib/inngest/location.ts";
import { requestOpenAiResponseJson } from "#server/lib/ai.js";
import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { LocationSpecWithDetail } from "#util/prompts/locationSpec.js";

vi.mock(`#server/lib/ai.js`, async () => {
  const actual =
    await vi.importActual<typeof import("#server/lib/ai.js")>(
      `#server/lib/ai.js`,
    );

  return {
    ...actual,
    requestOpenAiResponseJson: vi.fn(),
  };
});

function makeLocationSpec(location: string): LocationSpecWithDetail {
  return {
    location,
    recognitionHooks: [`mast`, `bow`, `anchor`],
    designRules: [`Keep the hull dominant in the composition.`],
    sets: {
      arrival: {
        name: `dock`,
        props: [],
        designRules: [`Show the gangplank and mooring ropes.`],
        canonicalFraming: `View from the dock looking toward the deck entrance.`,
      },
      heart: {
        name: `captain's cabin`,
        props: [`Desk with a map on it`],
        designRules: [`Show the richest interior detail.`],
        canonicalFraming: `View from the doorway looking toward the captain's chair and desk.`,
      },
      below: {
        name: `cargo hold`,
        props: [`Barrels`],
        designRules: [`Show stacked crates and a low ceiling.`],
        canonicalFraming: `View from knee height looking into the lower hold.`,
      },
      ascent: {
        name: `stairs`,
        props: [`Handrail`],
        designRules: [`Show the climb upward along the mast.`],
        canonicalFraming: `View from below looking up the rigging and steps.`,
      },
      summit: {
        name: `crow's nest`,
        props: [`Binoculars`],
        designRules: [`Show the tiny lookout at the top of the mast.`],
        canonicalFraming: `View from the deck looking up to the lookout platform.`,
      },
    },
  };
}

function promptKind(content: string): `generator` {
  if (content.includes(`creating the canonical design specification`)) {
    return `generator`;
  }

  throw new Error(`Unexpected prompt kind`);
}

describe(`generateLocationSpec`, () => {
  const requestMock = vi.mocked(requestOpenAiResponseJson);

  async function executeGeneration(
    location: string,
  ): Promise<LocationSpecWithDetail> {
    const testEngine = new InngestTestEngine({
      function: generateLocationSpec,
    });

    const { result, error } = await testEngine.execute({
      events: [
        {
          name: `inngest/function.invoked`,
          data: { location },
        },
      ],
    });

    if (error != null) {
      throw error instanceof Error
        ? error
        : new Error(`Generation execution failed`);
    }

    return result as LocationSpecWithDetail;
  }

  beforeEach(() => {
    requestMock.mockReset();
  });

  test(`generates and returns one location spec in a single model call`, async () => {
    const generated = makeLocationSpec(`Pirate ship`);
    requestMock.mockResolvedValue({ data: generated, model: `gpt-5.4` });

    const result = await executeGeneration(`Pirate ship`);

    expect(result).toEqual(generated);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  test(`uses the generation prompt without evaluation or refine prompts`, async () => {
    const generated = makeLocationSpec(`Pirate ship`);
    requestMock.mockResolvedValue({ data: generated, model: `gpt-5.4` });

    await executeGeneration(`Pirate ship`);

    const firstPrompt = requestMock.mock.calls[0]?.[0];
    if (firstPrompt == null) {
      throw new Error(`Expected generateLocationSpec to call OpenAI once`);
    }

    const firstMessageContent = firstPrompt.messages[0]?.content ?? ``;

    expect(promptKind(firstMessageContent)).toBe(`generator`);
    expect(firstMessageContent).not.toContain(
      `evaluating a location specification`,
    );
    expect(firstMessageContent).not.toContain(
      `You revise location specifications`,
    );
  });
});
