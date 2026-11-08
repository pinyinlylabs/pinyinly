import { renderToStaticMarkup } from "react-dom/server.browser";
import { expect, test } from "vitest";
import { StartupLoader } from "#client/ui/StartupLoader.tsx";

test(`renders the startup loader with its logomark and bootstrap script`, () => {
  const html = renderToStaticMarkup(<StartupLoader />);

  expect(html).toContain(`id="pyly-startup"`);
  expect(html).toContain(`id="pyly-startup-logo"`);
  expect(html).toMatch(/<path\b[^>]*data-startup-loader-stroke=""/u);
  expect(html).toContain(`role="progressbar"`);
  expect(html).toContain(
    `id="pyly-startup-recovery" style="visibility:hidden"`,
  );
  expect(html).toContain(`#pyly-startup-recovery p { margin: 12px 0 0; }`);
  expect(html).toContain(`Pinyinly couldn&#x27;t load`);
  expect(html).toContain(
    `[data-startup-loader-error] [data-startup-loader-progress] { display: none; }`,
  );
  expect(html).toContain(`pyly-startup-logo-draw`);
  expect(html).toMatch(/<script\b[^>]*>[\s\S]+<\/script>/u);
  expect(html).toMatch(/<h1\b[^>]*>Enable JavaScript<\/h1>/u);
  expect(html).toContain(
    `Pinyinly needs JavaScript to load. It looks like JavaScript is disabled in your browser.`,
  );
});
