import {
  getHighestScoreLocationThoughtChainForSound,
  getHighestScoreLocationThoughtChain,
  pinyinSoundLocationThoughtChainSchema,
  pinyinSoundLocationThoughtChainsSchema,
} from "#client/ui/hooks/usePinyinSoundLocations.ts";
import type { PinyinSoundId } from "#data/model.ts";
import type { PinyinSoundLocationThoughtChainType } from "#client/ui/hooks/usePinyinSoundLocations.ts";
import { describe, expect, test } from "vitest";

describe(`getHighestScoreLocationThoughtChain`, () => {
  test(`returns null when there are no thought chains`, () => {
    expect(getHighestScoreLocationThoughtChain([])).toBeNull();
  });

  test(`returns the thought chain with the highest score`, () => {
    const thoughtChains: PinyinSoundLocationThoughtChainType[] = [
      {
        path: [
          { anchor: `-ong`, reason: null },
          { anchor: `gong`, reason: `close pronunciation` },
          { anchor: `Temple`, reason: `gong belongs in temple` },
        ],
        score: 65,
        strengths: [`short`],
        weaknesses: [],
      },
      {
        path: [
          { anchor: `-ong`, reason: null },
          { anchor: `song`, reason: `close pronunciation` },
          { anchor: `Temple`, reason: `song echoes in temple` },
        ],
        score: 92,
        strengths: [`vivid`],
        weaknesses: [],
      },
    ];

    expect(getHighestScoreLocationThoughtChain(thoughtChains)).toEqual(
      thoughtChains[1],
    );
  });

  test(`keeps the first chain when top scores are tied`, () => {
    const thoughtChains: PinyinSoundLocationThoughtChainType[] = [
      {
        path: [
          { anchor: `-ong`, reason: null },
          { anchor: `gong`, reason: `close pronunciation` },
          { anchor: `Temple`, reason: `gong belongs in temple` },
        ],
        score: 90,
        strengths: [],
        weaknesses: [`approximate vowel`],
      },
      {
        path: [
          { anchor: `-ong`, reason: null },
          { anchor: `long`, reason: `close pronunciation` },
          { anchor: `Temple`, reason: `long gong in temple` },
        ],
        score: 90,
        strengths: [],
        weaknesses: [],
      },
    ];

    expect(getHighestScoreLocationThoughtChain(thoughtChains)).toEqual(
      thoughtChains[0],
    );
  });
});

describe(`getHighestScoreLocationThoughtChainForSound`, () => {
  test(`returns null for non-final sound ids`, () => {
    const result = getHighestScoreLocationThoughtChainForSound(
      { thoughtChainsBySoundId: { "-ong": [] } },
      `zh-` as PinyinSoundId,
    );

    expect(result).toBeNull();
  });

  test(`returns highest-scoring candidate for selected final sound`, () => {
    const result = getHighestScoreLocationThoughtChainForSound(
      {
        thoughtChainsBySoundId: {
          "-ong": [
            {
              path: [
                { anchor: `-ong`, reason: null },
                { anchor: `gong`, reason: `close pronunciation` },
                { anchor: `Temple`, reason: `gong belongs in temple` },
              ],
              score: 80,
              strengths: [],
              weaknesses: [],
            },
            {
              path: [
                { anchor: `-ong`, reason: null },
                { anchor: `long gong`, reason: `echoes -ong` },
                { anchor: `Temple`, reason: `ritual object in temple` },
              ],
              score: 90,
              strengths: [],
              weaknesses: [],
            },
          ],
          "-ang": [
            {
              path: [
                { anchor: `-ang`, reason: null },
                { anchor: `fang`, reason: `close pronunciation` },
                { anchor: `Temple`, reason: `fang guards temple` },
              ],
              score: 99,
              strengths: [],
              weaknesses: [],
            },
          ],
        },
      },
      `-ong` as PinyinSoundId,
    );

    expect(result?.score).toBe(90);
    expect(result?.path[1]?.anchor).toBe(`long gong`);
  });
});

describe(`pinyinSoundLocationThoughtChainsSchema`, () => {
  test(`accepts valid thought chain arrays`, () => {
    const result = pinyinSoundLocationThoughtChainsSchema.safeParse([
      {
        path: [
          { anchor: `-ong`, reason: null },
          {
            anchor: `Giant gong`,
            reason: `-ong echoes the ringing of a gong.`,
          },
          { anchor: `Jungle Temple`, reason: `A giant gong fits in a temple.` },
        ],
        score: 92,
        strengths: [`Simple path`],
        weaknesses: [`Approximate vowel`],
      },
    ]);

    expect(result.success).toBe(true);
  });

  test(`rejects thought chains with an empty anchor`, () => {
    const result = pinyinSoundLocationThoughtChainSchema.safeParse({
      path: [{ anchor: `` }],
      score: 92,
      strengths: [],
      weaknesses: [],
    });

    expect(result.success).toBe(false);
  });
});
