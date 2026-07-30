import type { ActorSpec, LocationSpec } from "#data/model.js";
import type { ChatPrompt, ChatPromptMessage } from "#server/lib/ai.js";
import { zodResponseFormatJson } from "#server/lib/ai.js";
import type { ImagePrompt, ImagePromptMessage } from "#server/lib/gemini.js";
import type { LocationSpecWithDetail } from "#util/prompts/locationSpec.js";
import omit from "lodash/omit";
import { expect } from "vitest";
import type { z } from "zod";

function fmtChatPromptMessagesForSnapshot(
  messages: ChatPromptMessage[],
): string {
  return messages
    .map(
      (m) =>
        `\n=====================\n ${m.role.toUpperCase()} MESSAGE\n---------------------\n${m.content}\n=====================\n`,
    )
    .join(`\n\n`);
}

export function fmtChatPromptForSnapshot<Schema extends z.ZodType>(
  prompt: ChatPrompt<Schema>,
) {
  // Make sure a title is defined.
  const meta = prompt.schema.meta();
  expect(
    meta?.title,
    `schema has a title defined (\`.meta({ title: "…" })\`)`,
  ).toBeDefined();

  const responseFormat = zodResponseFormatJson(prompt.schema);
  expect(responseFormat.name).toMatch(/^[a-zA-Z0-9_-]{1,63}$/u);

  const jsonSchema = responseFormat.schema;
  assertOpenAiCompatibleJsonSchema(jsonSchema);

  return {
    ...omit(prompt, [`messages`, `schema`]),
    messages: fmtChatPromptMessagesForSnapshot(prompt.messages),
    schema: responseFormat,
  };
}

function fmtImagePromptMessagesForSnapshot(
  messages: ImagePromptMessage[],
): string {
  return messages
    .map(
      (m) =>
        `\n=====================\n ${m.role.toUpperCase()} MESSAGE\n---------------------\n${
          m.kind === `text` ? m.content : `[ASSET: ${m.assetId}]`
        }\n=====================\n`,
    )
    .join(`\n\n`);
}

export function fmtImagePromptForSnapshot(prompt: ImagePrompt) {
  return {
    ...omit(prompt, [`messages`]),
    messages: fmtImagePromptMessagesForSnapshot(prompt.messages),
  };
}

export function assertOpenAiCompatibleJsonSchema(
  value: unknown,
  path: readonly (number | string)[] = [],
): void {
  if (value == null || typeof value !== `object`) {
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertOpenAiCompatibleJsonSchema(item, [...path, index]);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (unsupportedOpenAiJsonSchemaKeywords.has(key)) {
      throw new Error(
        `OpenAI response format does not support JSON Schema keyword ${JSON.stringify(key)} at ${formatJsonSchemaPath([...path, key])}`,
      );
    }

    assertOpenAiCompatibleJsonSchema(child, [...path, key]);
  }

  const isArraySchema =
    `type` in value &&
    (value.type === `array` ||
      (Array.isArray(value.type) && value.type.includes(`array`)));

  if (isArraySchema && !(`items` in value)) {
    throw new Error(
      `OpenAI response format requires JSON Schema arrays to define "items" at ${formatJsonSchemaPath(path)}`,
    );
  }

  const isObjectSchema =
    `type` in value &&
    (value.type === `object` ||
      (Array.isArray(value.type) && value.type.includes(`object`)));
  if (isObjectSchema && `additionalProperties` in value) {
    expect(
      value.additionalProperties,
      `OpenAI response format requires "additionalProperties" to be supplied and to be false at ${formatJsonSchemaPath(path)}`,
    ).toBe(false);
  }

  assertNoMissingRequiredProperties(value);
}

