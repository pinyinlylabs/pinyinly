import { nanoid } from "#util/nanoid.ts";
import type {
  ExtractVariableNames,
  RizzleCustom,
  RizzleIndexed,
  RizzleIndexTypes,
  RizzleObject,
  RizzleObjectInput,
  RizzleObjectMarshaled,
  RizzleObjectOutput,
  RizzleOptional,
  RizzleReplicache,
  RizzleReplicacheMutators,
  RizzleReplicacheQuery,
} from "#util/rizzle.ts";
import { keyPathVariableNames, r } from "#util/rizzle.ts";
import type { IsEqual } from "#util/types.ts";
import mapValues from "lodash/mapValues";
import shuffle from "lodash/shuffle";
import assert from "node:assert/strict";
import type {
  DeepReadonly,
  ReadonlyJSONValue,
  WriteTransaction,
} from "replicache";
import { Replicache } from "replicache";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";
import { makeMockTx, testReplicacheOptions } from "./rizzleHelpers";

function typeChecks<_T>(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

test(`string() key and value`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    name: r.string(),
  });

  using tx = makeMockTx();

  const getSpy = vi.spyOn(tx, `get`);
  const setSpy = vi.spyOn(tx, `set`);

  await posts.get(tx, { id: `1` });
  expect(getSpy).toHaveBeenCalledTimes(1);
  expect(getSpy).toHaveBeenCalledWith(`foo/1`);

  // Check that a ReadonlyJSONValue is parsed correctly.
  getSpy.mockImplementationOnce(() =>
    Promise.resolve({ id: `1`, name: `foo` }),
  );
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    name: `foo`,
  });

  // Check that a value is encoded correctly.
  await posts.set(tx, { id: `1` }, { id: `1`, name: `foo` });
  expect(setSpy).toHaveBeenCalledTimes(1);
  expect(setSpy).toHaveBeenCalledWith(`foo/1`, { id: `1`, name: `foo` });

  typeChecks(async () => {
    // .get()
    void posts.get(tx.readonly, { id: `1` });
    // @ts-expect-error `id` is the key, not `name`
    void posts.get(tx.readonly, { name: `1` });
    {
      const post = await posts.get(tx.readonly, { id: `1` });
      true satisfies IsEqual<
        typeof post,
        { id: string; name: string } | undefined
      >;
    }

    // .set()
    void posts.set(tx, { id: `1` }, { id: `1`, name: `foo` });
    // @ts-expect-error `id` is the key, not `name`
    void posts.set(tx, { name: `1` }, { id: `1`, name: `foo` });
  });
});

test(`string() .nullable()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    name: r.string().nullable().alias(`n`),
  });

  using tx = makeMockTx();

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => ({
    id: `1`,
    n: `foo`,
  }));
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    name: `foo`,
  });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => ({
    id: `1`,
    n: null,
  }));
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    name: null,
  });

  typeChecks(async () => {
    // .get()
    {
      const x = await posts.get(tx, { id: `1` });
      true satisfies IsEqual<
        typeof x,
        { id: string; name: string | null } | undefined
      >;
    }

    // .set()
    void posts.set(tx, { id: `1` }, { id: `1`, name: `foo` });
    void posts.set(tx, { id: `1` }, { id: `1`, name: null });
  });
});

test(`string() .optional()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    name: r.string().optional().alias(`n`),
  });

  using tx = makeMockTx();

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => ({
    id: `1`,
    n: `foo`,
  }));
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    name: `foo`,
  });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => ({ id: `1` }));
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({ id: `1` });

  typeChecks(async () => {
    // .get()
    {
      const x = await posts.get(tx, { id: `1` });
      true satisfies IsEqual<
        typeof x,
        { id: string; name?: string | undefined } | undefined
      >;
    }

    // .set()
    void posts.set(tx, { id: `1` }, { id: `1`, name: `foo` });
    void posts.set(tx, { id: `1` }, { id: `1`, name: undefined });
    void posts.set(tx, { id: `1` }, { id: `1` });
  });
});

