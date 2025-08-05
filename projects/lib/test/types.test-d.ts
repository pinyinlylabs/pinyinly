import { test } from "vitest";
import type {
  Flatten,
  IsEqual,
  IsExhaustedRest,
  PartialIfUndefined,
} from "../src/types.ts";

test(`IsEqual`, () => {
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

  true satisfies IsEqual<
    { key?: string | undefined },
    { key?: string | undefined }
  >;
  true satisfies IsEqual<{ key?: string | undefined }, { key?: string }>;
  true satisfies IsEqual<{ key?: string }, { key?: string | undefined }>;
  // @ts-expect-error optional key is not the same as undefined
  true satisfies IsEqual<{ key?: string }, { key: string | undefined }>;
});

test(`PartialIfUndefined`, () => {
  true satisfies IsEqual<
    PartialIfUndefined<{
      key1: string;
      key2: string | undefined;
      key3?: string;
    }>,
    {
      key1: string;
      key2?: string | undefined;
      key3?: string;
    }
  >;
});

test(`Flatten`, () => {
  // @ts-expect-error record intersection isn't the same as flat union
  true satisfies IsEqual<
    { key1: string } & { key2: string },
    { key1: string; key2: string }
  >;

  // Flatten<…> fixes it
  true satisfies IsEqual<
    Flatten<{ key1: string } & { key2: string }>,
    { key1: string; key2: string }
  >;
});

test(`IsExhaustedRest`, () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  true satisfies IsExhaustedRest<{}>;

  // @ts-expect-error not an empty object
  true satisfies IsExhaustedRest<object>;

  // @ts-expect-error still have key1
  true satisfies IsExhaustedRest<{ key1: string }>;

  // @ts-expect-error never is not an empty object
  true satisfies IsExhaustedRest<never>;
});
