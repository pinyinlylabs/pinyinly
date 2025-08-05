import { expect, test } from "vitest";

test(`lib.dom.d.ts patches`, () => {
  // Passing `undefined` throws, but in lib.dom.d.ts `Response.json()` takes an
  // `any`, so it's not caught by the type checker. So we've patched
  // lib.dom.d.ts to remove the `any` so this test ensures that the patch is
  // working.
  expect(() => Response.json(undefined as unknown as string)).toThrow();

  test(() => {
    // @ts-expect-error passing `undefined` throws, but in lib.dom.d.ts
    // `Response.json()` takes an `any`, so it's not caught by the type checker.
    // So we've patched lib.dom.d.ts to remove the `any` so this test ensures
    // that the patch is working.
    Response.json();
  });
});

test(`banned CommonJS globals, use import.meta.* instead`, () => {
  // eslint-disable-next-line no-restricted-globals
  void __dirname;
  // eslint-disable-next-line no-restricted-globals
  void __filename;
});