test(`object() .nullable()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    name: r
      .object({
        first: r.string(),
        last: r.string(),
      })
      .nullable()
      .alias(`n`),
  });

  using tx = makeMockTx();

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => ({
    id: `1`,
    n: { first: `a`, last: `b` },
  }));
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    name: { first: `a`, last: `b` },
  });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => ({
    id: `1`,
    n: null,
  }));
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    name: null,
  });

  typeChecks(async () => {
    // .get()
    {
      const x = await posts.get(tx, { id: `1` });
      true satisfies IsEqual<
        typeof x,
        { id: string; name: { first: string; last: string } | null } | undefined
      >;
    }

    // .set()
    void posts.set(
      tx,
      { id: `1` },
      { id: `1`, name: { first: `a`, last: `b` } },
    );
    void posts.set(tx, { id: `1` }, { id: `1`, name: null });
  });
});

test(`object()`, async () => {
  using tx = makeMockTx();

  {
    // key alias
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      name: r.string(`n`),
    });

    const getSpy = vi.spyOn(tx, `get`);
    const setSpy = vi.spyOn(tx, `set`);

    await posts.get(tx, { id: `1` });
    assert.equal(getSpy.mock.calls.length, 1);
    assert.deepEqual(getSpy.mock.calls[0], [`foo/1`]);

    // Check that a ReadonlyJSONValue is parsed correctly.
    getSpy.mockImplementationOnce(() => Promise.resolve({ id: `1`, n: `foo` }));
    await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
      id: `1`,
      name: `foo`,
    });

    // Check that a value is encoded correctly.
    await posts.set(tx, { id: `1` }, { id: `1`, name: `foo` });
    assert.equal(setSpy.mock.calls.length, 1);
    assert.deepEqual(setSpy.mock.calls[0], [`foo/1`, { id: `1`, n: `foo` }]);
  }

  typeChecks(`simple, no aliases`, async () => {
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      name: r.string(),
    });

    // .get()
    void posts.get(tx.readonly, { id: `1` });
    // @ts-expect-error `id` is the key, not `name`
    void posts.get(tx.readonly, { name: `1` });
    {
      const post = await posts.get(tx.readonly, { id: `1` });
      true satisfies IsEqual<
        typeof post,
        { id: string; name: string } | undefined
      >;
    }

    // .set()
    void posts.set(tx, { id: `1` }, { id: `1`, name: `foo` });
    // @ts-expect-error `id` is the key, not `name`
    void posts.set(tx, { name: `1` }, { id: `1`, name: `foo` });
  });

  typeChecks(`nested with aliases`, async () => {
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      author: r.object({
        name: r.string(),
        email: r.string(`e`),
      }),
    });

    // .get()
    void posts.get(tx, { id: `1` });
    // @ts-expect-error `id` is the key, not `name`
    void posts.get(tx, { name: `1` });
    {
      const post = await posts.get(tx, { id: `1` });
      true satisfies IsEqual<
        typeof post,
        { id: string; author: { name: string; email: string } } | undefined
      >;
    }

    // .set()
    void posts.set(
      tx,
      { id: `1` },
      { id: `1`, author: { name: `foo`, email: `` } },
    );
    void posts.set(
      tx,
      // @ts-expect-error `id` is the key, not `name`
      { name: `1` },
      { id: `1`, author: { id: `foo`, email: `` } },
    );
    void posts.set(
      tx,
      // @ts-expect-error `email` alias should not be used as the input
      { name: `1` },
      { id: `1`, author: { name: `foo`, e: `` } },
    );
  });
});

test(`timestamp()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    due: r.timestamp(),
  });

  using tx = makeMockTx();

  const getSpy = vi.spyOn(tx, `get`);
  const setSpy = vi.spyOn(tx, `set`);

  await posts.get(tx, { id: `1` });
  assert.equal(getSpy.mock.calls.length, 1);
  assert.deepEqual(getSpy.mock.calls[0], [`foo/1`]);

  // Unmarshalling
  {
    const date = new Date(1_601_856_000_000);
    for (const [marshaled, unmarshaled] of [
      [date.toISOString(), date], // ISO8601 string
      [date.getTime(), date], // timestamp as number
      [date.getTime().toString(), date], // timestamp as string
    ] as const) {
      vi.spyOn(tx, `get`).mockImplementationOnce(() =>
        Promise.resolve({
          id: `1`,
          due: marshaled,
        }),
      );

      await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
        id: `1`,
        due: unmarshaled,
      });
    }
  }

  // Marshalling
  {
    const date = new Date(1_601_856_000_000);
    for (const [marshaled, unmarshaled] of [
      [date.getTime(), date], // Date
      [date.getTime(), date.getTime()], // timestamp as number
    ] as const) {
      await posts.set(tx, { id: `1` }, { id: `1`, due: unmarshaled });
      assert.equal(setSpy.mock.calls.length, 1);
      assert.deepEqual(setSpy.mock.calls[0], [
        `foo/1`,
        { id: `1`, due: marshaled },
      ]);
      setSpy.mockClear();
    }
  }
});

test(`entity() one variable`, async () => {
  const posts = r.entity(`foo/[id1]`, {
    id1: r.string(),
    text: r.string(),
  });

  using tx = makeMockTx();

  const setSpy = vi.spyOn(tx, `set`);

  await posts.set(tx, { id1: `1` }, { id1: `1`, text: `hello` });
  const [, marshaledData] = setSpy.mock.calls[0]!;
  const getSpy = vi.spyOn(tx, `get`);
  getSpy.mockImplementationOnce(
    async () => marshaledData as DeepReadonly<ReadonlyJSONValue>,
  );
  await expect(posts.get(tx, { id1: `1` })).resolves.toEqual({
    id1: `1`,
    text: `hello`,
  });
  assert.equal(getSpy.mock.calls.length, 1);
  assert.deepEqual(getSpy.mock.calls[0], [`foo/1`]);
});

test(`entity() variables requires string marshaler`, async () => {
  typeChecks(() => {
    r.entity(`foo/[id]`, { id: r.string() });
    r.entity(`foo/[id]`, { id: r.literal(`foo`, r.string()) });
    // @ts-expect-error number() doesn't marshal to a string
    r.entity(`foo/[id]`, { id: r.number() });
  });
});

test(`entity() two variables`, async () => {
  const posts = r.entity(`foo/[id1]/[id2]`, {
    id1: r.string(),
    id2: r.string(),
    text: r.string(),
  });

  using tx = makeMockTx();

  const setSpy = vi.spyOn(tx, `set`);

  await posts.set(
    tx,
    { id1: `1`, id2: `2` },
    { id1: `1`, id2: `2`, text: `hello` },
  );
  const [, marshaledData] = setSpy.mock.calls[0]!;
  const getSpy = vi.spyOn(tx, `get`);
  getSpy.mockImplementationOnce(
    async () => marshaledData as DeepReadonly<ReadonlyJSONValue>,
  );
  await expect(posts.get(tx, { id1: `1`, id2: `2` })).resolves.toEqual({
    id1: `1`,
    id2: `2`,
    text: `hello`,
  });
  assert.equal(getSpy.mock.calls.length, 1);
  assert.deepEqual(getSpy.mock.calls[0], [`foo/1/2`]);
});

test(`entity() non-string key codec`, async () => {
  const rComplex = r.custom(
    z
      .tuple([z.string(), z.number()])
      .readonly()
      .transform((v) => v.join(`:`)),
    z.string().transform((s) => {
      const [a, b] = s.split(`:`);
      return [a, Number.parseInt(b!, 10)] as const;
    }),
  );

  const posts = r.entity(`foo/[complex]`, {
    complex: rComplex,
    text: r.string(),
  });

  // Marshal and unmarshal round tripping
  for (const [unmarshaled, marshaled] of [
    [[`a`, 1], `a:1`],
    [[`c`, 3], `c:3`],
  ] as const) {
    using tx = makeMockTx();
    const setSpy = vi.spyOn(tx, `set`);
    await posts.set(
      tx,
      { complex: unmarshaled },
      { complex: unmarshaled, text: `hello` },
    );
    const [, marshaledData] = setSpy.mock.calls[0]!;
    const getSpy = vi.spyOn(tx, `get`);
    getSpy.mockImplementationOnce(
      async () => marshaledData as DeepReadonly<ReadonlyJSONValue>,
    );
    await expect(posts.get(tx, { complex: unmarshaled })).resolves.toEqual({
      complex: unmarshaled,
      text: `hello`,
    });
    assert.equal(getSpy.mock.calls.length, 1);
    assert.deepEqual(getSpy.mock.calls[0], [`foo/${marshaled}`]);
  }
});

