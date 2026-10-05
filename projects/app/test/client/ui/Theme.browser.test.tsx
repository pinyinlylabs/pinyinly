import { View } from "#client/ui/View.tsx";
import "#global.css";
import type { CSSProperties } from "react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

type ThemeStyle = CSSProperties & {
  "--color-fg": string;
  "--color-bg": string;
};

const themes = [
  { name: `light`, fg: `#12191d`, bg: `#f8f9fa` },
  { name: `dark`, fg: `#d7d8d9`, bg: `#1a1d1e` },
  { name: `panel`, fg: `#d8373d`, bg: `#e7e8e8` },
] as const;

const mixedBackgroundClasses = [
  `bg-fg-bg5`,
  `bg-fg-bg10`,
  `bg-fg-bg15`,
  `bg-fg-bg20`,
  `bg-fg-bg25`,
  `bg-fg-bg30`,
  `bg-fg-bg35`,
  `bg-fg-bg40`,
  `bg-fg-bg45`,
  `bg-fg-bg50`,
  `bg-fg-bg55`,
  `bg-fg-bg60`,
  `bg-fg-bg65`,
  `bg-fg-bg70`,
  `bg-fg-bg75`,
  `bg-fg-bg80`,
  `bg-fg-bg85`,
  `bg-fg-bg90`,
  `bg-fg-bg95`,
  `bg-fg-bg100`,
] as const;

test.for(themes)(
  `mixed backgrounds resolve local $name foreground and background`,
  async (theme) => {
    const style: ThemeStyle = {
      "--color-fg": theme.fg,
      "--color-bg": theme.bg,
    };

    await render(
      <div style={style}>
        <View>
          {mixedBackgroundClasses.map((className, index) => (
            <View key={className}>
              <View testID={className} className={className} />
              <div
                data-testid={`${className}-expected`}
                style={{
                  backgroundColor: `color-mix(in oklab, var(--color-fg) ${(index + 1) * 5}%, var(--color-bg))`,
                }}
              />
            </View>
          ))}
          <View
            testID="mixed-border-text"
            className="border-fg-bg10 text-fg-bg50"
          />
          <div
            data-testid="mixed-border-text-expected"
            style={{
              borderColor: `color-mix(in oklab, var(--color-fg) 10%, var(--color-bg))`,
              color: `color-mix(in oklab, var(--color-fg) 50%, var(--color-bg))`,
            }}
          />
        </View>
      </div>,
    );

    await expect.element(page.getByTestId(`bg-fg-bg5`)).toBeInTheDocument();

    for (const className of mixedBackgroundClasses) {
      const actual = getComputedStyle(
        page.getByTestId(className).element(),
      ).backgroundColor;
      const expected = getComputedStyle(
        page.getByTestId(`${className}-expected`).element(),
      ).backgroundColor;

      expect(expected, `${theme.name}: reference color`).not.toBe(
        `rgba(0, 0, 0, 0)`,
      );
      expect(actual, `${theme.name}: ${className}`).toBe(expected);
    }

    const actual = getComputedStyle(
      page.getByTestId(`mixed-border-text`).element(),
    );
    const expected = getComputedStyle(
      page.getByTestId(`mixed-border-text-expected`).element(),
    );
    expect(actual.borderTopColor).toBe(expected.borderTopColor);
    expect(actual.color).toBe(expected.color);
  },
);
