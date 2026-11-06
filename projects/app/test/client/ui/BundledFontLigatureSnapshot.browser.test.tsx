// pyly-not-src-test

import "#global.css";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const text = (
  <>
    <div>office affinity ffi fi fl</div>
    <div>AVATAR To WA</div>
  </>
);

const frameStyle = {
  backgroundColor: `white`,
  boxSizing: `border-box` as const,
  color: `black`,
  fontSize: `24px`,
  height: `120px`,
  lineHeight: 1.3,
  padding: `24px`,
  width: `420px`,
};

test(`bundled font ligature rendering comparison`, async () => {
  for (const [family, url] of [
    [
      `NationalPark`,
      new URL(
        `../../../src/assets/fonts/NationalPark/NationalPark-VariableFont_wght.ttf`,
        import.meta.url,
      ),
    ],
    [
      `MiSans`,
      new URL(
        `../../../src/assets/fonts/MiSansVF/MiSansVF.subset.ttf`,
        import.meta.url,
      ),
    ],
  ] as const) {
    document.fonts.add(await new FontFace(family, `url(${url})`).load());
  }

  await render(
    <div className="space-y-4">
      <div
        className="font-sans antialiased"
        data-testid="ligatures-enabled"
        style={frameStyle}
      >
        {text}
      </div>
      <div
        className="font-sans antialiased"
        data-testid="ligatures-disabled"
        style={{ ...frameStyle, fontFeatureSettings: `"liga" 0` }}
      >
        {text}
      </div>
    </div>,
  );
  await document.fonts.ready;

  const enabled = page.getByTestId(`ligatures-enabled`);
  const disabled = page.getByTestId(`ligatures-disabled`);
  for (const snapshot of [enabled, disabled]) {
    await expect.element(snapshot).toBeInTheDocument();
    expect(snapshot.element().textContent).toBe(
      `office affinity ffi fi flAVATAR To WA`,
    );
  }

  const disabledText = disabled.element().firstElementChild;
  if (disabledText == null) {
    throw new Error(`Expected ligature test text`);
  }
  expect(getComputedStyle(disabledText).fontFeatureSettings).toBe(`"liga" 0`);

  await expect(enabled).toMatchScreenshot(`ligatures-enabled`, {
    comparatorOptions: { allowedMismatchedPixelRatio: 0 },
  });
  await expect(disabled).toMatchScreenshot(`ligatures-disabled`, {
    comparatorOptions: { allowedMismatchedPixelRatio: 0 },
  });
});
