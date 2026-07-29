import type { ChatPrompt, ChatPromptMessage } from "#server/lib/ai.js";
import { zodResponseFormatJson } from "#server/lib/ai.js";
import type { ImagePrompt, ImagePromptMessage } from "#server/lib/gemini.js";
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
  const responseFormat = zodResponseFormatJson(prompt.schema);
  assertOpenAiCompatibleJsonSchema(responseFormat.schema);

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
