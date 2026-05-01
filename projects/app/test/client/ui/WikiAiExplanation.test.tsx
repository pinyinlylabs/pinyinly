// @vitest-environment happy-dom

import { render, screen, fireEvent } from "@testing-library/react";
import { Text } from "react-native";
import type { HanziText } from "#data/model.ts";
import { describe, expect, test, vi } from "vitest";
import { WikiAiExplanation } from "#client/ui/WikiAiExplanation.tsx";

const collapsedMaxHeight = 320;

const { getWikiMdxHanziMeaningMock } = vi.hoisted(() => ({
  getWikiMdxHanziMeaningMock: vi.fn(),
}));

vi.mock(`#client/wiki.ts`, () => ({
  getWikiMdxHanziMeaning: getWikiMdxHanziMeaningMock,
}));

describe(`WikiAiExplanation`, () => {
  test(`renders nothing when no wiki MDX exists`, () => {
    getWikiMdxHanziMeaningMock.mockReturnValue(undefined);
    const hanzi = `你` as HanziText;

    const { container } = render(<WikiAiExplanation hanzi={hanzi} />);

    expect(container).toBeEmptyDOMElement();
  });

  test(`starts collapsed and toggles to full content`, () => {
    getWikiMdxHanziMeaningMock.mockReturnValue(function MeaningMdx() {
      return <Text>Generated explanation</Text>;
    });
    const hanzi = `你` as HanziText;

    render(<WikiAiExplanation hanzi={hanzi} />);

    expect(screen.getByText(`AI explanation`)).toBeInTheDocument();
    expect(screen.getByText(`Generated explanation`)).toBeInTheDocument();
    expect(screen.getByText(`Expand`)).toBeInTheDocument();

    const content = screen.getByTestId(`wiki-ai-explanation-content`);

    expect(content.style.maxHeight).toBe(`${collapsedMaxHeight}px`);

    fireEvent.click(screen.getByText(`Expand`));

    expect(screen.getByText(`Collapse`)).toBeInTheDocument();
    expect(content.style.maxHeight).toBe(``);

    fireEvent.click(screen.getByText(`Collapse`));

    expect(screen.getByText(`Expand`)).toBeInTheDocument();
    expect(content.style.maxHeight).toBe(`${collapsedMaxHeight}px`);
  });
});
