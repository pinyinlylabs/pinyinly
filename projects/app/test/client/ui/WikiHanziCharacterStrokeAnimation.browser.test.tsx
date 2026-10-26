import { WikiHanziCharacterStrokeAnimation } from "#client/ui/WikiHanziCharacterStrokeAnimation.tsx";
import { hanziCharacterSchema } from "#data/model.ts";
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

test(`shows the stroke animation and accessible replay control`, async () => {
  useQueryMock.mockReturnValue({ data: { strokes, medians } });
  await render(<WikiHanziCharacterStrokeAnimation hanzi={hanzi} />);

  const graphic = page.getByRole(`img`, { name: `${hanzi} stroke order` });
  await expect.element(graphic).toBeInTheDocument();

  const svg = graphic.element();
  expect(svg).not.toHaveAttribute(`accessible`);
  expect(
    [...svg.querySelectorAll(`g > path:not([clip-path])`)].map((path) =>
      path.getAttribute(`stroke`),
    ),
  ).toEqual([null, null]);
  expect(
    [...svg.querySelectorAll(`clipPath path`)].map((path) =>
      path.getAttribute(`d`),
    ),
  ).toEqual(strokes);
  expect(
    [...svg.querySelectorAll(`path[clip-path]`)].map((path) =>
      path.getAttribute(`d`),
    ),
  ).toEqual(medians);

  const getAnimatedPaths = () => {
    const currentSvg = page
      .getByRole(`img`, { name: `${hanzi} stroke order` })
      .element();
    return [...currentSvg.querySelectorAll<SVGPathElement>(`path[clip-path]`)];
  };

  const animatedPaths = getAnimatedPaths();
  expect(animatedPaths.map((path) => path.getAttribute(`pathLength`))).toEqual([
    `1`,
    `1`,
  ]);
  expect(animatedPaths.map((path) => path.getAttribute(`class`))).toEqual([
    `hanzi-animated-stroke`,
    `hanzi-animated-stroke`,
  ]);
  expect(animatedPaths.map((path) => path.style.animationDelay)).toEqual([
    `250ms`,
    `750ms`,
  ]);
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
    animatedPaths.map((path) => getComputedStyle(path).animationName),
  ).toEqual([
    `drawHanziStroke, growHanziBrush`,
    `drawHanziStroke, growHanziBrush`,
  ]);

  const animations = animatedPaths.flatMap((path) => path.getAnimations());
  expect(animations).toHaveLength(4);
  const keyframeEffects = animations
    .map((animation) => animation.effect)
    .filter(
      (effect): effect is KeyframeEffect => effect instanceof KeyframeEffect,
    );
  expect(
    animatedPaths.map((path) => getComputedStyle(path).animationTimingFunction),
  ).toEqual([`linear, ease-out`, `linear, ease-out`]);
  expect(
    animatedPaths.map((path) => getComputedStyle(path).animationDuration),
  ).toEqual([`0.3s, 0.1s`, `0.3s, 0.1s`]);
  expect(
    keyframeEffects
      .filter((_, index) => index % 2 === 0)
      .map((effect) => effect.getKeyframes().map((frame) => frame[`opacity`])),
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
    [`0px`, `140px`],
    [`0px`, `140px`],
  ]);
  expect(
    animatedPaths.map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([`140`, `140`]);
  await Promise.all(animations.map(async (animation) => animation.finished));
  expect(
    animatedPaths.map((path) => getComputedStyle(path).strokeDashoffset),
  ).toEqual([`0px`, `0px`]);

  await page
    .getByRole(`button`, { name: `Replay stroke order for ${hanzi}` })
    .click();
  await expect
    .poll(() => getAnimatedPaths().map((path) => path.getAnimations().length))
    .toEqual([2, 2]);
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
        <WikiHanziCharacterStrokeAnimation hanzi={hanzi} />
      </div>,
    );

    await expect
      .element(page.getByRole(`img`, { name: `${hanzi} stroke order` }))
      .not.toBeInTheDocument();
  },
);
