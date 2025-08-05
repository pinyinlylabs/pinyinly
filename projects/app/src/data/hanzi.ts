import type { HanziGrapheme, HanziText } from "@/data/model";
import { UnexpectedValueError } from "@pinyinly/lib/types";
import { graphemeCount, splitGraphemes } from "@/util/unicode";
import { invariant } from "@pinyinly/lib/invariant";
import type { StrictExtract } from "ts-essentials";
import { z } from "zod/v4";

export type IdsNode =
  | {
      operator: typeof IdsOperator.LeftToRight;
      left: IdsNode;
      right: IdsNode;
    }
  | {
      operator: typeof IdsOperator.AboveToBelow;
      above: IdsNode;
      below: IdsNode;
    }
  | {
      operator: typeof IdsOperator.LeftToMiddleToRight;
      left: IdsNode;
      middle: IdsNode;
      right: IdsNode;
    }
  | {
      operator: typeof IdsOperator.AboveToMiddleAndBelow;
      above: IdsNode;
      middle: IdsNode;
      below: IdsNode;
    }
  | {
      operator: typeof IdsOperator.FullSurround;
      surrounding: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromAbove;
      above: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromBelow;
      below: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromLeft;
      left: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromRight;
      right: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromUpperLeft;
      upperLeft: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromUpperRight;
      upperRight: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromLowerLeft;
      lowerLeft: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.SurroundFromLowerRight;
      lowerRight: IdsNode;
      surrounded: IdsNode;
    }
  | {
      operator: typeof IdsOperator.Overlaid;
      overlay: IdsNode;
      underlay: IdsNode;
    }
  | {
      operator: typeof IdsOperator.HorizontalReflection;
      reflected: IdsNode;
    }
  | {
      operator: typeof IdsOperator.Rotation;
      rotated: IdsNode;
    }
  | {
      operator: `LeafCharacter`;
      character: HanziGrapheme;
    }
  | {
      operator: `LeafUnknownCharacter`;
      strokeCount: number;
    };

const idsOperatorSchema = z.enum({
  LeftToRight: `⿰`,
  AboveToBelow: `⿱`,
  LeftToMiddleToRight: `⿲`,
  AboveToMiddleAndBelow: `⿳`,
  FullSurround: `⿴`,
  SurroundFromAbove: `⿵`,
  SurroundFromBelow: `⿶`,
  SurroundFromLeft: `⿷`,
  SurroundFromRight: `⿼`,
  SurroundFromUpperLeft: `⿸`,
  SurroundFromUpperRight: `⿹`,
  SurroundFromLowerLeft: `⿺`,
  SurroundFromLowerRight: `⿽`,
  Overlaid: `⿻`,
  HorizontalReflection: `⿾`,
  Rotation: `⿿`,
});

const IdsOperator = idsOperatorSchema.enum;
type IdsOperator = z.infer<typeof idsOperatorSchema>;

export { IdsOperator };

