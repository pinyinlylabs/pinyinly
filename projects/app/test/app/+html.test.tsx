// @vitest-environment happy-dom

import RootHtml from "#app/+html.tsx";
import { renderToStaticMarkup } from "react-dom/server";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock(`expo-router/html`, () => ({
  ScrollViewStyleReset: () => (
    <style id="expo-reset">{`body{overflow:hidden}`}</style>
  ),
  useServerDocumentContext: () => ({
    headNodes: <meta name="expo-head" content="preserved" />,
    bodyNodes: <script src="/app.js" />,
    htmlAttributes: { lang: `en`, dir: `ltr` },
    bodyAttributes: { "data-expo": `preserved` },
  }),
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function createStartupDocument() {
  const html = renderToStaticMarkup(
    <RootHtml>
      <div id="root" />
    </RootHtml>,
  );
  const doc = new DOMParser().parseFromString(html, `text/html`);
  const reload = vi.fn();
  const script = doc.querySelector(`script:not([src])`);
  expect(script).not.toBeNull();
  runInNewContext(script?.textContent ?? ``, {
    document: doc,
    window: { setTimeout, location: { reload } },
  });
  return { doc, reload };
}

test(`includes a self-contained indeterminate progress bar and preserves Expo document resources`, () => {
  const { doc } = createStartupDocument();
  const startup = doc.querySelector(`#pyly-startup`);
  const progress = startup?.querySelector(`[role="progressbar"]`);
  expect(progress).toHaveAttribute(`aria-label`, `Loading Pinyinly`);
  expect(progress).not.toHaveAttribute(`aria-valuenow`);
  expect(startup?.parentElement).toBe(doc.body);
  expect(doc.querySelector(`#root`)?.contains(startup)).toBe(false);
  expect(startup?.querySelectorAll(`img, link, script[src]`)).toHaveLength(0);
  expect(doc.documentElement).toHaveAttribute(`dir`, `ltr`);
  expect(doc.body).toHaveAttribute(`data-expo`, `preserved`);
  expect(doc.querySelector(`meta[name="expo-head"]`)).toHaveAttribute(
    `content`,
    `preserved`,
  );
  expect(doc.querySelector(`#expo-reset`)).not.toBeNull();
  expect(doc.querySelector(`script[src="/app.js"]`)).not.toBeNull();
  expect(doc.body.querySelector(`style`)?.textContent).toContain(
    `prefers-reduced-motion: reduce`,
  );
  expect(doc.body.querySelector(`style`)?.textContent).toContain(
    `prefers-color-scheme: dark`,
  );
  expect(startup?.querySelector(`noscript`)?.textContent).toContain(
    `Enable JavaScript`,
  );
});

test(`reveals recovery at 15 seconds and reloads only when requested`, () => {
  const { doc, reload } = createStartupDocument();
  const recovery = doc.querySelector(`#pyly-startup-recovery`);
  expect(recovery).toHaveAttribute(`hidden`);
  vi.advanceTimersByTime(14_999);
  expect(recovery).toHaveAttribute(`hidden`);
  vi.advanceTimersByTime(1);
  expect(recovery).not.toHaveAttribute(`hidden`);
  expect(recovery?.textContent).toContain(
    `This is taking longer than expected.`,
  );
  vi.advanceTimersByTime(60_000);
  expect(doc.querySelector(`#pyly-startup-progress`)).not.toBeNull();
  expect(reload).not.toHaveBeenCalled();
  recovery?.querySelector(`button`)?.click();
  expect(reload).toHaveBeenCalledExactlyOnceWith();
});

test.each([0, 15_000])(
  `does not resurrect the indicator dismissed after %i milliseconds`,
  (delay) => {
    const { doc } = createStartupDocument();
    vi.advanceTimersByTime(delay);
    doc.querySelector(`#pyly-startup`)?.remove();
    vi.advanceTimersByTime(60_000);
    expect(doc.querySelector(`#pyly-startup`)).toBeNull();
  },
);
