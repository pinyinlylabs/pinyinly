import { isRedundantSelfDecomposition } from "#client/ui/WikiHanziCharacterDecompositionComponents.utils.ts";
import type {
  HanziCharacter,
  IdsNode,
  WikiCharacterComponent,
} from "#data/model.ts";
import { describe, expect, test } from "vitest";

function hc(value: string): HanziCharacter {
  return value as HanziCharacter;
}

describe(`WikiHanziCharacterDecompositionComponents utils`, () => {
  test(`detects direct self decomposition leaf`, () => {
    const childNode: IdsNode<WikiCharacterComponent> = {
      hanzi: hc(`口`),
      strokes: `0-2`,
    };

    expect(
      isRedundantSelfDecomposition({
        childNode,
        componentHanzi: hc(`口`),
      }),
    ).toBe(true);
  });

  test(`does not treat a different leaf as redundant`, () => {
    const childNode: IdsNode<WikiCharacterComponent> = {
      hanzi: hc(`讠`),
      strokes: `0-1`,
    };

    expect(
      isRedundantSelfDecomposition({
        childNode,
        componentHanzi: hc(`口`),
      }),
    ).toBe(false);
  });

  test(`does not treat non-leaf nodes as redundant`, () => {
    const childNode: IdsNode<WikiCharacterComponent> = [
      `⿰`,
      {
        hanzi: hc(`讠`),
        strokes: `0-1`,
      },
      {
        hanzi: hc(`口`),
        strokes: `2-4`,
      },
    ];

    expect(
      isRedundantSelfDecomposition({
        childNode,
        componentHanzi: hc(`口`),
      }),
    ).toBe(false);
  });
});
