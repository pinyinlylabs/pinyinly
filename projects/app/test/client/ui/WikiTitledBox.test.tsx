// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { use, useState } from "react";
import type { PropsWithChildren } from "react";
import { describe, expect, test, vi } from "vitest";
import { WikiPageEditModeContext } from "#client/ui/WikiPageEditModeContext.ts";
import { WikiTitledBox } from "#client/ui/WikiTitledBox.tsx";

function TestWikiPageEditModeProvider({ children }: PropsWithChildren) {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <WikiPageEditModeContext.Provider
      value={{ isEditPageEnabled: true, isEditMode, setIsEditMode }}
    >
      {children}
    </WikiPageEditModeContext.Provider>
  );
}

function EditModeToggle() {
  const wikiPageEditMode = use(WikiPageEditModeContext);

  if (wikiPageEditMode == null) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        wikiPageEditMode.setIsEditMode(!wikiPageEditMode.isEditMode);
      }}
    >
      Edit page
    </button>
  );
}

describe(`WikiTitledBox`, () => {
  test(`hides its edit button until wiki page edit mode is enabled`, () => {
    const onEditingChange = vi.fn();

    render(
      <TestWikiPageEditModeProvider>
        <EditModeToggle />
        <WikiTitledBox
          title="Remember the meaning"
          onEditingChange={onEditingChange}
        >
          Meaning content
        </WikiTitledBox>
      </TestWikiPageEditModeProvider>,
    );

    const editButton = screen.getByText(`Edit`);
    expect(editButton).not.toBeVisible();

    fireEvent.click(screen.getByText(`Edit page`));
    expect(editButton).toBeVisible();

    fireEvent.click(screen.getByText(`Edit page`));
    expect(editButton).not.toBeVisible();

    fireEvent.click(screen.getByText(`Edit page`));
    fireEvent.click(screen.getByText(`Edit`));
    expect(onEditingChange).toHaveBeenCalledWith(true);
  });

  test(`keeps edit buttons visible outside a wiki page`, () => {
    render(
      <WikiTitledBox title="Model sheet" onEditingChange={() => {}}>
        Model content
      </WikiTitledBox>,
    );

    expect(screen.getByText(`Edit`)).toBeInTheDocument();
  });
});