test(`entity() key marshaling`, async () => {
  const posts = r.entity(`posts/[id]`, {
    id: r.string(),
  });

  assert.equal(posts.marshalKey({ id: `1` }), `posts/1`);

  const aliased = r.entity(`posts/[id]`, {
    id: r.string().alias(`i`),
  });

  assert.equal(aliased.marshalKey({ id: `1` }), `posts/1`);

  // @ts-expect-error missing `id` key
  assert.throws(() => aliased.marshalKey({}), /missing/);
});

test(`entity() alias duplicates`, async () => {
  assert.throws(
    () =>
      r.entity(`posts/[id]`, {
        id: r.string().alias(`x`),
        foo: r.string().alias(`x`),
      }),
    /alias conflict/,
  );

  assert.throws(
    () =>
      r.entity(`posts/[id]`, {
        id: r.string(),
        foo: r.string().alias(`id`),
      }),
    /alias conflict/,
  );
});

test(`entity() .has()`, async () => {
  const posts = r.entity(`foo/[id]`, { id: r.string() });

  using tx = makeMockTx();

  const hasSpy = vi.spyOn(tx, `has`);
  // Marshal and unmarshal round tripping
  await posts.has(tx, { id: `1` });
  assert.deepEqual(hasSpy.mock.calls[0], [`foo/1`]);

  vi.spyOn(tx, `has`).mockImplementation(async (key) =>
    key === `foo/1` ? true : false,
  );
  await expect(posts.has(tx, { id: `1` })).resolves.toEqual(true);
  await expect(posts.has(tx, { id: `2` })).resolves.toEqual(false);
});

test(`entity() distinguishing between input/output types`, async () => {
  const rCoerciveString = () =>
    r.custom(
      // takes in a number or string
      z
        .union([z.number(), z.string()])
        .transform((v) => (typeof v === `string` ? v : v.toString())),
      // but always returns back to a string
      z.string(),
    );

  const posts = r.entity(`foo/[id]`, {
    id: rCoerciveString(),
    text: rCoerciveString().indexed(`byText`),
  });

  using tx = makeMockTx();

  // .get()
  {
    const x1 = await posts.get(tx, { id: `1` });
    true satisfies IsEqual<typeof x1, { id: string; text: string } | undefined>;
    const x2 = await posts.get(tx, { id: 1 });
    true satisfies IsEqual<typeof x2, { id: string; text: string } | undefined>;
  }

  // .has()
  await posts.has(tx, { id: `1` });
  await posts.has(tx, { id: 1 });

  // .set()
  await posts.set(tx, { id: `1` }, { id: `1`, text: `1` });
  await posts.set(tx, { id: 1 }, { id: 1, text: 1 });

  // index scan
  typeChecks(async () => {
    const schema = { posts };
    const r = null as unknown as RizzleReplicache<typeof schema>;
    for await (const [key, value] of r.query.posts.byText(tx)) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, { id: string; text: string }>;
    }
  });
});

test(`entity() multiple indexes types work`, async () => {
  const posts = r.entity(`posts/[id]`, {
    id: r.string().alias(`i`).indexed(`byId`),
    date: r.datetime().alias(`d`).indexed(`byDate`),
    text: r.string(),
  });
  const users = r.entity(`users/[id]`, {
    id: r.string().alias(`i`).indexed(`byId`),
  });

  using tx = makeMockTx();

  // index scan
  typeChecks(async () => {
    const schema = { posts, users };
    const r = null as unknown as RizzleReplicache<typeof schema>;

    type Value = { id: string; date: Date; text: string };

    // byId()
    for await (const [key, value] of r.query.posts.byId(tx)) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // byId(value)
    for await (const [key, value] of r.query.posts.byId(tx, `1`)) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // @ts-expect-error number is the wrong type for the parameter
    r.query.posts.byId(tx, 1);

    // [paged] byId()
    for await (const [key, value] of r.queryPaged.posts.byId()) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // [paged] byId(value)
    for await (const [key, value] of r.queryPaged.posts.byId(`1`)) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // @ts-expect-error number is the wrong type for the parameter
    r.queryPaged.posts.byId(tx, 1);

    // byDate()
    for await (const [key, value] of r.query.posts.byDate(tx)) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // byDate(value)
    for await (const [key, value] of r.query.posts.byDate(tx, new Date())) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // @ts-expect-error number is the wrong type for the parameter
    r.query.posts.byDate(tx, 1);
    // [paged] byDate()
    for await (const [key, value] of r.queryPaged.posts.byDate()) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // [paged] byDate(value)
    for await (const [key, value] of r.queryPaged.posts.byDate(new Date())) {
      true satisfies IsEqual<typeof key, string>;
      true satisfies IsEqual<typeof value, Value>;
    }
    // @ts-expect-error number is the wrong type for the parameter
    r.query.posts.byDate(tx, 1);
  });
});

test(`entity() requires variables to be declared`, () => {
  typeChecks(() => {
    r.entity(
      `foo/[id]`,
      // @ts-expect-error `id` is missing
      { text: r.string() },
    );
  });
});

test(`number()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    count: r.number(`c`),
  });

  using tx = makeMockTx();

  const setSpy = vi.spyOn(tx, `set`);

  // Marshal and unmarshal round tripping
  await posts.set(tx, { id: `1` }, { id: `1`, count: 5 });
  const [, marshaledData] = setSpy.mock.calls[0]!;
  assert.deepEqual(marshaledData, { id: `1`, c: 5 });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => marshaledData);
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    count: 5,
  });
});

test(`boolean()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    isActive: r.boolean(`a`),
  });

  using tx = makeMockTx();
  const setSpy = vi.spyOn(tx, `set`);

  // Marshal and unmarshal round tripping
  await posts.set(tx, { id: `1` }, { id: `1`, isActive: true });
  const [, marshaledData] = setSpy.mock.calls[0]!;
  assert.deepEqual(marshaledData, { id: `1`, a: true });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => marshaledData);
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    isActive: true,
  });
});

