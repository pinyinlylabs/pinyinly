import { IsEqual } from "#util/types.ts";
import assert from "node:assert/strict";
import test from "node:test";

function typeChecks(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

typeChecks(`IsEqual`, () => {
  true satisfies IsEqual<`a`, `a`>;
  false satisfies IsEqual<`a`, `b`>;

  true satisfies IsEqual<`a` | undefined, `a` | undefined>;

  // @ts-expect-error object with a key isn't equal to empty object
  true satisfies IsEqual<{ key: `value` }, object>;
  false satisfies IsEqual<{ key: `value` }, object>;
  // @ts-expect-error unknown isn't equal to object
  true satisfies IsEqual<unknown, { key: `value` }>;
  false satisfies IsEqual<unknown, { key: `value` }>;
  // @ts-expect-error unknown isn't equal to string
  true satisfies IsEqual<unknown, `a`>;
  false satisfies IsEqual<unknown, `a`>;
  // @ts-expect-error object isn't equal to unknown
  true satisfies IsEqual<{ key: `value` }, unknown>;
  false satisfies IsEqual<{ key: `value` }, unknown>;
  // @ts-expect-error object isn't equal to never
  true satisfies IsEqual<{ key: `value` }, never>;
  false satisfies IsEqual<{ key: `value` }, never>;
});

await test(`lib.dom.d.ts patches`, async () => {
  // Passing `undefined` throws, but in lib.dom.d.ts `Response.json()` takes an
  // `any`, so it's not caught by the type checker. So we've patched
  // lib.dom.d.ts to remove the `any` so this test ensures that the patch is
  // working.
  assert.throws(() => Response.json(undefined as unknown as string));

  typeChecks(() => {
    // @ts-expect-error passing `undefined` throws, but in lib.dom.d.ts
    // `Response.json()` takes an `any`, so it's not caught by the type checker.
    // So we've patched lib.dom.d.ts to remove the `any` so this test ensures
    // that the patch is working.
    Response.json(undefined);
  });
});

typeChecks(`banned CommonJS globals, use import.meta.* instead`, () => {
  // eslint-disable-next-line no-restricted-globals
  void __dirname;
  // eslint-disable-next-line no-restricted-globals
  void __filename;
});
