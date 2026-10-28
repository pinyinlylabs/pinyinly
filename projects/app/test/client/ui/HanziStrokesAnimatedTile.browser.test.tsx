import { HanziStrokesAnimatedTile } from "#client/ui/HanziStrokesAnimatedTile.tsx";
import { hanziCharacterSchema, strokeSpecStringSchema } from "#data/model.ts";
import "#global.css";
import { render } from "vitest-browser-react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock(import(`@tanstack/react-query`), async (importOriginal) => ({
  ...(await importOriginal()),
  useQuery: useQueryMock,
}));

vi.mock(import(`#client/ui/Icon.tsx`), () => ({
  Icon: () => <span />,
}));

const hanzi = hanziCharacterSchema.parse(`木`);
const strokes = [
  `M 100 100 L 900 100 L 900 300 L 100 300 Z`,
  `M 400 100 L 600 100 L 600 900 L 400 900 Z`,
];
const medians = [`M 150 200 L 850 200`, `M 500 150 L 500 850`];
const subsetStrokes = [...strokes, `M 100 700 L 900 700 L 900 900 L 100 900 Z`];
const subsetMedians = [...medians, `M 150 800 L 850 800`];

test(`shows the stroke animation and accessible replay control`, async () => {
  useQueryMock.mockReturnValue({ data: { strokes, medians } });
  await render(
    <HanziStrokesAnimatedTile hanzi={hanzi} autoPlay hideFgWhenIdle />,
  );

  const graphic = page.getByRole(`img`, { name: `${hanzi} stroke order` });
  await expect.element(graphic).toBeInTheDocument();

  const svg = graphic.element();
  expect(svg).not.toHaveAttribute(`accessible`);
  expect(
    [
      ...svg.querySelectorAll(`g > path:not([mask]):not([id*="-outline-"])`),
    ].map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([`20`, `20`]);
  expect(
    [...svg.querySelectorAll(`mask path`)].map((path) =>
      path.getAttribute(`d`),
    ),
  ).toEqual(strokes);
  expect(
    [...svg.querySelectorAll(`mask path`)].map((path) =>
      path.getAttribute(`stroke-width`),
    ),
  ).toEqual([`20`, `20`]);
  expect(
    [...svg.querySelectorAll(`path[mask]`)].map((path) =>
      path.getAttribute(`d`),
    ),
  ).toEqual(medians);

  const getAnimatedPaths = () => {
    const currentSvg = page
      .getByRole(`img`, { name: `${hanzi} stroke order` })
      .element();
    return [...currentSvg.querySelectorAll<SVGPathElement>(`path[mask]`)];
  };

  const animatedPaths = getAnimatedPaths();
  const animatedForeground = svg.querySelector(`g.hanzi-animated-foreground`)!;
  const prefersReducedMotion = window.matchMedia(
    `(prefers-reduced-motion: reduce)`,
  ).matches;
  expect(animatedPaths.map((path) => path.getAttribute(`pathLength`))).toEqual([
    `1`,
    `1`,
  ]);
  expect(animatedPaths.map((path) => path.getAttribute(`class`))).toEqual([
    `hanzi-animated-stroke`,
    `hanzi-animated-stroke`,
  ]);
  expect(
    animatedPaths.map((path) =>
      path.style.getPropertyValue(`--hanzi-stroke-delay`),
    ),
  ).toEqual([`250ms`, `750ms`]);
  expect(
    animatedPaths.map((path) =>
      path.style.getPropertyValue(`--hanzi-stroke-duration`),
    ),
  ).toEqual([`300ms`, `300ms`]);
  expect(
    animatedPaths.map((path) =>
      path.style.getPropertyValue(`--hanzi-brush-growth-duration`),
    ),
  ).toEqual([`100ms`, `100ms`]);
  expect(
    animatedPaths.map((path) =>
      path.style.getPropertyValue(`--hanzi-brush-growth-width`),
    ),
  ).toEqual([`180px`, `180px`]);
  expect(
    [...graphic.element().querySelectorAll(`mask path`)].map((path) =>
      path.getAttribute(`stroke-width`),
    ),
  ).toEqual([`20`, `20`]);
  expect(
    animatedPaths.map((path) => getComputedStyle(path).animationName),
  ).toEqual(
    prefersReducedMotion
      ? [`none`, `none`]
      : [`drawHanziStroke, growHanziBrush`, `drawHanziStroke, growHanziBrush`],
  );

  const animations = svg.getAnimations({ subtree: true });
  expect(animations).toHaveLength(prefersReducedMotion ? 0 : 5);
  const pathAnimations = animatedPaths.flatMap((path) => path.getAnimations());
  const keyframeEffects = pathAnimations
    .map((animation) => animation.effect)
    .filter(
      (effect): effect is KeyframeEffect => effect instanceof KeyframeEffect,
    );
  if (!prefersReducedMotion) {
    expect(
      animatedPaths.map(
        (path) => getComputedStyle(path).animationTimingFunction,
      ),
    ).toEqual([`linear, ease-out`, `linear, ease-out`]);
    expect(
      animatedPaths.map((path) => getComputedStyle(path).animationDuration),
    ).toEqual([`0.3s, 0.1s`, `0.3s, 0.1s`]);
    expect(
      keyframeEffects
        .filter((_, index) => index % 2 === 0)
        .map((effect) =>
          effect.getKeyframes().map((frame) => frame[`opacity`]),
        ),
    ).toEqual([
      [undefined, undefined],
      [undefined, undefined],
    ]);
    expect(
      keyframeEffects
        .filter((_, index) => index % 2 === 0)
        .map((effect) =>
          effect.getKeyframes().map((frame) => frame[`visibility`]),
        ),
    ).toEqual([
      [`visible`, `visible`],
      [`visible`, `visible`],
    ]);
    expect(
      keyframeEffects
        .filter((_, index) => index % 2 === 1)
        .map((effect) =>
          effect.getKeyframes().map((frame) => frame[`strokeWidth`]),
        ),
    ).toEqual([
      [`0px`, `180px`],
      [`0px`, `180px`],
    ]);
    const foregroundAnimation = animatedForeground.getAnimations()[0]!;
    expect(getComputedStyle(animatedForeground).animationName).toBe(
      `dimHanziForeground`,
    );
    expect(getComputedStyle(animatedForeground).animationDuration).toBe(`2.4s`);
    const foregroundEffect = foregroundAnimation.effect;
    expect(foregroundEffect).toBeInstanceOf(KeyframeEffect);
    if (foregroundEffect instanceof KeyframeEffect) {
      expect(
        foregroundEffect.getKeyframes().map((frame) => frame[`opacity`]),
      ).toEqual([`1`, `0`]);
    }
    expect(getComputedStyle(animatedForeground).animationTimingFunction).toBe(
      `ease-out`,
    );
  }
  expect(
    animatedPaths.map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([`180`, `180`]);
  expect(
    (animatedForeground as SVGElement).style.getPropertyValue(
      `--hanzi-graphic-dim-delay`,
    ),
  ).toBe(`1050ms`);
  await Promise.all(animations.map(async (animation) => animation.finished));
  expect(
    animatedPaths.map((path) => getComputedStyle(path).strokeDashoffset),
  ).toEqual([`0px`, `0px`]);
  expect(getComputedStyle(animatedForeground).opacity).toBe(`0`);
  expect(getComputedStyle(svg).opacity).toBe(`1`);

  await page
    .getByRole(`button`, { name: `Replay stroke order for ${hanzi}` })
    .click();
  await expect
    .poll(() => getAnimatedPaths().map((path) => path.getAnimations().length))
    .toEqual(prefersReducedMotion ? [0, 0] : [2, 2]);
});

test(`disables bold character outlines independently of brush width`, async () => {
  useQueryMock.mockReturnValue({ data: { strokes, medians } });
  await render(
    <div>
      <HanziStrokesAnimatedTile
        hanzi={hanzi}
        bold={false}
        autoPlay
        hideFgWhenIdle
      />
    </div>,
  );

  const graphic = page.getByRole(`img`, { name: `${hanzi} stroke order` });
  await expect.element(graphic).toBeInTheDocument();
  const animatedPaths = [
    ...graphic.element().querySelectorAll<SVGPathElement>(`path[mask]`),
  ];
  expect(
    animatedPaths.map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([`180`, `180`]);
  expect(
    animatedPaths.map((path) =>
      path.style.getPropertyValue(`--hanzi-brush-growth-width`),
    ),
  ).toEqual([`180px`, `180px`]);
  expect(
    [...graphic.element().querySelectorAll(`mask path`)].map((path) =>
      path.getAttribute(`stroke-width`),
    ),
  ).toEqual([null, null]);
  expect(
    [...graphic.element().querySelectorAll(`path[id*="-outline-"]`)].map(
      (path) => path.getAttribute(`stroke-width`),
    ),
  ).toEqual([null, null]);
  expect(
    [...graphic.element().querySelectorAll(`path[id*="-outline-"]`)].map(
      (path) => getComputedStyle(path).animationName,
    ),
  ).toEqual([`none`, `none`]);
  expect(
    [...graphic.element().querySelectorAll(`path[id*="-outline-"]`)].map(
      (path) => getComputedStyle(path).opacity,
    ),
  ).toEqual([`1`, `1`]);
  expect(
    [
      ...graphic
        .element()
        .querySelectorAll<SVGPathElement>(
          `g > path:not([mask]):not([id*="-outline-"])`,
        ),
    ].map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([null, null]);
});

test(`animates only selected strokes on tap and keeps the foreground visible`, async () => {
  useQueryMock.mockReturnValue({
    data: { strokes: subsetStrokes, medians: subsetMedians },
  });
  const componentStrokeSpec = strokeSpecStringSchema.parse(`0,2`);
  await render(
    <div>
      <HanziStrokesAnimatedTile
        hanzi={hanzi}
        componentHanzi={hanzi}
        componentStrokeSpec={componentStrokeSpec}
        componentColor="blue"
        label="Wood"
      />
    </div>,
  );

  const graphic = page.getByRole(`img`, { name: `${hanzi} stroke order` });
  await expect.element(graphic).toBeInTheDocument();

  const idleSvg = graphic.element();
  const idlePaths = [...idleSvg.querySelectorAll(`g > path`)];
  expect(idlePaths.slice(-2).map((path) => path.getAttribute(`d`))).toEqual([
    subsetStrokes[0],
    subsetStrokes[2],
  ]);
  expect(idleSvg.getAnimations({ subtree: true })).toHaveLength(0);

  await page
    .getByRole(`button`, { name: `Animate stroke order for ${hanzi}` })
    .click();

  const animatedSvg = page
    .getByRole(`img`, { name: `${hanzi} stroke order` })
    .element();
  expect(
    [...animatedSvg.querySelectorAll(`mask path`)].map((path) =>
      path.getAttribute(`d`),
    ),
  ).toEqual([subsetStrokes[0], subsetStrokes[2]]);
  const animatedPaths = [
    ...animatedSvg.querySelectorAll<SVGPathElement>(`path[mask]`),
  ];
  expect(animatedPaths.map((path) => path.getAttribute(`d`))).toEqual([
    subsetMedians[0],
    subsetMedians[2],
  ]);
  expect(animatedPaths.map((path) => path.getAttribute(`stroke`))).toEqual([
    `var(--color-fg-loud)`,
    `var(--color-fg-loud)`,
  ]);
  expect(
    animatedPaths.map((path) =>
      path.style.getPropertyValue(`--hanzi-stroke-delay`),
    ),
  ).toEqual([`250ms`, `750ms`]);
  expect(animatedSvg.querySelector(`g.hanzi-animated-foreground`)).toBeNull();

  const prefersReducedMotion = window.matchMedia(
    `(prefers-reduced-motion: reduce)`,
  ).matches;
  const animations = animatedSvg.getAnimations({ subtree: true });
  expect(animations).toHaveLength(prefersReducedMotion ? 0 : 4);
  await Promise.all(animations.map(async (animation) => animation.finished));
  expect(
    animatedPaths.map((path) => getComputedStyle(path).strokeDashoffset),
  ).toEqual([`0px`, `0px`]);
});

test.each([
  { strokes, medians: medians.slice(0, 1) },
  { strokes, medians: [``, medians[1] ?? ``] },
])(
  `does not render an animation with invalid median paths %j`,
  async (data) => {
    useQueryMock.mockReturnValue({ data });
    await render(
      <div>
        <HanziStrokesAnimatedTile hanzi={hanzi} />
      </div>,
    );

    await expect
      .element(page.getByRole(`img`, { name: `${hanzi} stroke order` }))
      .not.toBeInTheDocument();
  },
);