test(`json()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    data: r.json(`a`),
  });

  using tx = makeMockTx();
  const setSpy = vi.spyOn(tx, `set`);

  // Marshal and unmarshal round tripping
  await posts.set(tx, { id: `1` }, { id: `1`, data: { foo: `bar` } });
  const [, marshaledData] = setSpy.mock.calls[0]!;
  assert.deepEqual(marshaledData, { id: `1`, a: { foo: `bar` } });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => marshaledData);
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    data: { foo: `bar` },
  });
});

test(`enum()`, async () => {
  const colorsSchema = z.enum([`RED`, `BLUE`]);
  const Colors = colorsSchema.enum;

  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    color: r.enum(Colors, {
      [Colors.RED]: `r`,
      [Colors.BLUE]: `b`,
    }),
  });

  // Marshal and unmarshal round tripping
  for (const color of [Colors.BLUE, Colors.RED]) {
    using tx = makeMockTx();
    const setSpy = vi.spyOn(tx, `set`);

    await posts.set(tx, { id: `1` }, { id: `1`, color });
    const [, marshaledData] = setSpy.mock.calls[0]!;

    vi.spyOn(tx, `get`).mockImplementationOnce(
      async () => marshaledData as DeepReadonly<ReadonlyJSONValue>,
    );
    // Make sure the enum isn't just being marshaled to its runtime value,
    // these are too easily to change accidentally so instead there should be
    // a separate explicit marshaled value.
    assert.notEqual(Object.values(marshaledData as object), [color]);
    await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
      id: `1`,
      color,
    });
  }
});

test(`object() with alias`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    author: r.object({
      name: r.string(),
      email: r.string(`e`),
      id: r.string(`i`).indexed(`byAuthorId`),
    }),
  });

  using tx = makeMockTx();
  const setSpy = vi.spyOn(tx, `set`);

  // Marshal and unmarshal round tripping
  await posts.set(
    tx,
    { id: `1` },
    { id: `1`, author: { name: `foo`, email: `f@o`, id: `1` } },
  );
  const [, marshaledData] = setSpy.mock.calls[0]!;
  assert.deepEqual(marshaledData, {
    id: `1`,
    author: { name: `foo`, e: `f@o`, i: `1` },
  });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => marshaledData);
  await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
    id: `1`,
    author: { name: `foo`, email: `f@o`, id: `1` },
  });
});

test(`object()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    author: r.object({
      name: r.string(),
    }),
  });

  using tx = makeMockTx();
  const setSpy = vi.spyOn(tx, `set`);

  // Marshal and unmarshal round tripping
  const id = `1`;
  await posts.set(tx, { id }, { id, author: { name: `foo` } });
  const [, marshaledData] = setSpy.mock.calls[0]!;
  assert.deepEqual(marshaledData, { id, author: { name: `foo` } });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => marshaledData);
  await expect(posts.get(tx, { id })).resolves.toEqual({
    id,
    author: { name: `foo` },
  });
});

test(`.getIndexes()`, () => {
  // no key path variables
  {
    const posts = r.entity(`foo`, {
      id: r.string(),
      author: r.object({
        name: r.string().indexed(`byAuthorName`),
      }),
    });
    expect(posts.getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        prefix: `foo`,
        jsonPointer: `/author/name`,
      },
    });
  }

  // object(.string().indexed())
  {
    const posts = r.entity(`foo/`, {
      id: r.string(),
      author: r.object({
        name: r.string().indexed(`byAuthorName`),
      }),
    });

    expect(posts._def.valueType._getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        jsonPointer: `/author/name`,
      },
    });
    expect(posts.getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        prefix: `foo/`,
        jsonPointer: `/author/name`,
      },
    });
  }

  // .string().indexed().nullable()
  {
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      name: r.string().indexed(`byAuthorName`).nullable(),
    });

    expect(posts.getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        prefix: `foo/`,
        jsonPointer: `/name`,
      },
    });
  }

  // .string().alias().indexed().nullable()
  {
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      name: r.string().alias(`n`).indexed(`byAuthorName`).nullable(),
    });

    expect(posts.getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        prefix: `foo/`,
        jsonPointer: `/n`,
      },
    });
  }

  // .string().indexed().optional()
  {
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      name: r.string().indexed(`byAuthorName`).optional(),
    });

    expect(posts.getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        prefix: `foo/`,
        jsonPointer: `/name`,
      },
    });
  }

  // .string().alias().indexed().optional()
  {
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      name: r.string().alias(`n`).indexed(`byAuthorName`).optional(),
    });

    expect(posts.getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        prefix: `foo/`,
        jsonPointer: `/n`,
      },
    });
  }

  // .string().indexed().alias()
  {
    const posts = r.entity(`foo/[id]`, {
      id: r.string(),
      name: r.string().indexed(`byAuthorName`).alias(`n`),
    });

    expect(posts.getIndexes()).toMatchObject({
      byAuthorName: {
        allowEmpty: false,
        prefix: `foo/`,
        jsonPointer: `/n`,
      },
    });
  }
});

test(`mutator()`, async () => {
  const fn = r
    .mutator({
      id: r.string(),
      rank: r.number(`r`),
    })
    .alias(`cp`);

  assert.deepEqual(fn._def.alias, `cp`);
});

