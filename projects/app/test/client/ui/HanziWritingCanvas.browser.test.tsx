import { HanziWritingCanvas } from "#client/ui/HanziWritingCanvas.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import { View } from "#client/ui/View.tsx";
import type { WritingStrokePoint } from "#util/shapeContextGrader.ts";
import "#global.css";
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

test.for([346, 500])(
  `accepts strokes at both edges of a 420px-wide, %spx-high canvas without stretching guides`,
  async (height) => {
    await page.viewport(420, 670);
    const onStrokesChange = vi.fn<(strokes: WritingStrokePoint[][]) => void>();
    await render(
      <div
        style={{ width: 420, height, paddingInline: 16, display: `flex` }}
        data-testid="writing-area"
      >
        <View className="-mx-4 min-h-0 w-[calc(100%+2rem)] flex-1 items-center justify-center sm:mx-0 sm:w-full">
          <HanziWritingCanvas
            className="size-full max-h-full sm:aspect-square sm:w-auto sm:max-w-full"
            onStrokesChange={onStrokesChange}
          />
        </View>
      </div>,
    );
    await expect.element(page.getByTestId(`writing-area`)).toBeInTheDocument();
    const svg = page.getByTestId(`writing-area`).element().querySelector(`svg`);
    assert(svg != null);
    vi.spyOn(svg, `setPointerCapture`).mockImplementation(() => {});
    const rect = svg.getBoundingClientRect();
    expect(rect.left).toBe(0);
    expect(rect.right).toBe(420);
    expect(rect.width).toBe(420);
    expect(rect.height).toBe(height);
    const clientY = rect.top + height / 2;
    const startX = rect.left + 1;
    const endX = rect.right - 1;
    for (const clientX of [startX, endX]) {
      const target = document.elementFromPoint(clientX, clientY);
      expect(target === svg || svg.contains(target)).toBe(true);
      assert(target != null);
      dispatchPointer(svg, `pointermove`, { pointerId: 1, clientX, clientY });
      target.dispatchEvent(
        new PointerEvent(clientX === startX ? `pointerdown` : `pointerup`, {
          bubbles: true,
          pointerId: 1,
          clientX,
          clientY,
        }),
      );
    }
    expect(onStrokesChange).toHaveBeenCalledOnce();
    const strokes = onStrokesChange.mock.calls[0]?.[0];
    assert(strokes != null);
    const points = strokes[0];
    assert(points != null);
    const size = Math.min(420, height);
    expect(points).toEqual([
      { x: ((1 - (420 - size) / 2) / size) * 1024, y: 512 },
      { x: ((419 - (420 - size) / 2) / size) * 1024, y: 512 },
    ]);
    const matrix = svg.getScreenCTM();
    assert(matrix != null);
    const start = points[0];
    assert(start != null);
    const renderedStart = new DOMPoint(start.x, start.y).matrixTransform(
      matrix,
    );
    expect(renderedStart.x).toBeCloseTo(startX);
    expect(renderedStart.y).toBeCloseTo(clientY);
  },
);

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

test(`captures the reference-path animation mid-progress`, async () => {
  const guidedPaths = [`M 120 220 H 900`, `M 512 120 V 900`, `M 160 820 H 860`];
  await render(
    <Theme theme="default">
      <View testID="guided-animation-snapshot" className="w-72 bg-bg p-4">
        <HanziWritingCanvas
          className="size-64"
          disabled
          hideGrid
          guidedPaths={guidedPaths}
          animateReferencePaths
          onStrokesChange={vi.fn()}
        />
      </View>
    </Theme>,
  );

  const root = page.getByTestId(`guided-animation-snapshot`);
  await expect.element(root).toBeInTheDocument();
  const svg = root.element().querySelector(`svg`);
  assert(svg != null);
  const animatedPaths = [
    ...svg.querySelectorAll<SVGPathElement>(`.hanzi-animated-reference-stroke`),
  ];
  expect(animatedPaths).toHaveLength(guidedPaths.length);
  expect(
    animatedPaths.map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([`48`, `48`, `48`]);
  const dimGroup = svg.querySelector<SVGGElement>(`g[opacity="0.8"]`);
  assert(dimGroup != null);
  const dimPaths = [
    ...dimGroup.querySelectorAll<SVGPathElement>(`path[stroke-width="48"]`),
  ];
  expect(dimPaths).toHaveLength(guidedPaths.length);
  expect(animatedPaths.map((path) => getComputedStyle(path).stroke)).toEqual(
    dimPaths.map((path) => getComputedStyle(path).stroke),
  );
  expect(animatedPaths.map((path) => getComputedStyle(path).stroke)).toEqual([
    `rgb(226, 226, 226)`,
    `rgb(226, 226, 226)`,
    `rgb(226, 226, 226)`,
  ]);
  expect(getComputedStyle(dimGroup).opacity).toBe(`0.8`);
  expect(dimPaths.map((path) => getComputedStyle(path).opacity)).toEqual([
    `1`,
    `1`,
    `1`,
  ]);
  expect(animatedPaths.map((path) => getComputedStyle(path).opacity)).toEqual([
    `0`,
    `0`,
    `0`,
  ]);

  const animations = svg.getAnimations({ subtree: true });
  for (const animation of animations) {
    animation.pause();
  }
  await Promise.all(animations.map(async (animation) => animation.ready));
  for (const animation of animations) {
    animation.currentTime = 800;
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });

  const progress = animatedPaths.map((path) => {
    const strokeAnimation = path.getAnimations()[0];
    assert(strokeAnimation != null);
    const value = strokeAnimation.effect?.getComputedTiming().progress;
    expect(value).not.toBeNull();
    return Math.round((value ?? 0) * 100);
  });
  expect(progress).toEqual([100, 17, 0]);
  expect(Number(getComputedStyle(animatedPaths[1]!).opacity)).toBeGreaterThan(
    0,
  );
  expect(Number(getComputedStyle(animatedPaths[1]!).opacity)).toBeLessThan(1);
  await expect(root).toMatchScreenshot(`reference-animation-mid-progress`, {
    screenshotOptions: { animations: `allow` },
  });
});
