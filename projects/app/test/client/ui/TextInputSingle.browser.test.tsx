import { TextInputSingle } from "#client/ui/TextInputSingle.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import { View } from "#client/ui/View.tsx";
import { forcePseudoStateByTestId } from "#test/util/browser.ts";
import "#global.css";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const variants = [`bare`, `flat`] as const;
const themes = [`default`, `dark`] as const;
const focusStates = [`not-focused`, `focused`] as const;
const snapshotCases = themes.flatMap((theme) =>
  variants.flatMap((variant) =>
    focusStates.map((focusState) => ({ theme, variant, focusState })),
  ),
);

test.for(snapshotCases)(
  `$theme $variant TextInputSingle $focusState appearance`,
  async ({ variant, theme, focusState }) => {
    await render(
      <Theme theme={theme}>
        <View
          testID="pyly-snapshot"
          className={[
            `inline-flex w-64 p-8`,
            theme === `dark` ? `bg-bg` : ``,
          ].join(` `)}
        >
          <TextInputSingle
            className="w-full"
            placeholder={undefined}
            testID="text-input"
            variant={variant}
          />
        </View>
      </Theme>,
    );

    const input = page.getByTestId(`text-input`);
    await expect.element(input).toBeInTheDocument();
    input.element().blur();
    if (focusState === `focused`) {
      await forcePseudoStateByTestId(`text-input`, [`focus`]);
    }

    const snapshotName = theme === `default` ? variant : `${theme}-${variant}`;
    await expect(page.getByTestId(`pyly-snapshot`)).toMatchScreenshot(
      focusState === `focused` ? `${snapshotName}-focused` : snapshotName,
    );
  },
);
