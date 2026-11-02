import { renderToStaticMarkup } from "react-dom/server.browser";
import { expect, test } from "vitest";
import { StartupLoader } from "#client/ui/StartupLoader.tsx";

test(`renders the startup loader with its logomark and bootstrap script`, () => {
  const html = renderToStaticMarkup(<StartupLoader />);

  expect(html).toContain(`id="pyly-startup"`);
  expect(html).toContain(`id="pyly-startup-logo"`);
  expect(html).toMatch(/<path\b[^>]*data-startup-loader-stroke=""/u);
  expect(html).toContain(`role="progressbar"`);
  expect(html).toContain(`pyly-startup-logo-draw`);
  expect(html).toMatch(/<script\b[^>]*>[\s\S]+<\/script>/u);
  expect(html).toContain(`Enable JavaScript to load Pinyinly.`);
});
