import { HanziWritingCanvas } from "#client/ui/HanziWritingCanvas.tsx";
import { assert, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

// The Metro icon registry uses require(), which is unavailable in browser tests.
vi.mock(`#client/ui/iconRegistry.ts`, () => ({
  iconRegistry: {},
  iconNames: [],
}));

function dispatchPointer(
  svg: SVGSVGElement,
  kind: string,
  init: PointerEventInit,
) {
  svg.dispatchEvent(new PointerEvent(kind, { bubbles: true, ...init }));
}

test(`prevents selection only on the writing surface`, async () => {
  await render(
    <div>
      <p data-testid="prompt">Write the character for commerce</p>
      <div data-testid="writing-area">
        <HanziWritingCanvas onStrokesChange={vi.fn()} />
      </div>
    </div>,
  );

  await expect.element(page.getByTestId(`writing-area`)).toBeInTheDocument();
  const svg = page.getByTestId(`writing-area`).element().querySelector(`svg`);
  assert(svg != null);
  const style = getComputedStyle(svg);
  expect(style.userSelect).toBe(`none`);
  expect(style.getPropertyValue(`-webkit-user-select`)).toBe(`none`);
  expect(style.touchAction).toBe(`none`);
  if (CSS.supports(`-webkit-touch-callout`, `none`)) {
    expect(style.getPropertyValue(`-webkit-touch-callout`)).toBe(`none`);
  }
  expect(
    getComputedStyle(page.getByTestId(`prompt`).element()).userSelect,
  ).not.toBe(`none`);
});

test(`a held pointer can finish a stroke and CHECK remains clickable`, async () => {
  const onStrokesChange = vi.fn();
  const onCheck = vi.fn();
  await render(
    <div>
      <div data-testid="writing-area">
        <HanziWritingCanvas
          className="size-64"
          onStrokesChange={onStrokesChange}
        />
      </div>
      <button type="button" onClick={onCheck}>
        CHECK
      </button>
    </div>,
  );

  await expect.element(page.getByTestId(`writing-area`)).toBeInTheDocument();
  const svg = page.getByTestId(`writing-area`).element().querySelector(`svg`);
  assert(svg != null);
  const capture = vi
    .spyOn(svg, `setPointerCapture`)
    .mockImplementation(() => {});
  const { left, top } = svg.getBoundingClientRect();
  dispatchPointer(svg, `pointerdown`, {
    pointerId: 1,
    pointerType: `touch`,
    clientX: left + 32,
    clientY: top + 32,
  });
  const undoButtonContainer = page.getByTestId(`undo-button-container`);
  await expect.element(undoButtonContainer).toBeInTheDocument();
  expect(getComputedStyle(undoButtonContainer.element()).opacity).toBe(`0`);
  // Synthetic pointers exercise drawing, not iOS's native long-press menu.
  await new Promise((resolve) => {
    setTimeout(resolve, 600);
  });
  expect(getComputedStyle(undoButtonContainer.element()).opacity).toBe(`1`);
  await expect
    .element(page.getByRole(`button`, { name: `Undo` }))
    .toBeVisible();
  dispatchPointer(svg, `pointermove`, {
    pointerId: 1,
    pointerType: `touch`,
    clientX: left + 64,
    clientY: top + 64,
  });
  dispatchPointer(svg, `pointerup`, { pointerId: 1, pointerType: `touch` });

  expect(capture).toHaveBeenCalledWith(1);
  expect(onStrokesChange).toHaveBeenCalledExactlyOnceWith([
    [
      { x: 128, y: 128 },
      { x: 256, y: 256 },
    ],
  ]);
  await page.getByRole(`button`, { name: `CHECK` }).click();
  expect(onCheck).toHaveBeenCalledOnce();
});

test(`Undo removes the latest stroke through onStrokesChange`, async () => {
  const onStrokesChange = vi.fn();
  await render(
    <HanziWritingCanvas
      drawnStrokes={[[{ x: 1, y: 2 }], [{ x: 3, y: 4 }]]}
      onStrokesChange={onStrokesChange}
    />,
  );

  await page.getByRole(`button`, { name: `Undo` }).click();
  expect(onStrokesChange).toHaveBeenCalledExactlyOnceWith([[{ x: 1, y: 2 }]]);
});

test.for([false, true])(
  `does not submit cancelled strokes (disabled: %s)`,
  async (disabled) => {
    const onStrokesChange = vi.fn();
    await render(
      <div data-testid="writing-area">
        <HanziWritingCanvas
          disabled={disabled}
          onStrokesChange={onStrokesChange}
        />
      </div>,
    );

    await expect.element(page.getByTestId(`writing-area`)).toBeInTheDocument();
    const svg = page.getByTestId(`writing-area`).element().querySelector(`svg`);
    assert(svg != null);
    vi.spyOn(svg, `setPointerCapture`).mockImplementation(() => {});
    dispatchPointer(svg, `pointerdown`, {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    dispatchPointer(svg, `pointermove`, {
      pointerId: 1,
      clientX: 20,
      clientY: 20,
    });
    dispatchPointer(svg, `pointercancel`, { pointerId: 1 });
    dispatchPointer(svg, `pointerup`, { pointerId: 1 });
    expect(onStrokesChange).not.toHaveBeenCalled();

    dispatchPointer(svg, `pointerdown`, {
      pointerId: 2,
      clientX: 10,
      clientY: 10,
    });
    dispatchPointer(svg, `pointermove`, {
      pointerId: 2,
      clientX: 20,
      clientY: 20,
    });
    dispatchPointer(svg, `pointerup`, { pointerId: 2 });
    expect(onStrokesChange).toHaveBeenCalledTimes(disabled ? 0 : 1);
  },
);
