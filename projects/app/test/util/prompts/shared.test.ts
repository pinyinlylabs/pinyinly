import { renderPromptTemplate } from "#util/prompts/shared.ts";
import { buildLocationSetDescriptionPrompt } from "#util/prompts/location.ts";
import {
  buildMeaningHintCausualBridgePrompt,
  buildMeaningHintLogicalPrompt,
  buildMeaningHintPrompt,
} from "#util/prompts/meaningHint.ts";
import { buildMnemonicActorProfilePrompt } from "#util/prompts/buildMnemonicActorProfilePrompt.ts";
import {
  buildPronunciationHintFantasyPrompt,
  buildPronunciationHintRealisticPrompt,
} from "#util/prompts/pronunciationHint.ts";
import { describe, expect, test } from "vitest";
import { z } from "zod";

function collectMissingRequiredProperties(
  schema: unknown,
  path = `$`,
): string[] {
  const issues: string[] = [];

  if (schema == null || typeof schema !== `object`) {
    return issues;
  }

  const node = schema as Record<string, unknown>;

  const properties = node[`properties`];
  if (properties != null && typeof properties === `object`) {
    const propertyKeys = Object.keys(properties as Record<string, unknown>);
    if (propertyKeys.length > 0) {
      const required = node[`required`];
      if (Array.isArray(required)) {
        const requiredSet = new Set(
          required.filter(
            (entry): entry is string => typeof entry === `string`,
          ),
        );

        for (const key of propertyKeys) {
          if (!requiredSet.has(key)) {
            issues.push(`${path}: missing required property "${key}"`);
          }
        }
      } else {
        issues.push(
          `${path}: object with properties must define required[] containing every property key`,
        );
      }

      for (const [key, value] of Object.entries(
        properties as Record<string, unknown>,
      )) {
        issues.push(
          ...collectMissingRequiredProperties(value, `${path}.${key}`),
        );
      }
    }
  }

  const items = node[`items`];
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      issues.push(
        ...collectMissingRequiredProperties(items[i], `${path}.items[${i}]`),
      );
    }
  } else if (items != null) {
    issues.push(...collectMissingRequiredProperties(items, `${path}.items`));
  }

  for (const keyword of [`allOf`, `anyOf`, `oneOf`] as const) {
    const variants = node[keyword];
    if (Array.isArray(variants)) {
      for (let i = 0; i < variants.length; i++) {
        issues.push(
          ...collectMissingRequiredProperties(
            variants[i],
            `${path}.${keyword}[${i}]`,
          ),
        );
      }
    }
  }

  for (const keyword of [`not`, `if`, `then`, `else`] as const) {
    const subSchema = node[keyword];
    if (subSchema != null) {
      issues.push(
        ...collectMissingRequiredProperties(subSchema, `${path}.${keyword}`),
      );
    }
  }

  for (const keyword of [`$defs`, `definitions`] as const) {
    const defs = node[keyword];
    if (defs != null && typeof defs === `object`) {
      for (const [key, value] of Object.entries(
        defs as Record<string, unknown>,
      )) {
        issues.push(
          ...collectMissingRequiredProperties(
            value,
            `${path}.${keyword}.${key}`,
          ),
        );
      }
    }
  }

  return issues;
}

describe(
  `renderPromptTemplate` satisfies HasNameOf<typeof renderPromptTemplate>,
  () => {
    test(`replaces known placeholders including internal newlines`, () => {
      const result = renderPromptTemplate(
        `A {{ adjective }} template with:\n{{ payload }}`,
        {
          adjective: `helpful`,
          payload: `line 1\nline 2`,
        },
      );

      expect(result).toBe(`A helpful template with:\nline 1\nline 2`);
    });

    test(`supports placeholder names with surrounding whitespace`, () => {
      const result = renderPromptTemplate(`Count: {{   count   }}`, {
        count: `4`,
      });

      expect(result).toBe(`Count: 4`);
    });

    test(`replaces unknown placeholders with empty string`, () => {
      const result = renderPromptTemplate(`Start {{ missing }} end`, {});

      expect(result).toBe(`Start  end`);
    });
  },
);

describe(`AI prompt schemas`, () => {
  test(`are valid for OpenAI json_schema strict object requirements`, () => {
    const schemas = [
      [
        `buildMeaningHintCausualBridgePrompt.schema`,
        buildMeaningHintCausualBridgePrompt.schema,
      ] as const,
      [
        `buildPronunciationHintFantasyPrompt.schema`,
        buildPronunciationHintFantasyPrompt.schema,
      ] as const,
      [
        `buildPronunciationHintRealisticPrompt.schema`,
        buildPronunciationHintRealisticPrompt.schema,
      ] as const,
      [`buildMeaningHintPrompt.schema`, buildMeaningHintPrompt.schema] as const,
      [
        `buildMeaningHintLogicalPrompt.schema`,
        buildMeaningHintLogicalPrompt.schema,
      ] as const,
      [
        `buildLocationSetDescriptionPrompt.schema`,
        buildLocationSetDescriptionPrompt.schema,
      ] as const,
      [
        `buildMnemonicActorProfilePrompt.schema`,
        buildMnemonicActorProfilePrompt.schema,
      ] as const,
    ];

    const allIssues: string[] = [];
    for (const [name, schema] of schemas) {
      const jsonSchema = z.toJSONSchema(schema, { unrepresentable: `throw` });
      const issues = collectMissingRequiredProperties(jsonSchema);
      for (const issue of issues) {
        allIssues.push(`${name}: ${issue}`);
      }
    }

    expect(allIssues).toEqual([]);
  });
});
