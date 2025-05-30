import type { HanziChar, HanziText } from "@/data/model";
import { UnexpectedValueError } from "@/util/types";
import { invariant } from "@haohaohow/lib/invariant";
import type { StrictExtract } from "ts-essentials";
import { z } from "zod/v4";

export type IdsNode =
  | {
      type: typeof IdsOperator.LeftToRight;
      left: IdsNode;
      right: IdsNode;
    }
  | {
      type: typeof IdsOperator.AboveToBelow;
      above: IdsNode;
      below: IdsNode;
    }
  | {
      type: typeof IdsOperator.LeftToMiddleToRight;
      left: IdsNode;
      middle: IdsNode;
      right: IdsNode;
    }
  | {
      type: typeof IdsOperator.AboveToMiddleAndBelow;
      above: IdsNode;
      middle: IdsNode;
      below: IdsNode;
    }
  | {
      type: typeof IdsOperator.FullSurround;
      surrounding: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromAbove;
      above: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromBelow;
      below: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromLeft;
      left: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromRight;
      right: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromUpperLeft;
      upperLeft: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromUpperRight;
      upperRight: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromLowerLeft;
      lowerLeft: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.SurroundFromLowerRight;
      lowerRight: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: typeof IdsOperator.Overlaid;
      overlay: IdsNode;
      underlay: IdsNode;
    }
  | {
      type: typeof IdsOperator.HorizontalReflection;
      reflected: IdsNode;
    }
  | {
      type: typeof IdsOperator.Rotation;
      rotated: IdsNode;
    }
  | {
      type: `LeafCharacter`;
      character: HanziChar;
    }
  | {
      type: `LeafUnknownCharacter`;
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
        return { type: IdsOperator.LeftToRight, left, right };
      }
      case IdsOperator.AboveToBelow: {
        const above = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return { type: IdsOperator.AboveToBelow, above, below };
      }
      case IdsOperator.LeftToMiddleToRight: {
        const left = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const right = parseIds(ids, cursor);
        return { type: IdsOperator.LeftToMiddleToRight, left, middle, right };
      }
      case IdsOperator.AboveToMiddleAndBelow: {
        const above = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return {
          type: IdsOperator.AboveToMiddleAndBelow,
          above,
          middle,
          below,
        };
      }
      case IdsOperator.FullSurround: {
        const surrounding = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.FullSurround, surrounding, surrounded };
      }
      case IdsOperator.SurroundFromAbove: {
        const above = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromAbove, above, surrounded };
      }
      case IdsOperator.SurroundFromBelow: {
        const below = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromBelow, below, surrounded };
      }
      case IdsOperator.SurroundFromLeft: {
        const left = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromLeft, left, surrounded };
      }
      case IdsOperator.SurroundFromRight: {
        const right = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromRight, right, surrounded };
      }
      case IdsOperator.SurroundFromUpperLeft: {
        const upperLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromUpperLeft,
          upperLeft,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromUpperRight: {
        const upperRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromUpperRight,
          upperRight,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromLowerLeft: {
        const lowerLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromLowerLeft,
          lowerLeft,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromLowerRight: {
        const lowerRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromLowerRight,
          lowerRight,
          surrounded,
        };
      }
      case IdsOperator.Overlaid: {
        const overlay = parseIds(ids, cursor);
        const underlay = parseIds(ids, cursor);
        return { type: IdsOperator.Overlaid, overlay, underlay };
      }
      case IdsOperator.HorizontalReflection: {
        const reflected = parseIds(ids, cursor);
        return { type: IdsOperator.HorizontalReflection, reflected };
      }
      case IdsOperator.Rotation: {
        const rotated = parseIds(ids, cursor);
        return { type: IdsOperator.Rotation, rotated };
      }
      default: {
        throw new Error(`unexpected combining character ${char}`);
      }
    }
  }

  const strokeCount = strokeCountPlaceholderOrNull(charCodePoint);
  if (strokeCount != null) {
    return { type: `LeafUnknownCharacter`, strokeCount };
  }

  return { type: `LeafCharacter`, character: char as HanziChar };
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
  switch (ids.type) {
    case IdsOperator.LeftToRight: {
      return `${ids.type}${idsNodeToString(ids.left)}${idsNodeToString(ids.right)}`;
    }
    case IdsOperator.AboveToBelow: {
      return `${ids.type}${idsNodeToString(ids.above)}${idsNodeToString(ids.below)}`;
    }
    case IdsOperator.LeftToMiddleToRight: {
      return `${ids.type}${idsNodeToString(ids.left)}${idsNodeToString(
        ids.middle,
      )}${idsNodeToString(ids.right)}`;
    }
    case IdsOperator.AboveToMiddleAndBelow: {
      return `${ids.type}${idsNodeToString(ids.above)}${idsNodeToString(
        ids.middle,
      )}${idsNodeToString(ids.below)}`;
    }
    case IdsOperator.FullSurround: {
      return `${ids.type}${idsNodeToString(ids.surrounding)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromAbove: {
      return `${ids.type}${idsNodeToString(ids.above)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromBelow: {
      return `${ids.type}${idsNodeToString(ids.below)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromLeft: {
      return `${ids.type}${idsNodeToString(ids.left)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromRight: {
      return `${ids.type}${idsNodeToString(ids.right)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromUpperLeft: {
      return `${ids.type}${idsNodeToString(ids.upperLeft)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromUpperRight: {
      return `${ids.type}${idsNodeToString(ids.upperRight)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromLowerLeft: {
      return `${ids.type}${idsNodeToString(ids.lowerLeft)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromLowerRight: {
      return `${ids.type}${idsNodeToString(ids.lowerRight)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.Overlaid: {
      return `${ids.type}${idsNodeToString(ids.overlay)}${idsNodeToString(ids.underlay)}`;
    }
    case IdsOperator.HorizontalReflection: {
      return `${ids.type}${idsNodeToString(ids.reflected)}`;
    }
    case IdsOperator.Rotation: {
      return `${ids.type}${idsNodeToString(ids.rotated)}`;
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
  if (ids.type === IdsOperator.AboveToBelow) {
    if (ids.above.type === IdsOperator.AboveToBelow) {
      return {
        type: IdsOperator.AboveToMiddleAndBelow,
        above: flattenIds(ids.above.above),
        middle: flattenIds(ids.above.below),
        below: flattenIds(ids.below),
      };
    } else if (ids.below.type === IdsOperator.AboveToBelow) {
      return {
        type: IdsOperator.AboveToMiddleAndBelow,
        above: flattenIds(ids.above),
        middle: flattenIds(ids.below.above),
        below: flattenIds(ids.below.below),
      };
    }
  } else if (ids.type === IdsOperator.LeftToRight) {
    if (ids.left.type === IdsOperator.LeftToRight) {
      return {
        type: IdsOperator.LeftToMiddleToRight,
        left: flattenIds(ids.left.left),
        middle: flattenIds(ids.left.right),
        right: flattenIds(ids.right),
      };
    } else if (ids.right.type === IdsOperator.LeftToRight) {
      return {
        type: IdsOperator.LeftToMiddleToRight,
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
    { type: `LeafCharacter` } | { type: `LeafUnknownCharacter` }
  >
> {
  switch (ids.type) {
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

export function splitHanziText(hanziText: HanziText | HanziChar): HanziChar[] {
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  return [...hanziText] as HanziChar[];
}

export function strokeCountToCharacter(strokeCount: number): string {
  return String.fromCodePoint(strokeCount + 9311);
}

export const radicalStrokes = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
];
