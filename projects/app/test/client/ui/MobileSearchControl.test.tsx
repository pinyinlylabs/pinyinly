// @vitest-environment happy-dom

import { MobileSearchControl } from "#client/ui/MobileSearchControl.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock(`#client/ui/Icon.tsx`, () => ({
  Icon: () => null,
}));

vi.mock(`#client/ui/QuickSearchResults.tsx`, () => ({
  QuickSearchResults: () => <div>Search results</div>,
}));

describe(`MobileSearchControl`, () => {
  test(`opens directly from the header search input`, () => {
    render(<MobileSearchControl />);

    fireEvent.focus(screen.getByLabelText(`Open search`));

    expect(screen.getByText(`Search results`)).toBeInTheDocument();
    expect(screen.getByLabelText(`Search`)).toHaveFocus();

    fireEvent.click(screen.getByLabelText(`Close search`));

    expect(screen.queryByText(`Search results`)).not.toBeInTheDocument();
  });
});
