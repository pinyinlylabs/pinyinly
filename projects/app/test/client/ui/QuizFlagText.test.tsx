// @vitest-environment happy-dom

import { QuizFlagText } from "#client/ui/QuizFlagText.tsx";
import { QuestionFlagKind } from "#data/model.ts";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe(`QuizFlagText`, () => {
  test(`rounds sub-minute overdue durations up to 1 minute`, () => {
    const now = new Date();

    render(
      <QuizFlagText
        flag={{
          kind: QuestionFlagKind.Overdue,
          interval: { start: new Date(now.getTime() - 30_000), end: now },
        }}
      />,
    );

    expect(screen.getByText(`Overdue by 1 minute`)).toBeInTheDocument();
  });

  test.each([
    { name: `1 minute`, intervalMs: 60_000, expected: `Overdue by 1 minute` },
    { name: `1 hour`, intervalMs: 60 * 60_000, expected: `Overdue by 1 hour` },
    {
      name: `1 day`,
      intervalMs: 24 * 60 * 60_000,
      expected: `Overdue by 1 day`,
    },
    {
      name: `1 year`,
      intervalMs: 365 * 24 * 60 * 60_000,
      expected: `Overdue by 1 year`,
    },
  ])(`formats overdue label for $name`, ({ intervalMs, expected }) => {
    const now = new Date();

    render(
      <QuizFlagText
        flag={{
          kind: QuestionFlagKind.Overdue,
          interval: { start: new Date(now.getTime() - intervalMs), end: now },
        }}
      />,
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
