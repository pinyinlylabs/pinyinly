import { parseHintText } from "#client/ui/hintText.ts";
import { describe, expect, test } from "vitest";

describe(`parseHintText` satisfies HasNameOf<typeof parseHintText>, () => {
  test(`returns empty hint and null description for null input`, () => {
    expect(parseHintText(null)).toEqual({ hint: ``, description: null });
  });

  test(`returns empty hint and null description for undefined input`, () => {
    expect(parseHintText(undefined)).toEqual({ hint: ``, description: null });
  });

  test(`returns empty hint and null description for empty string`, () => {
    expect(parseHintText(``)).toEqual({ hint: ``, description: null });
  });

  test(`returns empty hint and null description for whitespace-only string`, () => {
    expect(parseHintText(`   `)).toEqual({ hint: ``, description: null });
  });

  test(`returns hint with null description when there is no double newline`, () => {
    expect(parseHintText(`a simple hint`)).toEqual({
      hint: `a simple hint`,
      description: null,
    });
  });

  test(`returns hint with null description for single newline (not a separator)`, () => {
    expect(parseHintText(`line one\nline two`)).toEqual({
      hint: `line one\nline two`,
      description: null,
    });
  });

  test(`splits hint and description at the first double newline`, () => {
    expect(parseHintText(`the hint\n\nthe description`)).toEqual({
      hint: `the hint`,
      description: `the description`,
    });
  });

  test(`trims whitespace from hint and description`, () => {
    expect(parseHintText(`  the hint  \n\n  the description  `)).toEqual({
      hint: `the hint`,
      description: `the description`,
    });
  });

  test(`returns null description when description after separator is whitespace-only`, () => {
    expect(parseHintText(`the hint\n\n   `)).toEqual({
      hint: `the hint`,
      description: null,
    });
  });

  test(`only splits on the first double newline, keeping rest as description`, () => {
    expect(parseHintText(`the hint\n\nfirst para\n\nsecond para`)).toEqual({
      hint: `the hint`,
      description: `first para\n\nsecond para`,
    });
  });

  test(`normalizes CRLF line endings`, () => {
    expect(parseHintText(`the hint\r\n\r\nthe description`)).toEqual({
      hint: `the hint`,
      description: `the description`,
    });
  });

  test(`trims leading/trailing newlines from the whole value`, () => {
    expect(parseHintText(`\n\nthe hint\n\nthe description\n\n`)).toEqual({
      hint: `the hint`,
      description: `the description`,
    });
  });
});
