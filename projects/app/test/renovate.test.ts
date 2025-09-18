// pyly-not-src-test

import * as fs from "@pinyinly/lib/fs";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { workspaceRoot } from "./helpers";

const configPath = path.resolve(workspaceRoot, `renovate.json5`);

/**
 * Very small helper: take a JS string literal (single/double/backtick)
 * and evaluate it safely into a runtime string.
 * We assume the literal is trusted (from your repo).
 */
function evaluateJsStringLiteral(literal: string): string {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(`return (${literal});`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const val = fn() as unknown;
  if (typeof val !== `string`) {
    throw new TypeError(`Expected string literal, got ${typeof val}`);
  }
  return val;
}

describe(`Renovate regex @pyly-test samples`, () => {
  const src = fs.readFileSync(configPath, `utf8`);
  const lines = src.split(/\r?\n/);
  type Case = {
    lineNo: number;
    sample: string;
    expectedGroups: Record<string, string>;
    regexLiteral: string;
  };

  const cases: Case[] = [];

  function parseTestLine(testContent: string): {
    sample: string;
    expectedGroups: Record<string, string>;
  } {
    // Parse: "input string" key1=value1 key2=value2
    const quotedStringMatch = /^"([^"]*)"/.exec(testContent.trim());
    if (!quotedStringMatch) {
      throw new Error(
        `Expected quoted string at start of test line: ${testContent}`,
      );
    }

    const sample = nonNullable(quotedStringMatch[1]);
    const remainder = testContent.slice(quotedStringMatch[0].length).trim();

    const expectedGroups: Record<string, string> = {};
    if (remainder) {
      // Parse key=value pairs
      const pairs = remainder.split(/\s+/);
      for (const pair of pairs) {
        const [key, value] = pair.split(`=`, 2);
        invariant(key != null);
        if (value !== undefined && key.length > 0 && value.length > 0) {
          expectedGroups[key] = value;
        }
      }
    }

    return { sample, expectedGroups };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = nonNullable(lines[i]);
    // Match either // @pyly-test: ... or /* @pyly-test: ... */ on a single line
    const m = /@pyly-test:\s*(.+?)\s*(?:\*\/)?\s*$/.exec(line);
    if (!m) {
      continue;
    }

    // Collect this test sample
    const firstTestContent = nonNullable(m[1]);
    const firstParsed = parseTestLine(firstTestContent);
    const firstLineNo = i + 1;
    const samples = [{ lineNo: firstLineNo, ...firstParsed }];

    // Look for additional consecutive @pyly-test comments
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = nonNullable(lines[j]);
      const nextMatch = /@pyly-test:\s*(.+?)\s*(?:\*\/)?\s*$/.exec(nextLine);
      if (nextMatch) {
        const nextTestContent = nonNullable(nextMatch[1]);
        const nextParsed = parseTestLine(nextTestContent);
        samples.push({ lineNo: j + 1, ...nextParsed });
        j++;
      } else {
        break;
      }
    }

    // Find the next non-empty line that contains a JS string literal.
    let regexLiteral = ``;
    while (j < lines.length) {
      const next = lines[j]?.trim();
      invariant(next != null);
      if (next.length > 0) {
        // Find first string literal token on the line: "..." or '...' or `...`
        const lit = /(["'`])(?:\\.|(?!\1).)*\1/.exec(next);
        if (!lit) {
          throw new Error(
            `Expected a string literal containing the regex on line ${j + 1}`,
          );
        }
        regexLiteral = lit[0];
        break;
      }
      j++;
    }

    // Add all samples with the same regex pattern
    for (const { lineNo, sample, expectedGroups } of samples) {
      cases.push({ lineNo, sample, expectedGroups, regexLiteral });
    }

    i = j; // continue scanning after the regex literal line
  }

  if (cases.length === 0) {
    test(`found @pyly-test markers`, () => {
      expect(cases.length, `No @pyly-test markers found`).toBeGreaterThan(0);
    });
    return;
  }

  for (const c of cases) {
    test(`matches sample on line ${c.lineNo}: ${c.sample}`, () => {
      const pattern = evaluateJsStringLiteral(c.regexLiteral); // unescape to raw pattern
      const re = new RegExp(pattern);
      const match = re.exec(c.sample);

      if (!match) {
        expect(
          `Sample "${c.sample}" did not match pattern "${pattern}" (literal: ${c.regexLiteral})`,
        ).toBe(`Should have matched`);
        return;
      }

      // Check that the regex matches
      expect(match[0]).toBeTruthy();

      // Check capture groups if specified
      for (const [groupName, expectedValue] of Object.entries(
        c.expectedGroups,
      )) {
        const actualValue = match.groups?.[groupName];
        expect({ [groupName]: actualValue }).toEqual({
          [groupName]: expectedValue,
        });
      }
    });
  }
});
