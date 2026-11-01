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
  const script = doc.querySelector(`script:not([src])`);
  expect(script).not.toBeNull();
  const errorHandlers: Record<string, (event: { target: unknown }) => void> =
    {};
  const addEventListener = vi.fn(
    (
      type: string,
      listener: (event: { target: unknown }) => void,
      _capture: boolean,
    ) => {
      errorHandlers[type] = listener;
    },
  );
  const consoleError = vi.fn();
  runInNewContext(script?.textContent ?? ``, {
    document: doc,
    window: { addEventListener, setTimeout },
    HTMLScriptElement,
    console: { error: consoleError },
  });
  return { doc, addEventListener, consoleError, errorHandlers };
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

test(`reveals recovery after 15 seconds without an in-page reload control`, () => {
  const { doc } = createStartupDocument();
  const recovery = doc.querySelector(`#pyly-startup-recovery`);
  expect(recovery).toHaveAttribute(`hidden`);
  vi.advanceTimersByTime(14_999);
  expect(recovery).toHaveAttribute(`hidden`);
  vi.advanceTimersByTime(1);
  expect(recovery).not.toHaveAttribute(`hidden`);
  expect(recovery?.textContent).toContain(
    `Still loading… This is taking longer than usual.`,
  );
  expect(recovery?.querySelector(`button`)).toBeNull();
  expect(doc.body.querySelector(`style`)?.textContent).toContain(
    `font: 12px/1.5 system-ui, sans-serif`,
  );
  expect(doc.body.querySelector(`style`)?.textContent).toContain(
    `color-mix(in srgb, currentColor 60%, transparent)`,
  );
  vi.advanceTimersByTime(60_000);
  expect(doc.querySelector(`#pyly-startup-progress`)).not.toBeNull();
});

test(`reports a failed external script while startup is active`, () => {
  const { doc, addEventListener, consoleError, errorHandlers } =
    createStartupDocument();
  const recovery = doc.querySelector(`#pyly-startup-recovery`);
  const apiScript = doc.createElement(`script`);
  apiScript.src = `/api/sentry.js`;
  const script = doc.createElement(`script`);
  script.src = `/app.js`;

  expect(addEventListener).toHaveBeenCalledWith(
    `error`,
    expect.any(Function),
    true,
  );
  errorHandlers[`error`]?.({ target: new Error(`unrelated`) });
  expect(recovery).toHaveAttribute(`hidden`);

  errorHandlers[`error`]?.({ target: apiScript });
  expect(recovery).toHaveAttribute(`hidden`);
  expect(consoleError).not.toHaveBeenCalled();

  errorHandlers[`error`]?.({ target: script });
  expect(recovery).not.toHaveAttribute(`hidden`);
  expect(recovery?.textContent).toContain(
    `Something went wrong while loading.`,
  );
  expect(consoleError).toHaveBeenCalledExactlyOnceWith(
    `Failed to load script:`,
    script.src,
  );
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