export function parseIds(ids: string, cursor?: { index: number }): IdsNode {
  cursor ??= { index: 0 };
  const charCodePoint = ids.codePointAt(cursor.index);
  invariant(charCodePoint != null);
  const char = String.fromCodePoint(charCodePoint);
  cursor.index += char.length;

  if (charCodePoint >= /* ⿰ */ 12_272 && charCodePoint <= /* ⿿ */ 12_287) {
    const operator = idsOperatorSchema.parse(char);
    switch (operator) {
      case IdsOperator.LeftToRight: {
        const left = parseIds(ids, cursor);
        const right = parseIds(ids, cursor);
        return { operator: IdsOperator.LeftToRight, left, right };
      }
      case IdsOperator.AboveToBelow: {
        const above = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return { operator: IdsOperator.AboveToBelow, above, below };
      }
      case IdsOperator.LeftToMiddleToRight: {
        const left = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const right = parseIds(ids, cursor);
        return {
          operator: IdsOperator.LeftToMiddleToRight,
          left,
          middle,
          right,
        };
      }
      case IdsOperator.AboveToMiddleAndBelow: {
        const above = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return {
          operator: IdsOperator.AboveToMiddleAndBelow,
          above,
          middle,
          below,
        };
      }
      case IdsOperator.FullSurround: {
        const surrounding = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.FullSurround,
          surrounding,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromAbove: {
        const above = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.SurroundFromAbove,
          above,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromBelow: {
        const below = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.SurroundFromBelow,
          below,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromLeft: {
        const left = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { operator: IdsOperator.SurroundFromLeft, left, surrounded };
      }
      case IdsOperator.SurroundFromRight: {
        const right = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.SurroundFromRight,
          right,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromUpperLeft: {
        const upperLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.SurroundFromUpperLeft,
          upperLeft,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromUpperRight: {
        const upperRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.SurroundFromUpperRight,
          upperRight,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromLowerLeft: {
        const lowerLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.SurroundFromLowerLeft,
          lowerLeft,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromLowerRight: {
        const lowerRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          operator: IdsOperator.SurroundFromLowerRight,
          lowerRight,
          surrounded,
        };
      }
      case IdsOperator.Overlaid: {
        const overlay = parseIds(ids, cursor);
        const underlay = parseIds(ids, cursor);
        return { operator: IdsOperator.Overlaid, overlay, underlay };
      }
      case IdsOperator.HorizontalReflection: {
        const reflected = parseIds(ids, cursor);
        return { operator: IdsOperator.HorizontalReflection, reflected };
      }
      case IdsOperator.Rotation: {
        const rotated = parseIds(ids, cursor);
        return { operator: IdsOperator.Rotation, rotated };
      }
      default: {
        throw new Error(`unexpected combining character ${char}`);
      }
    }
  }

  const strokeCount = strokeCountPlaceholderOrNull(charCodePoint);
  if (strokeCount != null) {
    return { operator: `LeafUnknownCharacter`, strokeCount };
  }

  return { operator: `LeafCharacter`, character: char as HanziGrapheme };
}

export function strokeCountPlaceholderOrNull(
  charOrCharPoint: string | number,
): number | undefined {
  const charCodePoint =
    typeof charOrCharPoint === `string`
      ? charOrCharPoint.codePointAt(0)
      : charOrCharPoint;
  invariant(charCodePoint != null);
  if (charCodePoint >= /* ① */ 9312 && charCodePoint <= /* ⑳ */ 9331) {
    return charCodePoint - 9311;
  }
}

export function idsNodeToString(ids: IdsNode): string {
  switch (ids.operator) {
    case IdsOperator.LeftToRight: {
      return `${ids.operator}${idsNodeToString(ids.left)}${idsNodeToString(ids.right)}`;
    }
    case IdsOperator.AboveToBelow: {
      return `${ids.operator}${idsNodeToString(ids.above)}${idsNodeToString(ids.below)}`;
    }
    case IdsOperator.LeftToMiddleToRight: {
      return `${ids.operator}${idsNodeToString(ids.left)}${idsNodeToString(
        ids.middle,
      )}${idsNodeToString(ids.right)}`;
    }
    case IdsOperator.AboveToMiddleAndBelow: {
      return `${ids.operator}${idsNodeToString(ids.above)}${idsNodeToString(
        ids.middle,
      )}${idsNodeToString(ids.below)}`;
    }
    case IdsOperator.FullSurround: {
      return `${ids.operator}${idsNodeToString(ids.surrounding)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromAbove: {
      return `${ids.operator}${idsNodeToString(ids.above)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromBelow: {
      return `${ids.operator}${idsNodeToString(ids.below)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromLeft: {
      return `${ids.operator}${idsNodeToString(ids.left)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromRight: {
      return `${ids.operator}${idsNodeToString(ids.right)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromUpperLeft: {
      return `${ids.operator}${idsNodeToString(ids.upperLeft)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromUpperRight: {
      return `${ids.operator}${idsNodeToString(ids.upperRight)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromLowerLeft: {
      return `${ids.operator}${idsNodeToString(ids.lowerLeft)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromLowerRight: {
      return `${ids.operator}${idsNodeToString(ids.lowerRight)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.Overlaid: {
      return `${ids.operator}${idsNodeToString(ids.overlay)}${idsNodeToString(ids.underlay)}`;
    }
    case IdsOperator.HorizontalReflection: {
      return `${ids.operator}${idsNodeToString(ids.reflected)}`;
    }
    case IdsOperator.Rotation: {
      return `${ids.operator}${idsNodeToString(ids.rotated)}`;
    }
    case `LeafCharacter`: {
      return ids.character;
    }
    case `LeafUnknownCharacter`: {
      return strokeCountToCharacter(ids.strokeCount);
    }
  }
}

/**
 * Remove unnecessary nesting in an IDS tree.
 *
 * For example `⿰x⿰yz` can be flattened to `⿲xyz`.
 */
export function flattenIds(ids: IdsNode): IdsNode {
  if (ids.operator === IdsOperator.AboveToBelow) {
    if (ids.above.operator === IdsOperator.AboveToBelow) {
      return {
        operator: IdsOperator.AboveToMiddleAndBelow,
        above: flattenIds(ids.above.above),
        middle: flattenIds(ids.above.below),
        below: flattenIds(ids.below),
      };
    } else if (ids.below.operator === IdsOperator.AboveToBelow) {
      return {
        operator: IdsOperator.AboveToMiddleAndBelow,
        above: flattenIds(ids.above),
        middle: flattenIds(ids.below.above),
        below: flattenIds(ids.below.below),
      };
    }
  } else if (ids.operator === IdsOperator.LeftToRight) {
    if (ids.left.operator === IdsOperator.LeftToRight) {
      return {
        operator: IdsOperator.LeftToMiddleToRight,
        left: flattenIds(ids.left.left),
        middle: flattenIds(ids.left.right),
        right: flattenIds(ids.right),
      };
    } else if (ids.right.operator === IdsOperator.LeftToRight) {
      return {
        operator: IdsOperator.LeftToMiddleToRight,
        left: flattenIds(ids.left),
        middle: flattenIds(ids.right.left),
        right: flattenIds(ids.right.right),
      };
    }
  }
  return ids;
}

export function* walkIdsNode(
  ids: IdsNode,
): Generator<
  StrictExtract<
    IdsNode,
    { operator: `LeafCharacter` } | { operator: `LeafUnknownCharacter` }
  >
> {
  switch (ids.operator) {
    case IdsOperator.LeftToRight: {
      yield* walkIdsNode(ids.left);
      yield* walkIdsNode(ids.right);
      return;
    }
    case IdsOperator.AboveToBelow: {
      yield* walkIdsNode(ids.above);
      yield* walkIdsNode(ids.below);
      return;
    }
    case IdsOperator.LeftToMiddleToRight: {
      yield* walkIdsNode(ids.left);
      yield* walkIdsNode(ids.middle);
      yield* walkIdsNode(ids.right);
      return;
    }
    case IdsOperator.AboveToMiddleAndBelow: {
      yield* walkIdsNode(ids.above);
      yield* walkIdsNode(ids.middle);
      yield* walkIdsNode(ids.below);
      return;
    }
    case IdsOperator.FullSurround: {
      yield* walkIdsNode(ids.surrounding);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromAbove: {
      yield* walkIdsNode(ids.above);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromBelow: {
      yield* walkIdsNode(ids.below);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLeft: {
      yield* walkIdsNode(ids.left);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromRight: {
      yield* walkIdsNode(ids.right);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromUpperLeft: {
      yield* walkIdsNode(ids.upperLeft);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromUpperRight: {
      yield* walkIdsNode(ids.upperRight);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLowerLeft: {
      yield* walkIdsNode(ids.lowerLeft);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLowerRight: {
      yield* walkIdsNode(ids.lowerRight);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.Overlaid: {
      yield* walkIdsNode(ids.underlay);
      yield* walkIdsNode(ids.overlay);
      return;
    }
    case IdsOperator.HorizontalReflection: {
      yield* walkIdsNode(ids.reflected);
      return;
    }
    case IdsOperator.Rotation: {
      yield* walkIdsNode(ids.rotated);
      return;
    }
    case `LeafCharacter`:
    case `LeafUnknownCharacter`: {
      yield ids;
      return;
    }
    default: {
      throw new UnexpectedValueError(ids);
    }
  }
}

export function splitHanziText(hanziText: HanziText): HanziGrapheme[] {
  return splitGraphemes(hanziText) as HanziGrapheme[];
}

export function strokeCountToCharacter(strokeCount: number): string {
  return String.fromCodePoint(strokeCount + 9311);
}

export const radicalStrokes = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
];

export function isHanziGrapheme(hanzi: HanziText): hanzi is HanziGrapheme {
  return hanziGraphemeCount(hanzi) === 1;
}

export function hanziGraphemeCount(hanziText: HanziText): number {
  return graphemeCount(hanziText);
}
