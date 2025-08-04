// pyly-not-src-test

import { tv } from "tailwind-variants";
import { expect, test } from "vitest";

test(`regression https://github.com/heroui-inc/tailwind-variants/issues/248`, async () => {
  const notMergedFixtures = [
    // TODO [tailwindcss@>=4] remove this case as `outline` is part of other outline helpers.
    `outline outline-2`,
    `focus:outline focus:outline-2`,
  ];

  for (const fixture of notMergedFixtures) {
    expect(tv({ base: fixture })({})).toEqual(fixture);
  }
});