function assertNoMissingRequiredProperties(schema: unknown, path = `$`): void {
  const node = schema as Record<string, unknown>;

  const properties = node[`properties`];
  if (properties != null && typeof properties === `object`) {
    const propertyKeys = Object.keys(properties as Record<string, unknown>);
    if (propertyKeys.length > 0) {
      const required = node[`required`];
      expect
        .soft(
          Array.isArray(required),
          `${path}: "required" must be an array if "properties" is defined`,
        )
        .toBe(true);
      if (Array.isArray(required)) {
        const requiredSet = new Set(
          required.filter(
            (entry): entry is string => typeof entry === `string`,
          ),
        );

        for (const key of propertyKeys) {
          expect
            .soft(requiredSet, `${path}: missing required property "${key}"`)
            .toContain(key);
        }
      }

      for (const [key, value] of Object.entries(
        properties as Record<string, unknown>,
      )) {
        assertNoMissingRequiredProperties(value, `${path}.${key}`);
      }
    }
  }

  const items = node[`items`];
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      assertNoMissingRequiredProperties(items[i], `${path}.items[${i}]`);
    }
  } else if (items != null) {
    assertNoMissingRequiredProperties(items, `${path}.items`);
  }

  for (const keyword of [`allOf`, `anyOf`, `oneOf`] as const) {
    const variants = node[keyword];
    if (Array.isArray(variants)) {
      for (let i = 0; i < variants.length; i++) {
        assertNoMissingRequiredProperties(
          variants[i],
          `${path}.${keyword}[${i}]`,
        );
      }
    }
  }

  for (const keyword of [`not`, `if`, `then`, `else`] as const) {
    const subSchema = node[keyword];
    if (subSchema != null) {
      assertNoMissingRequiredProperties(subSchema, `${path}.${keyword}`);
    }
  }

  for (const keyword of [`$defs`, `definitions`] as const) {
    const defs = node[keyword];
    if (defs != null && typeof defs === `object`) {
      for (const [key, value] of Object.entries(
        defs as Record<string, unknown>,
      )) {
        assertNoMissingRequiredProperties(value, `${path}.${keyword}.${key}`);
      }
    }
  }
}

const unsupportedOpenAiJsonSchemaKeywords = new Set([
  `maxItems`,
  `minItems`,
  `prefixItems`,
]);

function formatJsonSchemaPath(path: readonly (number | string)[]): string {
  let result = `$`;

  for (const part of path) {
    result +=
      typeof part === `number`
        ? `[${part}]`
        : /^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(part)
          ? `.${part}`
          : `[${JSON.stringify(part)}]`;
  }

  return result;
}

export function makeLocationSpec(location: string): LocationSpec {
  return {
    location,
    sets: {
      arrival: {
        name: `dock`,
      },
      heart: {
        name: `captain's cabin`,
      },
      below: {
        name: `cargo hold`,
      },
      ascent: {
        name: `stairs`,
      },
      summit: {
        name: `crow's nest`,
      },
    },
  };
}

export function makeLocationSpecWithDetail(
  location: string,
): LocationSpecWithDetail {
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
        avoidFraming: [`Do not frame it as a distant open-sea panorama.`],
      },
      heart: {
        name: `captain's cabin`,
        props: [`Desk with a map on it`],
        designRules: [`Show the richest interior detail.`],
        canonicalFraming: `View from the doorway looking toward the captain's chair and desk.`,
        avoidFraming: [`Do not reduce it to a plain hallway.`],
      },
      below: {
        name: `cargo hold`,
        props: [`Barrels`],
        designRules: [`Show stacked crates and a low ceiling.`],
        canonicalFraming: `View from knee height looking into the lower hold.`,
        avoidFraming: [`Do not frame it like the main deck.`],
      },
      ascent: {
        name: `stairs`,
        props: [`Handrail`],
        designRules: [`Show the climb upward along the mast.`],
        canonicalFraming: `View from below looking up the rigging and steps.`,
        avoidFraming: [`Do not frame it as a flat side path.`],
      },
      summit: {
        name: `crow's nest`,
        props: [`Binoculars`],
        designRules: [`Show the tiny lookout at the top of the mast.`],
        canonicalFraming: `View from the deck looking up to the lookout platform.`,
        avoidFraming: [`Do not frame it as the same as the cabin interior.`],
      },
    },
  };
}

export function makeActorSpec(actorName: string): ActorSpec {
  return {
    nickname: actorName,
  };
}