typeChecks<RizzleReplicacheMutators<never>>(
  `allows writing mutator implementations separately`,
  async () => {
    const schema = {
      posts: r.entity(`p/[id]`, {
        id: r.string(),
        rank: r.number(`r`),
      }),
      createPost: r
        .mutator({
          id: r.string(),
          rank: r.number(`r`),
        })
        .alias(`cp`),
    };

    const createPost: RizzleReplicacheMutators<
      typeof schema
    >[`createPost`] = async (db, options) => {
      true satisfies IsEqual<typeof db.tx, WriteTransaction>;
      true satisfies IsEqual<typeof options, { id: string; rank: number }>;

      typeChecks(async () => {
        const { id, rank } = options;
        // native replicache tx API
        await db.tx.set(`p/${id}`, { r: rank });

        // rizzle convenience API
        await db.posts.get({ id });
        await db.posts.set({ id }, { id, rank });

        // @ts-expect-error there's no rank2 in the schema
        await db.posts.set({ id }, { id, rank2: 2 });
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    createPost;
  },
);

typeChecks<RizzleReplicacheMutators<never>>(async () => {
  const schema = {
    posts: r.entity(`p/[id]`, { id: r.string() }),
    createPost: r.mutator({ id: r.string() }),
  };

  // Only mutators are included
  true satisfies IsEqual<
    keyof RizzleReplicacheMutators<typeof schema>,
    `createPost`
  >;
});

typeChecks<RizzleReplicacheQuery<never>>(async () => {
  const schema = {
    posts: r.entity(`p/[id]`, { id: r.string() }),
    createPost: r.mutator({ id: r.string() }),
  };

  // Only key-value are included
  true satisfies IsEqual<keyof RizzleReplicacheQuery<typeof schema>, `posts`>;
});

class CheckpointLog {
  #logs: string[] = [];

  log(name: string) {
    this.#logs.push(name);
  }

  assert(...expected: string[]) {
    assert.deepEqual(this.#logs, expected);
    this.#logs = [];
  }
}

test(`replicache()`, async () => {
  const schema = {
    version: `1`,
    posts: r.entity(`p/[id]`, {
      id: r.string(),
      title: r.string(`r`).indexed(`byTitle`),
    }),
    createPost: r
      .mutator({
        id: r.string(),
        title: r.string(`r`),
      })
      .alias(`cp`),
  };

  const checkPoints = new CheckpointLog();

  await using db = r.replicache(
    testReplicacheOptions(),
    schema,
    {
      async createPost(db, options) {
        true satisfies IsEqual<typeof db.tx, WriteTransaction>;
        true satisfies IsEqual<typeof options, { id: string; title: string }>;
        await expect(db.posts.get({ id: `2` })).resolves.toEqual(undefined);
        assert.deepEqual(options, { id: `1`, title: `hello world` });
        await db.posts.set({ id: options.id }, options);
        checkPoints.log(`createPost.end`);
      },
    },
    (options) => {
      assert.deepEqual(
        mapValues(options.mutators, (v) => typeof v),
        { cp: `function` },
      );
      expect(options.indexes).toMatchObject({
        "posts.byTitle": {
          allowEmpty: false,
          jsonPointer: `/r`,
          prefix: `p/`,
        },
      });
      checkPoints.log(`replicacheOptions`);

      return new Replicache(options);
    },
  );

  checkPoints.assert(`replicacheOptions`);

  await db.mutate.createPost({ id: `1`, title: `hello world` });
  true satisfies IsEqual<
    ReturnType<typeof db.mutate.createPost>,
    Promise<void>
  >;
  checkPoints.assert(`createPost.end`);

  {
    //
    // Index scans
    //
    using tx = makeMockTx();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(tx, `scan`).mockImplementationOnce((options: any): any => {
      checkPoints.log(`tx.scan`);
      assert.deepEqual(options, {
        indexName: `posts.byTitle`,
        start: undefined,
      });
      return {
        async *entries() {
          const value = [[`hello world`, `p/1`], { id: `1`, r: `hello world` }];
          yield await Promise.resolve(value);
        },
      };
    });

    const results = [];
    for await (const post of db.query.posts.byTitle(tx)) {
      results.push(post);
    }
    assert.deepEqual(results, [
      [`p/1`, { id: `1`, title: `hello world` }, `hello world`],
    ]);

    checkPoints.assert(`tx.scan`);
  }

  {
    //
    // Paged index scans
    //
    using tx = makeMockTx();

    vi.spyOn(db.replicache, `query`).mockImplementation(async (fn) => fn(tx));

    vi.spyOn(tx, `scan`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementationOnce((options: any): any => {
        checkPoints.log(`tx.scan 0`);
        assert.deepEqual(options, {
          indexName: `posts.byTitle`,
          start: undefined,
        });
        return {
          async *entries() {
            const value = [
              [`hello world`, `p/1`],
              { id: `1`, r: `hello world` },
            ];
            yield await Promise.resolve(value);
          },
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementationOnce((options: any): any => {
        checkPoints.log(`tx.scan 1`);
        assert.deepEqual(options, {
          indexName: `posts.byTitle`,
          start: {
            exclusive: true,
            key: [`hello world`, `p/1`],
          },
        });
        return {
          async *entries() {
            return;
          },
        };
      });

    const results = [];
    for await (const post of db.queryPaged.posts.byTitle()) {
      results.push(post);
    }
    assert.deepEqual(results, [
      [`p/1`, { id: `1`, title: `hello world` }, `hello world`],
    ]);

    checkPoints.assert(`tx.scan 0`, `tx.scan 1`);
  }

  {
    //
    // entity() .has()
    //
    using tx = makeMockTx();

    vi.spyOn(tx, `has`).mockImplementation(async (x: unknown) => x === `p/1`);

    assert.equal(await db.query.posts.has(tx, { id: `1` }), true);
    assert.equal(await db.query.posts.has(tx, { id: `2` }), false);
  }

  {
    //
    // entity() .get()
    //
    using tx = makeMockTx();

    vi.spyOn(tx, `get`).mockImplementationOnce(async (x: unknown) =>
      x === `p/1` ? { id: `1`, r: `hello world` } : undefined,
    );

    const post = await db.query.posts.get(tx, { id: `1` });
    assert.deepEqual(post, { id: `1`, title: `hello world` });
  }

  {
    //
    // entity() .set()
    //
    using tx = makeMockTx();

    vi.spyOn(tx, `get`).mockImplementationOnce(async (x: unknown) =>
      x === `p/1` ? { id: `1`, r: `hello world` } : undefined,
    );

    const post = await db.query.posts.get(tx, { id: `1` });
    assert.deepEqual(post, { id: `1`, title: `hello world` });
  }

  checkPoints.assert();
});

test.todo(`replicache() errors if two mutators have the same alias`);

test(`replicache() disallows unknown mutator implementations`, async () => {
  const schema = {
    version: `1`,
    posts: r.entity(`p/[id]`, { id: r.string() }),
    createPost: r.mutator({ id: r.string() }),
  };

  // Only mutators are included (i.e. not `posts`)
  true satisfies IsEqual<
    keyof RizzleReplicacheMutators<typeof schema>,
    `createPost`
  >;
  // Only key-value are included (i.e. not `createPost`)
  true satisfies IsEqual<keyof RizzleReplicacheQuery<typeof schema>, `posts`>;

  typeChecks(async () => {
    r.replicache(testReplicacheOptions(), schema, {
      async createPost() {
        // stub
      },
      // @ts-expect-error there's no createPost2 in the schema
      async createPost2() {
        // stub
      },
    });
  });
});

test(`replicache() mutator tx`, async () => {
  const schema = {
    version: `1`,
    counter: r.entity(`counter/[id]`, {
      id: r.string(),
      count: r.number(`c`),
    }),
    incrementCounter: r
      .mutator({
        id: r.string(),
      })
      .alias(`ic`),
  };

  await using db = r.replicache(testReplicacheOptions(), schema, {
    async incrementCounter(db, options) {
      const { id } = options;
      const existingCount = await db.counter.get({ id });

      await db.counter.set(
        { id },
        { id, count: (existingCount?.count ?? 0) + 1 },
      );
    },
  });

  await db.mutate.incrementCounter({ id: `1` });
  await expect(
    db.replicache.query((tx) => db.query.counter.get(tx, { id: `1` })),
  ).resolves.toEqual({ id: `1`, count: 1 });
  await db.mutate.incrementCounter({ id: `1` });
  await expect(
    db.replicache.query((tx) => db.query.counter.get(tx, { id: `1` })),
  ).resolves.toEqual({ id: `1`, count: 2 });
});

describe(`replicache() entity()`, async () => {
  const schema = {
    version: `1`,
    text: r.entity(`text/[id]:[id2].`, {
      id: r.string(),
      id2: r.string(),
      body: r.string(`b`).indexed(`byCount`),
    }),
    appendText: r
      .mutator({
        id: r.string(),
        text: r.string(),
      })
      .alias(`at`),
  };

  test(`.set() only exposed to mutators`, async () => {
    await using db = r.replicache(testReplicacheOptions(), schema, {
      async appendText(db) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        db.text.set;
      },
    });

    // @ts-expect-error set() is not exposed on the query object
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    db.query.text.set;
  });

  test(`.scan() supports empty partial key`, async () => {
    await using db = r.replicache(testReplicacheOptions(), schema, {
      async appendText() {
        // noop
      },
    });

    using tx = makeMockTx();

    let checkPointsReached = ``;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(tx, `scan`).mockImplementationOnce((options: any): any => {
      checkPointsReached += `1`;
      assert.deepEqual(options, {
        prefix: `text/`,
        start: undefined,
      });
      return {
        async *entries() {
          const value = [`text/1:2.`, { id: `1`, id2: `2`, b: `hello world` }];
          yield await Promise.resolve(value);
        },
      };
    });

    for await (const result of db.query.text.scan(tx)) {
      checkPointsReached += `2`;
      assert.deepEqual(result, [
        `text/1:2.`,
        { id: `1`, id2: `2`, body: `hello world` },
      ]);
    }

    assert.equal(checkPointsReached, `12`);
  });

  test(`.scan() supports non-empty partial key`, async () => {
    await using db = r.replicache(testReplicacheOptions(), schema, {
      async appendText() {
        // noop
      },
    });

    using tx = makeMockTx();

    let checkPointsReached = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(tx, `scan`).mockImplementationOnce((options: any): any => {
      checkPointsReached++;
      assert.deepEqual(options, {
        prefix: `text/abc:`,
        start: undefined,
      });
      return {
        async *entries() {
          const value = [
            `text/abc:1.`,
            { id: `abc`, id2: `1`, b: `hello world` },
          ];
          yield await Promise.resolve(value);
        },
      };
    });

    for await (const result of db.query.text.scan(tx, { id: `abc` })) {
      checkPointsReached++;
      assert.deepEqual(result, [
        `text/abc:1.`,
        { id: `abc`, id2: `1`, body: `hello world` },
      ]);
    }

    assert.equal(checkPointsReached, 2);
  });

  test(`.scan() works inside mutator`, async () => {
    let checkPointsReached = 0;

    await using db = r.replicache(testReplicacheOptions(), schema, {
      async appendText(db) {
        checkPointsReached++;
        for await (const _ of db.text.scan({ id: `abc` })) {
          checkPointsReached++;
        }
      },
    });

    await db.mutate.appendText({ id: `1`, text: `hello world` });

    assert.equal(checkPointsReached, 1);
  });

  test(`paged .scan() supports empty partial key`, async () => {
    await using db = r.replicache(testReplicacheOptions(), schema, {
      async appendText() {
        // noop
      },
    });

    using tx = makeMockTx();
    vi.spyOn(db.replicache, `query`).mockImplementation(async (fn) => fn(tx));

    const checkPoints = new CheckpointLog();

    vi.spyOn(tx, `scan`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementationOnce((options: any): any => {
        checkPoints.log(`tx.scan 0`);
        assert.deepEqual(options, {
          prefix: `text/`,
          start: undefined,
        });
        return {
          async *entries() {
            const value = [
              `text/1:2.`,
              { id: `1`, id2: `2`, b: `hello world` },
            ];
            yield await Promise.resolve(value);
          },
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementationOnce((options: any): any => {
        checkPoints.log(`tx.scan 1`);
        assert.deepEqual(options, {
          prefix: `text/`,
          start: {
            exclusive: true,
            key: `text/1:2.`,
          },
        });
        return {
          async *entries() {
            return;
          },
        };
      });

    for await (const result of db.queryPaged.text.scan()) {
      checkPoints.log(`loop`);
      assert.deepEqual(result, [
        `text/1:2.`,
        { id: `1`, id2: `2`, body: `hello world` },
      ]);
    }

    checkPoints.assert(`tx.scan 0`, `loop`, `tx.scan 1`);
  });

  test(`paged .scan() supports non-empty partial key`, async () => {
    await using db = r.replicache(testReplicacheOptions(), schema, {
      async appendText() {
        // noop
      },
    });

    using tx = makeMockTx();
    vi.spyOn(db.replicache, `query`).mockImplementation(async (fn) => fn(tx));
    // const query = t.mock.method(db.replicache, `query`);
    // query.mock.mockImplementation(async (fn) => fn(tx));

    const checkPoint = new CheckpointLog();

    vi.spyOn(tx, `scan`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementationOnce((options: any): any => {
        checkPoint.log(`tx.scan 0`);
        assert.deepEqual(options, {
          prefix: `text/abc:`,
          start: undefined,
        });
        return {
          async *entries() {
            const value = [
              `text/abc:1.`,
              { id: `abc`, id2: `1`, b: `hello world` },
            ];
            yield await Promise.resolve(value);
          },
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementationOnce((options: any): any => {
        checkPoint.log(`tx.scan 1`);
        assert.deepEqual(options, {
          prefix: `text/abc:`,
          start: {
            exclusive: true,
            key: `text/abc:1.`,
          },
        });
        return {
          async *entries() {
            return;
          },
        };
      });

    for await (const result of db.queryPaged.text.scan({ id: `abc` })) {
      checkPoint.log(`loop`);
      assert.deepEqual(result, [
        `text/abc:1.`,
        { id: `abc`, id2: `1`, body: `hello world` },
      ]);
    }

    checkPoint.assert(`tx.scan 0`, `loop`, `tx.scan 1`);
  });
});

test(`replicache() index scan`, async () => {
  const schema = {
    version: `1`,
    text: r.entity(`text/[id]`, {
      id: r.string(),
      body: r.string(`b`).indexed(`byBody`),
    }),
    appendText: r
      .mutator({
        id: r.string(),
        text: r.string(),
      })
      .alias(`at`),
  };

  await using db = r.replicache(testReplicacheOptions(), schema, {
    async appendText(db, options) {
      const { id } = options;
      const existing = await db.text.get({ id });

      await db.text.set(
        { id },
        { id, body: (existing?.body ?? ``) + options.text },
      );
    },
  });

  await db.mutate.appendText({ id: `1`, text: `aaa` });
  await db.mutate.appendText({ id: `2`, text: `bbb` });

  await db.replicache.query(async (tx) => {
    const results: unknown[] = [];
    for await (const counter of db.query.text.byBody(tx)) {
      results.push(counter);
    }
    assert.deepEqual(results, [
      [`text/1`, { id: `1`, body: `aaa` }, `aaa`],
      [`text/2`, { id: `2`, body: `bbb` }, `bbb`],
    ]);
  });
});

test(`replicache() index scan functional test`, async () => {
  const schema = {
    version: `1`,
    text: r.entity(`text/[id]`, {
      id: r.string(),
      tag: r.string(`b`).indexed(`byTag`),
    }),
    upsertText: r.mutator({
      id: r.string(),
      tag: r.string(),
    }),
  };

  await using db = r.replicache(testReplicacheOptions(), schema, {
    async upsertText(db, options) {
      const { id, tag } = options;
      await db.text.set({ id }, { id, tag });
    },
  });

  // Test that the paged index scan correctly works when there are more items
  // than the page size (50). This makes sure it paginates internally properly.
  const tag1 = `aaa`;
  const tag1Items: { id: string; tag: string }[] = [];
  for (let i = 0; i < 120; i++) {
    tag1Items.push({ id: `${i}`, tag: tag1 });
  }
  const otherItems = [];
  for (let i = 120; i < 300; i++) {
    otherItems.push({ id: `${i}`, tag: nanoid() });
  }
  const allItems = shuffle([...tag1Items, ...otherItems]);
  // Insert the items shuffled so that we don't rely on the order of insertion
  // and instead are testing the index actually works.
  for (const item of allItems) {
    await db.mutate.upsertText(item);
  }

  // Test index scan (unpaged)
  await db.replicache.query(async (tx) => {
    const results: unknown[] = [];
    for await (const [_key, item] of db.query.text.byTag(tx, tag1)) {
      results.push(item);
    }
    assert.deepEqual(new Set(results), new Set(tag1Items));
  });

  // Test index scan (paged)
  {
    const results: unknown[] = [];
    for await (const [_key, item] of db.queryPaged.text.byTag(tag1)) {
      results.push(item);
    }
    assert.deepEqual(new Set(results), new Set(tag1Items));
  }

  // Test entity scan (unpaged)
  await db.replicache.query(async (tx) => {
    const results: unknown[] = [];
    for await (const [_key, item] of db.query.text.scan(tx)) {
      results.push(item);
    }
    assert.deepEqual(new Set(results), new Set(allItems));
  });

  // Test entity scan (paged)
  {
    const results: unknown[] = [];
    for await (const [_key, item] of db.queryPaged.text.scan()) {
      results.push(item);
    }
    assert.deepEqual(new Set(results), new Set(allItems));
  }
});

test(`replicache() index scan supports starting from non-existent values`, async () => {
  const schema = {
    version: `1`,
    text: r.entity(`text/[id]`, {
      id: r.string(),
      tag: r.string(`b`).indexed(`byTag`),
    }),
    upsertText: r.mutator({
      id: r.string(),
      tag: r.string(),
    }),
  };

  await using db = r.replicache(testReplicacheOptions(), schema, {
    async upsertText(db, options) {
      const { id, tag } = options;
      await db.text.set({ id }, { id, tag });
    },
  });

  const allItems = shuffle([
    { id: `1`, tag: `1` },
    { id: `2`, tag: `2` },
    { id: `4`, tag: `4` },
    { id: `5`, tag: `5` },
  ]);

  // Insert the items shuffled so that we don't rely on the order of insertion
  // and instead are testing the index actually works.
  for (const item of allItems) {
    await db.mutate.upsertText(item);
  }

  // Index scan (unpaged)
  await db.replicache.query(async (tx) => {
    assert.deepEqual(
      new Set(
        await db.query.text
          .byTag(tx, `3`, false)
          .toArray()
          .then((x) => x.map((x) => x[1])),
      ),
      new Set([
        { id: `4`, tag: `4` },
        { id: `5`, tag: `5` },
      ]),
    );
  });

  // Index scan (paged)
  assert.deepEqual(
    new Set(
      await db.queryPaged.text
        .byTag(`3`, false)
        .toArray()
        .then((items) => items.map((x) => x[1])),
    ),
    new Set([
      { id: `4`, tag: `4` },
      { id: `5`, tag: `5` },
    ]),
  );
});

test(`number()`, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    count: r.number(`c`),
  });

  using tx = makeMockTx();
  const setSpy = vi.spyOn(tx, `set`);

  // Marshal and unmarshal round tripping
  const id = `1`;
  await posts.set(tx, { id }, { id, count: 5 });
  const [, marshaledData] = setSpy.mock.calls[0]!;
  assert.deepEqual(marshaledData, { c: 5, id });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => marshaledData);
  await expect(posts.get(tx, { id })).resolves.toEqual({ id, count: 5 });
});

test(`literal()`, async () => {
  typeChecks(async () => {
    r.literal(1, r.number());
    r.literal(``, r.string());
    // @ts-expect-error string isn't compatible with number
    r.literal(`abc`, r.number());

    using tx = makeMockTx();

    {
      const e = r.entity(`foo`, { number: r.literal(1, r.number()) });

      // .set()
      await e.set(tx, { id: `1` }, { number: 1 });
      // @ts-expect-error 2 isn't literally 1
      await e.set(tx, { id: `1` }, { number: 2 });

      // .get()
      const v1 = await e.get(tx, { id: `1` });
      true satisfies IsEqual<typeof v1, { number: 1 } | undefined>;
    }

    {
      const e = r.entity(`foo`, { string: r.literal(`1`, r.string()) });

      // .set()
      await e.set(tx, { id: `1` }, { string: `1` });
      // @ts-expect-error '2' isn't literally '1'
      await e.set(tx, { id: `1` }, { string: `2` });

      // .get()
      const v1 = await e.get(tx, { id: `1` });
      true satisfies IsEqual<typeof v1, { string: `1` } | undefined>;
    }
  });

  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    count: r.literal(5, r.number()).alias(`c`),
  });

  using tx = makeMockTx();
  const setSpy = vi.spyOn(tx, `set`);

  // Marshal and unmarshal round tripping
  const id = `1`;
  await posts.set(tx, { id }, { id, count: 5 });
  const [, marshaledData] = setSpy.mock.calls[0]!;
  assert.deepEqual(marshaledData, { c: 5, id });

  vi.spyOn(tx, `get`).mockImplementationOnce(async () => marshaledData);
  await expect(posts.get(tx, { id })).resolves.toEqual({ id, count: 5 });
});

typeChecks<RizzleIndexTypes<never>>(() => {
  true satisfies IsEqual<
    RizzleIndexTypes<RizzleIndexed<RizzleCustom<Date, string>, `byDate`>>,
    { byDate: Date }
  >;

  true satisfies IsEqual<
    RizzleIndexTypes<
      RizzleObject<{
        id: RizzleCustom<string, string>;
        date: RizzleIndexed<RizzleCustom<Date, string>, `byDate`>;
        name: RizzleIndexed<RizzleCustom<number, string>, `byNumber`>;
      }>
    >,
    {
      byDate: Date;
      byNumber: number;
    }
  >;
});

typeChecks(`.indexed() not allowed a non-string marshaling properties`, () => {
  // @ts-expect-error can't index numbers
  r.number().indexed(`c`);
  // @ts-expect-error can't index literal number
  r.literal(5, r.number()).indexed(`c`);

  // can strings
  r.string().indexed(`c`);
  // can index literal strings
  r.literal(`5`, r.string()).indexed(`c`);
  // can index enum with string values
  {
    const colorsSchema = z.enum([`RED`, `BLUE`]);
    const Colors = colorsSchema.enum;
    r.enum(Colors, {
      [Colors.RED]: `r`,
      [Colors.BLUE]: `b`,
    });
  }
});

typeChecks<RizzleObjectInput<never>>(() => {
  type RawShape = {
    id: RizzleCustom<string, string>;
    date: RizzleCustom<Date, string>;
    optional: RizzleOptional<RizzleCustom<string, string>>;
  };

  true satisfies IsEqual<
    RizzleObjectInput<RawShape>,
    { id: string; date: Date; optional?: string | undefined }
  >;

  true satisfies IsEqual<
    RizzleObject<RawShape>[`_input`],
    { id: string; date: Date; optional?: string | undefined }
  >;
});

typeChecks<RizzleObjectMarshaled<never>>(() => {
  type RawShape = {
    id: RizzleCustom<string, number, string>;
    date: RizzleCustom<Date, number, string>;
    optional: RizzleOptional<RizzleCustom<string, string>>;
  };

  true satisfies IsEqual<
    RizzleObjectMarshaled<RawShape>,
    { id: number; date: number; optional?: string | undefined }
  >;

  true satisfies IsEqual<
    RizzleObject<RawShape>[`_marshaled`],
    { id: number; date: number; optional?: string | undefined }
  >;
});

typeChecks<RizzleObjectOutput<never>>(() => {
  type RawShape = {
    id: RizzleCustom<string, number, string>;
    date: RizzleCustom<Date, number, string>;
    optional: RizzleOptional<RizzleCustom<string, string>>;
  };

  true satisfies IsEqual<
    RizzleObjectOutput<RawShape>,
    { id: string; date: string; optional?: string | undefined }
  >;

  true satisfies IsEqual<
    RizzleObject<RawShape>[`_output`],
    { id: string; date: string; optional?: string | undefined }
  >;
});

test(
  `keyPathVariableNames()` satisfies HasNameOf<typeof keyPathVariableNames>,
  () => {
    assert.deepEqual(keyPathVariableNames(`foo/[id]`), [`id`]);
    assert.deepEqual(keyPathVariableNames(`foo/[id]/[bar]`), [`id`, `bar`]);
  },
);

typeChecks<ExtractVariableNames<never>>(() => {
  true satisfies IsEqual<ExtractVariableNames<`a[b]`>, `b`>;
  true satisfies IsEqual<ExtractVariableNames<`a[b][c]`>, `b` | `c`>;
  true satisfies IsEqual<ExtractVariableNames<`a[b][c][d]`>, `b` | `c` | `d`>;
});
