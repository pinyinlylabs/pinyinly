import { RectButton } from "#client/ui/RectButton.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import { View } from "#client/ui/View.tsx";
import type { IconRegistry } from "#client/ui/iconRegistry.ts";
import { forcePseudoStateByTestId } from "#test/util/browser.ts";
import "#global.css";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

vi.mock(import(`#client/ui/iconRegistry.ts`), () => ({
  iconRegistry: {} as IconRegistry,
  iconNames: [],
}));

test(`filled RectButton focus-visible with default foreground`, async () => {
  await render(
    <Theme theme="default">
      <View testID="pyly-snapshot" className="inline-flex p-8">
        <RectButton variant="filled" testID="rect-button" />
      </View>
    </Theme>,
  );

  const button = page.getByTestId(`rect-button`);
  await expect.element(button).toBeInTheDocument();

  await forcePseudoStateByTestId(`rect-button`, [`focus-visible`]);
  await expect(page.getByTestId(`pyly-snapshot`)).toMatchScreenshot(`default`);
});

test(`filled RectButton focus-visible with custom foreground`, async () => {
  await render(
    <Theme theme="default">
      <View testID="pyly-snapshot" className="inline-flex p-8">
        <RectButton color="danger" variant="filled" testID="rect-button" />
      </View>
    </Theme>,
  );

  const button = page.getByTestId(`rect-button`);
  await expect.element(button).toBeInTheDocument();

  await forcePseudoStateByTestId(`rect-button`, [`focus-visible`]);
  await expect(page.getByTestId(`pyly-snapshot`)).toMatchScreenshot(
    `custom-foreground`,
  );
});

test.for([`filled`, `outline`, `option`] as const)(
  `%s RectButton animates when pressed without reflow`,
  async (variant) => {
    const pressDepth = variant === `filled` ? 3 : 2;

    await render(
      <Theme theme="default">
        <RectButtonPressHarness variant={variant} />
      </Theme>,
    );

    await expect
      .element(page.getByTestId(`pressed-state-toggle`))
      .toBeInTheDocument();
    await expect.element(page.getByTestId(`rect-button`)).toBeInTheDocument();
    await expect
      .element(page.getByTestId(`following-content`))
      .toBeInTheDocument();
    const buttonLocator = page.getByTestId(`rect-button`);
    const button = buttonLocator.element();
    const followingContent = page.getByTestId(`following-content`).element();
    const face = button.firstElementChild;
    if (face == null) {
      throw new Error(`Expected RectButton to render its face`);
    }

    const initialUnhoveredShadow = getComputedStyle(face).boxShadow;
    await buttonLocator.hover();
    if (variant !== `filled`) {
      await expect
        .poll(() => getComputedStyle(face).boxShadow)
        .not.toBe(initialUnhoveredShadow);
    }
    for (let frame = 0; frame < 18; frame++) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    }

    const initialButtonRect = button.getBoundingClientRect();
    const initialFollowingTop = followingContent.getBoundingClientRect().top;
    const initialFaceTop = face.getBoundingClientRect().top;
    const initialStyle = getComputedStyle(face);
    const initialTranslate = initialStyle.translate;
    const initialShadow = initialStyle.boxShadow;
    expect(initialStyle.transitionProperty).toContain(`translate`);
    expect(initialStyle.transitionProperty).toContain(`box-shadow`);
    expect(initialStyle.transitionDuration).toBe(`0.1s`);
    expect(initialStyle.transitionTimingFunction).toBe(
      `cubic-bezier(0.4, 0, 0.2, 1)`,
    );
    expect(initialShadow).toContain(`${pressDepth}px`);
    const togglePressed = () => {
      page
        .getByTestId(`pressed-state-toggle`)
        .element()
        .dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
    };
    const getTranslateY = (value: string) => {
      const y = value.split(/\s+/u)[1];
      return y == null ? 0 : Number(y.replace(`px`, ``));
    };
    const getShadowY = (value: string) => {
      const matches = [
        ...value.matchAll(/(-?\d+(?:\.\d+)?)px (-?\d+(?:\.\d+)?)px 0px 0px/gu),
      ];
      const match = matches.at(-1);
      if (match == null) {
        throw new Error(`Expected a box-shadow offset`);
      }

      return Number(match[2]);
    };

    const expectAnimatedTransitionWithoutReflow = async (
      startTranslate: string,
      startShadow: string,
    ) => {
      const observedTranslations = new Set([startTranslate]);
      const observedShadows = new Set([startShadow]);

      for (let frame = 0; frame < 18; frame++) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            resolve();
          });
        });

        const faceStyle = getComputedStyle(face);
        observedTranslations.add(faceStyle.translate);
        observedShadows.add(faceStyle.boxShadow);
        expect(
          getTranslateY(faceStyle.translate) + getShadowY(faceStyle.boxShadow),
          `${faceStyle.translate}; ${faceStyle.boxShadow}`,
        ).toBeCloseTo(pressDepth, 0);
        const currentButtonRect = button.getBoundingClientRect();
        expect(currentButtonRect.width).toBe(initialButtonRect.width);
        expect(currentButtonRect.height).toBe(initialButtonRect.height);
        expect(followingContent.getBoundingClientRect().top).toBe(
          initialFollowingTop,
        );
      }

      expect(observedTranslations.size).toBeGreaterThan(2);
      expect(observedShadows.size).toBeGreaterThan(2);
    };

    togglePressed();
    await expect
      .poll(() => getComputedStyle(face).translate)
      .not.toBe(initialTranslate);
    await expectAnimatedTransitionWithoutReflow(
      initialTranslate,
      initialShadow,
    );

    const pressedTranslate = getComputedStyle(face).translate;
    const pressedShadow = getComputedStyle(face).boxShadow;
    expect(face.getBoundingClientRect().top - initialFaceTop).toBe(pressDepth);
    expect(getComputedStyle(button).paddingBottom).toBe(`${pressDepth}px`);
    expect(pressedShadow).not.toContain(`${pressDepth}px`);
    const pressedStyle = getComputedStyle(face);
    expect(pressedStyle.borderBottomWidth).toBe(
      variant === `filled` ? `0px` : variant === `outline` ? `2px` : `1px`,
    );
    if (variant !== `filled`) {
      expect(pressedStyle.borderBottomColor).toBe(
        pressedStyle.borderRightColor,
      );
    }
    await expect(page.getByTestId(`rect-button`)).toMatchScreenshot(
      `${variant}-pressed`,
    );

    togglePressed();
    await expect
      .poll(() => getComputedStyle(face).translate)
      .not.toBe(pressedTranslate);
    await expectAnimatedTransitionWithoutReflow(
      pressedTranslate,
      pressedShadow,
    );
    await expect
      .poll(() => getComputedStyle(face).translate)
      .toBe(initialTranslate);
    await expect
      .poll(() => getComputedStyle(face).boxShadow)
      .toBe(initialShadow);
  },
);

function RectButtonPressHarness({
  variant,
}: {
  variant: `filled` | `outline` | `option`;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <View className="flex flex-col gap-4">
      <button
        type="button"
        data-testid="pressed-state-toggle"
        onClick={() => {
          setPressed((value) => !value);
        }}
      >
        Toggle pressed state
      </button>
      <View className="inline-flex flex-col gap-4">
        <RectButton
          variant={variant}
          pressed={pressed}
          testID="rect-button"
        ></RectButton>
        <View testID="following-content" className="h-4" />
      </View>
    </View>
  );
}
