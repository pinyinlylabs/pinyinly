import { renderPromptTemplate } from "#util/prompts/shared.ts";
import { describe, expect, test } from "vitest";

describe(`renderPromptTemplate`, () => {
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

  test(`throws when a placeholder remains unresolved`, () => {
    expect(() => renderPromptTemplate(`Start {{ missing }} end`, {})).toThrow(
      `Unresolved prompt template variables: missing`,
    );
  });

  test(`reports every unresolved placeholder name`, () => {
    expect(() =>
      renderPromptTemplate(`{{ first }} and {{ second }} and {{ first }}`, {}),
    ).toThrow(`Unresolved prompt template variables: first, second, first`);
  });
});
