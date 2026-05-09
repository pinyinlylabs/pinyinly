// @vitest-environment happy-dom

import { render, screen, fireEvent } from "@testing-library/react";
import type { HanziText } from "#data/model.ts";
import { describe, expect, test, vi } from "vitest";
import { WikiAiExplanation } from "#client/ui/WikiAiExplanation.tsx";

const collapsedMaxHeight = 320;

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock(`@tanstack/react-query`, async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    useQuery: useQueryMock,
  };
});

describe(`WikiAiExplanation`, () => {
  test(`renders nothing when no wiki MDX exists`, () => {
    useQueryMock.mockReturnValue({ data: null });
    const hanzi = `你` as HanziText;

    const { container } = render(<WikiAiExplanation hanzi={hanzi} />);

    expect(container).toBeEmptyDOMElement();
  });

  test(`starts collapsed and toggles to full content`, () => {
    useQueryMock.mockReturnValue({
      data: {
        type: `root`,
        children: [
          {
            type: `paragraph`,
            children: [{ type: `text`, value: `Generated explanation` }],
          },
        ],
      },
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
