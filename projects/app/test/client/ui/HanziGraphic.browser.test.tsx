import { HanziGraphic } from "#client/ui/HanziGraphic.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import { View } from "#client/ui/View.tsx";
import "#global.css";
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";

const strokes = [
  `M 112 100 H 912 V 280 H 112 Z`,
  `M 112 360 H 912 V 540 H 112 Z`,
  `M 112 620 H 912 V 800 H 112 Z`,
];

const medians = [`M 112 190 H 912`, `M 112 450 H 912`, `M 112 710 H 912`];

test.each([
  { name: `early-progress`, currentTime: 400 },
  { name: `later-progress`, currentTime: 1400 },
])(
  `captures normal and bold HanziGraphic rendering at $name`,
  async ({ name, currentTime }) => {
    await render(
      <Theme theme="default">
        <View testID="pyly-snapshot" className="flex-col gap-8 bg-bg p-8">
          <View className="flex-row items-center gap-8">
            {[false, true].map((bold) => (
              <HanziGraphic
                key={`${bold}`}
                className="size-40"
                bgSvgPaths={strokes}
                fgSvgPaths={strokes}
                fgSvgPathsMedians={medians}
                hideFgWhenIdle
                bold={bold}
                accessibilityLabel={`animated outline ${bold ? `bold` : `normal`}`}
              />
            ))}
          </View>
          <View className="flex-row items-center gap-8">
            {[false, true].map((bold) => (
              <HanziGraphic
                key={`${bold}`}
                className="size-40"
                fgSvgPaths={strokes}
                bold={bold}
                accessibilityLabel={`static outline ${bold ? `bold` : `normal`}`}
              />
            ))}
          </View>
          <View className="flex-row items-center gap-8">
            {[false, true].map((bold) => (
              <HanziGraphic
                key={`${bold}`}
                className="size-40"
                bgSvgPaths={strokes}
                fgSvgPaths={strokes.slice(0, 1)}
                bold={bold}
                accessibilityLabel={`foreground over background ${bold ? `bold` : `normal`}`}
              />
            ))}
          </View>
        </View>
      </Theme>,
    );

    const graphics: Element[] = [];
    for (const bold of [false, true]) {
      const graphic = page.getByRole(`img`, {
        name: `animated outline ${bold ? `bold` : `normal`}`,
      });
      await expect.element(graphic).toBeInTheDocument();
      const strokePaths = [
        ...graphic.element().querySelectorAll<SVGPathElement>(`path[mask]`),
      ];
      for (const path of strokePaths) {
        path.style.animationName = `drawHanziStroke, growHanziBrush`;
        path.style.animationDuration = `${path.style.getPropertyValue(`--hanzi-stroke-duration`)}, ${path.style.getPropertyValue(`--hanzi-brush-growth-duration`)}`;
        path.style.animationDelay = `${path.style.getPropertyValue(`--hanzi-stroke-delay`)}, ${path.style.getPropertyValue(`--hanzi-stroke-delay`)}`;
        path.style.animationTimingFunction = `linear, ease-out`;
        path.style.animationFillMode = `both, both`;
      }
      const animations = graphic.element().getAnimations({ subtree: true });
      for (const animation of animations) {
        animation.pause();
      }
      await Promise.all(animations.map(async (animation) => animation.ready));
      for (const animation of animations) {
        animation.currentTime = currentTime;
      }
      expect(animations.map((animation) => animation.currentTime)).toEqual(
        animations.map(() => currentTime),
      );
      graphics.push(graphic.element());

      expect(
        strokePaths.map((path) => path.getAttribute(`stroke-width`)),
      ).toEqual([`180`, `180`, `180`]);
      expect(
        [...graphic.element().querySelectorAll(`mask path`)].map((path) =>
          path.getAttribute(`stroke-width`),
        ),
      ).toEqual(bold ? [`20`, `20`, `20`] : [null, null, null]);
      expect(
        [
          ...graphic
            .element()
            .querySelectorAll<SVGPathElement>(`g > path:not([mask])`),
        ]
          .filter((path) => !path.id.includes(`-outline-`))
          .map((path) => path.getAttribute(`stroke-width`)),
      ).toEqual(bold ? [`20`, `20`, `20`] : [null, null, null]);
      expect(
        [...graphic.element().querySelectorAll(`path[id*="-outline-"]`)].map(
          (path) => path.getAttribute(`stroke-width`),
        ),
      ).toEqual(bold ? [`20`, `20`, `20`] : [null, null, null]);
      expect(
        [...graphic.element().querySelectorAll(`path[id*="-outline-"]`)].map(
          (path) => getComputedStyle(path).opacity,
        ),
      ).toEqual([`1`, `1`, `1`]);
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    for (const graphic of graphics) {
      const progress = [
        ...graphic.querySelectorAll<SVGPathElement>(`path[mask]`),
      ].map((path) => {
        expect(path.getAnimations()).toHaveLength(2);
        const progress = path
          .getAnimations()[0]
          ?.effect?.getComputedTiming().progress;
        expect(progress).not.toBeNull();
        return Math.round((progress ?? 0) * 100);
      });
      expect(progress).toEqual(
        currentTime === 400 ? [50, 0, 0] : [100, 100, 50],
      );
    }
    await expect(page.getByTestId(`pyly-snapshot`)).toMatchScreenshot(name, {
      screenshotOptions: { animations: `allow` },
    });
  },
);

test(`matches background and foreground outline colors`, async () => {
  await render(
    <Theme theme="default">
      <View testID="colored-outlines">
        <HanziGraphic
          bgSvgPaths={strokes}
          fgSvgPaths={strokes.slice(0, 1)}
          fgSvgPathsMedians={medians.slice(0, 1)}
          bold
          accessibilityLabel="animated foreground"
        />
        <HanziGraphic
          fgSvgPaths={strokes.slice(0, 1)}
          bold
          accessibilityLabel="static foreground"
        />
      </View>
    </Theme>,
  );

  const container = page.getByTestId(`colored-outlines`);
  await expect.element(container).toBeInTheDocument();
  const graphic = page
    .getByTestId(`colored-outlines`)
    .element()
    .querySelector(`svg`)!;
  const backgroundPaths = [
    ...graphic.querySelectorAll<SVGPathElement>(
      `g > path:not([mask]):not([id*="-outline-"])`,
    ),
  ];
  const animatedOutlines = [
    ...graphic.querySelectorAll<SVGPathElement>(`path[id*="-outline-"]`),
  ];
  const animatedBrush = graphic.querySelector<SVGPathElement>(`path[mask]`);
  const staticForeground = page
    .getByRole(`img`, { name: `static foreground` })
    .element()
    .querySelector<SVGPathElement>(`g > path`)!;

  expect(backgroundPaths).toHaveLength(3);
  expect(animatedOutlines).toHaveLength(1);
  expect(animatedBrush).not.toBeNull();
  expect(getComputedStyle(backgroundPaths[0]!).stroke).toBe(
    getComputedStyle(animatedOutlines[0]!).stroke,
  );
  expect(getComputedStyle(staticForeground).stroke).toBe(
    getComputedStyle(animatedBrush!).stroke,
  );
  expect(
    backgroundPaths.map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([`20`, `20`, `20`]);
  expect(
    animatedOutlines.map((path) => path.getAttribute(`stroke-width`)),
  ).toEqual([`20`]);
  expect(staticForeground.getAttribute(`stroke-width`)).toBe(`20`);
});
