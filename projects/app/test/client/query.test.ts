import {
  wikiPayloadSchema,
  hanziSvgPathsQueryWeb,
  hanziSvgPathsQueryNative,
  wikiPayloadQueryWeb,
  wikiPayloadQueryNative,
  skipQuery,
} from "#client/query.js";
import { hanziCharacterSchema } from "#data/model.ts";
import type { HanziCharacter, HanziText } from "#data/model.ts";
import { QueryClient, QueryObserver, skipToken } from "@tanstack/react-query";
import { describe, expect, expectTypeOf, test as unitTest, vi } from "vitest";

unitTest(`skipQuery preserves the data type without starting a fetch`, () => {
  const queryClient = new QueryClient();
  const options = skipQuery<{ value: string }>();
  const observer = new QueryObserver(queryClient, options);
  const unsubscribe = observer.subscribe(vi.fn());
  try {
    const result = observer.getCurrentResult();
    expectTypeOf(result.data).toEqualTypeOf<{ value: string } | undefined>();
    expect(options.queryFn).toBe(skipToken);
    expect(result.data).toBeUndefined();
    expect(result.fetchStatus).toBe(`idle`);
    expect(result.isLoading).toBe(false);
    expect(queryClient.isFetching()).toBe(0);
  } finally {
    unsubscribe();
    queryClient.clear();
  }
});

describe(`character asset queries`, () => {
  unitTest.for([hanziSvgPathsQueryWeb, hanziSvgPathsQueryNative])(
    `requires a non-null character`,
    (query) => {
      expectTypeOf(query).parameter(0).toEqualTypeOf<HanziCharacter>();
    },
  );

  unitTest.for([
    hanziSvgPathsQueryWeb,
    hanziSvgPathsQueryNative,
    wikiPayloadQueryWeb,
    wikiPayloadQueryNative,
  ])(`always supplies a query function`, (query) => {
    expect(typeof query(hanziCharacterSchema.parse(`好`)).queryFn).toBe(
      `function`,
    );
  });

  unitTest.for([wikiPayloadQueryWeb, wikiPayloadQueryNative])(
    `requires non-null hanzi`,
    (query) => {
      expectTypeOf(query).parameter(0).toEqualTypeOf<HanziText>();
    },
  );

  unitTest(
    `web queries retain paths, parsed data, and cache keys`,
    async () => {
      const hanzi = hanziCharacterSchema.parse(`好`);
      const strokeData = { strokes: [`path`], medians: [`median`] };
      const wikiData = { visuallySimilar: [hanzi] };
      const fetch = vi
        .spyOn(globalThis, `fetch`)
        .mockResolvedValueOnce(Response.json(strokeData))
        .mockResolvedValueOnce(Response.json(wikiData));
      const queryClient = new QueryClient();
      try {
        const strokeOptions = hanziSvgPathsQueryWeb(hanzi);
        const wikiOptions = wikiPayloadQueryWeb(hanzi);
        expect(await queryClient.query(strokeOptions)).toEqual(strokeData);
        expect(await queryClient.query(wikiOptions)).toEqual(wikiData);
        expect(queryClient.getQueryData([`hanziSvgPaths`, hanzi])).toEqual(
          strokeData,
        );
        expect(queryClient.getQueryData([`wikiPayload`, hanzi])).toEqual(
          wikiData,
        );
        expect(strokeOptions.staleTime).toBe(Infinity);
        expect(wikiOptions.staleTime).toBe(Infinity);
        expect(fetch).toHaveBeenNthCalledWith(
          1,
          `/raw/svgs/${encodeURIComponent(hanzi)}.json`,
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(fetch).toHaveBeenNthCalledWith(
          2,
          `/raw/wiki/${encodeURIComponent(hanzi)}.json`,
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      } finally {
        fetch.mockRestore();
        queryClient.clear();
      }
    },
  );
});

describe(`wikiPayloadSchema`, () => {
  unitTest(`accepts MDX and optional character examples`, () => {
    expect(
      wikiPayloadSchema.parse({
        mdast: { type: `root`, children: [] },
        curriculumMeanings: [
          {
            id: `兴:interest`,
            gloss: `interest`,
            pinyin: `xìng`,
            description: `To have an interest in something.`,
          },
        ],
        curriculumMeaningExamples: [
          {
            id: `兴:interest`,
            exampleSentence: {
              hanzi: `我对这个话题很感兴趣。`,
              pinyin: `wǒ duì zhège huàtí hěn gǎn xìngqù`,
              translation: `I'm very interested in this topic.`,
            },
          },
        ],
      }),
    ).toMatchObject({
      mdast: { type: `root` },
      curriculumMeanings: [
        { id: `兴:interest`, description: `To have an interest in something.` },
      ],
      curriculumMeaningExamples: [{ id: `兴:interest` }],
    });
  });

  unitTest(`accepts character meanings without an MDX article`, () => {
    expect(
      wikiPayloadSchema.safeParse({
        curriculumMeanings: [
          {
            id: `兴:interest`,
            gloss: `interest`,
            pinyin: `xìng`,
            description: `To have an interest in something.`,
          },
        ],
        curriculumMeaningExamples: [
          {
            id: `兴:interest`,
            exampleSentence: {
              hanzi: `我对这个话题很感兴趣。`,
              pinyin: `wǒ duì zhège huàtí hěn gǎn xìngqù`,
              translation: `I'm very interested in this topic.`,
            },
          },
        ],
      }).success,
    ).toBe(true);
  });

  unitTest(`rejects an empty payload`, () => {
    expect(wikiPayloadSchema.safeParse({}).success).toBe(false);
  });
});
