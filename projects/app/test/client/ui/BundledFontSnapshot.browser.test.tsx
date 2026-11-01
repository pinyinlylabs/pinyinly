// pyly-not-src-test

import "#global.css";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

test(`bundled fonts render text in Chromium`, async () => {
  const fontFaces = [
    new FontFace(
      `NationalPark`,
      `url(${new URL(
        `../../../src/assets/fonts/NationalPark/NationalPark-VariableFont_wght.ttf`,
        import.meta.url,
      )})`,
    ),
    new FontFace(
      `MiSans`,
      `url(${new URL(
        `../../../src/assets/fonts/MiSansVF/MiSansVF.subset.ttf`,
        import.meta.url,
      )})`,
    ),
  ];

  for (const fontFace of fontFaces) {
    document.fonts.add(await fontFace.load());
  }

  await render(
    <div
      className="font-sans"
      data-testid="font-snapshot"
      style={{
        backgroundColor: `white`,
        color: `black`,
        fontSize: `24px`,
        lineHeight: 1.3,
        padding: `24px`,
        width: `fit-content`,
      }}
    >
      <div>Pinyinly — nǐ hǎo</div>
      <div>你好</div>
    </div>,
  );
  await document.fonts.ready;

  await expect(page.getByTestId(`font-snapshot`)).toMatchScreenshot(
    `bundled-fonts`,
  );
});
