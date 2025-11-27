import type { HanziGrapheme, HanziText } from "@/data/model";
import { hanziTextSchema } from "@/data/model";
import { parseIndexRanges } from "@/util/indexRanges";
import { graphemeCount, splitGraphemes } from "@/util/unicode";
import { invariant } from "@pinyinly/lib/invariant";
import { UnexpectedValueError } from "@pinyinly/lib/types";
import { z } from "zod/v4";

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

const idsOperatorArity1 = z.union([
  z.literal(IdsOperator.HorizontalReflection),
  z.literal(IdsOperator.Rotation),
]);

const idsOperatorArity2 = z.union([
  z.literal(IdsOperator.LeftToRight),
  z.literal(IdsOperator.AboveToBelow),
  z.literal(IdsOperator.FullSurround),
  z.literal(IdsOperator.SurroundFromAbove),
  z.literal(IdsOperator.SurroundFromBelow),
  z.literal(IdsOperator.SurroundFromLeft),
  z.literal(IdsOperator.SurroundFromRight),
  z.literal(IdsOperator.SurroundFromUpperLeft),
  z.literal(IdsOperator.SurroundFromUpperRight),
  z.literal(IdsOperator.SurroundFromLowerLeft),
  z.literal(IdsOperator.SurroundFromLowerRight),
  z.literal(IdsOperator.Overlaid),
]);

const idsOperatorArity3 = z.union([
  z.literal(IdsOperator.LeftToMiddleToRight),
  z.literal(IdsOperator.AboveToMiddleAndBelow),
]);

export type IdsOperatorArity1 = z.infer<typeof idsOperatorArity1>;
export type IdsOperatorArity2 = z.infer<typeof idsOperatorArity2>;
export type IdsOperatorArity3 = z.infer<typeof idsOperatorArity3>;

export type IdsNode<T> =
  | [typeof IdsOperator.LeftToRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.AboveToBelow, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.LeftToMiddleToRight, IdsNode<T>, IdsNode<T>, IdsNode<T>]
  | [
      typeof IdsOperator.AboveToMiddleAndBelow,
      IdsNode<T>,
      IdsNode<T>,
      IdsNode<T>,
    ]
  | [typeof IdsOperator.FullSurround, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromAbove, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromBelow, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromLeft, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromUpperLeft, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromUpperRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromLowerLeft, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromLowerRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.Overlaid, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.HorizontalReflection, IdsNode<T>]
  | [typeof IdsOperator.Rotation, IdsNode<T>]
  | T;

// Type-safe accessor functions
export function getOperator<T>(ids: Readonly<IdsNode<T>>): string {
  return Array.isArray(ids) ? ids[0] : `Leaf`;
}

export function isLeaf<T>(ids: Readonly<IdsNode<T>>): ids is T {
  return !Array.isArray(ids);
}

// Two-child operators
export function getLeftToRightLeft<T>(
  ids: [typeof IdsOperator.LeftToRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getLeftToRightRight<T>(
  ids: [typeof IdsOperator.LeftToRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getAboveToBelowAbove<T>(
  ids: [typeof IdsOperator.AboveToBelow, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getAboveToBelowBelow<T>(
  ids: [typeof IdsOperator.AboveToBelow, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getFullSurroundSurrounding<T>(
  ids: [typeof IdsOperator.FullSurround, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getFullSurroundSurrounded<T>(
  ids: [typeof IdsOperator.FullSurround, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromAboveAbove<T>(
  ids: [typeof IdsOperator.SurroundFromAbove, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromAboveSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromAbove, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromBelowBelow<T>(
  ids: [typeof IdsOperator.SurroundFromBelow, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromBelowSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromBelow, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromLeftLeft<T>(
  ids: [typeof IdsOperator.SurroundFromLeft, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromLeftSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromLeft, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromRightRight<T>(
  ids: [typeof IdsOperator.SurroundFromRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromRightSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromUpperLeftUpperLeft<T>(
  ids: [typeof IdsOperator.SurroundFromUpperLeft, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromUpperLeftSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromUpperLeft, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromUpperRightUpperRight<T>(
  ids: [typeof IdsOperator.SurroundFromUpperRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromUpperRightSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromUpperRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromLowerLeftLowerLeft<T>(
  ids: [typeof IdsOperator.SurroundFromLowerLeft, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromLowerLeftSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromLowerLeft, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getSurroundFromLowerRightLowerRight<T>(
  ids: [typeof IdsOperator.SurroundFromLowerRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getSurroundFromLowerRightSurrounded<T>(
  ids: [typeof IdsOperator.SurroundFromLowerRight, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

export function getOverlaidOverlay<T>(
  ids: [typeof IdsOperator.Overlaid, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getOverlaidUnderlay<T>(
  ids: [typeof IdsOperator.Overlaid, IdsNode<T>, IdsNode<T>],
): IdsNode<T> {
  return ids[2];
}

// Three-child operators
export function getLeftToMiddleToRightLeft<T>(
  ids: [
    typeof IdsOperator.LeftToMiddleToRight,
    IdsNode<T>,
    IdsNode<T>,
    IdsNode<T>,
  ],
): IdsNode<T> {
  return ids[1];
}

export function getLeftToMiddleToRightMiddle<T>(
  ids: [
    typeof IdsOperator.LeftToMiddleToRight,
    IdsNode<T>,
    IdsNode<T>,
    IdsNode<T>,
  ],
): IdsNode<T> {
  return ids[2];
}

export function getLeftToMiddleToRightRight<T>(
  ids: [
    typeof IdsOperator.LeftToMiddleToRight,
    IdsNode<T>,
    IdsNode<T>,
    IdsNode<T>,
  ],
): IdsNode<T> {
  return ids[3];
}

export function getAboveToMiddleAndBelowAbove<T>(
  ids: [
    typeof IdsOperator.AboveToMiddleAndBelow,
    IdsNode<T>,
    IdsNode<T>,
    IdsNode<T>,
  ],
): IdsNode<T> {
  return ids[1];
}

export function getAboveToMiddleAndBelowMiddle<T>(
  ids: [
    typeof IdsOperator.AboveToMiddleAndBelow,
    IdsNode<T>,
    IdsNode<T>,
    IdsNode<T>,
  ],
): IdsNode<T> {
  return ids[2];
}

export function getAboveToMiddleAndBelowBelow<T>(
  ids: [
    typeof IdsOperator.AboveToMiddleAndBelow,
    IdsNode<T>,
    IdsNode<T>,
    IdsNode<T>,
  ],
): IdsNode<T> {
  return ids[3];
}

// Single-child operators
export function getHorizontalReflectionReflected<T>(
  ids: [typeof IdsOperator.HorizontalReflection, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function getRotationRotated<T>(
  ids: [typeof IdsOperator.Rotation, IdsNode<T>],
): IdsNode<T> {
  return ids[1];
}

export function parseIds(
  ids: string,
  cursor?: { index: number },
): IdsNode<string> {
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
        return [IdsOperator.LeftToRight, left, right];
      }
      case IdsOperator.AboveToBelow: {
        const above = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return [IdsOperator.AboveToBelow, above, below];
      }
      case IdsOperator.LeftToMiddleToRight: {
        const left = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const right = parseIds(ids, cursor);
        return [IdsOperator.LeftToMiddleToRight, left, middle, right];
      }
      case IdsOperator.AboveToMiddleAndBelow: {
        const above = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return [IdsOperator.AboveToMiddleAndBelow, above, middle, below];
      }
      case IdsOperator.FullSurround: {
        const surrounding = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.FullSurround, surrounding, surrounded];
      }
      case IdsOperator.SurroundFromAbove: {
        const above = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromAbove, above, surrounded];
      }
      case IdsOperator.SurroundFromBelow: {
        const below = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromBelow, below, surrounded];
      }
      case IdsOperator.SurroundFromLeft: {
        const left = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromLeft, left, surrounded];
      }
      case IdsOperator.SurroundFromRight: {
        const right = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromRight, right, surrounded];
      }
      case IdsOperator.SurroundFromUpperLeft: {
        const upperLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromUpperLeft, upperLeft, surrounded];
      }
      case IdsOperator.SurroundFromUpperRight: {
        const upperRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromUpperRight, upperRight, surrounded];
      }
      case IdsOperator.SurroundFromLowerLeft: {
        const lowerLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromLowerLeft, lowerLeft, surrounded];
      }
      case IdsOperator.SurroundFromLowerRight: {
        const lowerRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return [IdsOperator.SurroundFromLowerRight, lowerRight, surrounded];
      }
      case IdsOperator.Overlaid: {
        const overlay = parseIds(ids, cursor);
        const underlay = parseIds(ids, cursor);
        return [IdsOperator.Overlaid, overlay, underlay];
      }
      case IdsOperator.HorizontalReflection: {
        const reflected = parseIds(ids, cursor);
        return [IdsOperator.HorizontalReflection, reflected];
      }
      case IdsOperator.Rotation: {
        const rotated = parseIds(ids, cursor);
        return [IdsOperator.Rotation, rotated];
      }
      default: {
        throw new Error(`unexpected combining character ${char}`);
      }
    }
  }

  return char;
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

/**
 * Index path to an IDS node, represented as an array of child indices.
 */
export type IdsNodePath = number[];

/**
 * Remove unnecessary nesting in an IDS tree.
 *
 * For example `⿰x⿰yz` can be flattened to `⿲xyz`.
 */
export function flattenIds<T>(ids: IdsNode<T>): IdsNode<T> {
  return idsApplyTransforms(ids, [
    verticalPairToTripleMergeIdsTransform,
    horizontalPairToTripleMergeIdsTransform,
  ]);
}

export type IdsTransform<T> = (ids: IdsNode<T>) => IdsNode<T> | null;

export function idsApplyTransforms<T>(
  ids: IdsNode<T>,
  transforms: readonly IdsTransform<T>[],
): IdsNode<T> {
  let result = ids;

  for (;;) {
    let mutated = false;

    for (const transform of transforms) {
      const transformed = mapIdsNode(result, (node) => transform(node) ?? node);
      if (transformed !== result) {
        result = transformed;
        mutated = true;
      }
    }

    if (!mutated) {
      break;
    }
  }

  return result;
}

export function* walkIdsNode<T>(ids: IdsNode<T>): Generator<IdsNode<T>> {
  yield ids;

  if (!Array.isArray(ids)) {
    return;
  }

  switch (ids[0]) {
    case IdsOperator.HorizontalReflection:
    case IdsOperator.Rotation: {
      yield* walkIdsNode(ids[1]);
      return;
    }
    case IdsOperator.LeftToRight:
    case IdsOperator.AboveToBelow:
    case IdsOperator.FullSurround:
    case IdsOperator.SurroundFromAbove:
    case IdsOperator.SurroundFromBelow:
    case IdsOperator.SurroundFromLeft:
    case IdsOperator.SurroundFromRight:
    case IdsOperator.SurroundFromUpperLeft:
    case IdsOperator.SurroundFromUpperRight:
    case IdsOperator.SurroundFromLowerLeft:
    case IdsOperator.SurroundFromLowerRight:
    case IdsOperator.Overlaid: {
      yield* walkIdsNode(ids[1]);
      yield* walkIdsNode(ids[2]);
      return;
    }
    case IdsOperator.LeftToMiddleToRight:
    case IdsOperator.AboveToMiddleAndBelow: {
      yield* walkIdsNode(ids[1]);
      yield* walkIdsNode(ids[2]);
      yield* walkIdsNode(ids[3]);
      return;
    }
    default: {
      throw new UnexpectedValueError(ids);
    }
  }
}

export function mapIdsNodeLeafs<T, U>(
  ids: IdsNode<T>,
  mapFn: (leaf: T, path: IdsNodePath) => U,
  ctx?: { path: IdsNodePath },
): IdsNode<U> {
  ctx ??= { path: [] };

  try {
    if (!Array.isArray(ids)) {
      return mapFn(ids, ctx.path);
    }

    switch (ids[0]) {
      case IdsOperator.HorizontalReflection:
      case IdsOperator.Rotation: {
        const old1 = ids[1];
        const new0 = (ctx.path.push(0), mapIdsNodeLeafs(old1, mapFn, ctx));
        return new0 === old1 ? (ids as IdsNode<U>) : [ids[0], new0];
      }
      case IdsOperator.LeftToRight:
      case IdsOperator.AboveToBelow:
      case IdsOperator.FullSurround:
      case IdsOperator.SurroundFromAbove:
      case IdsOperator.SurroundFromBelow:
      case IdsOperator.SurroundFromLeft:
      case IdsOperator.SurroundFromRight:
      case IdsOperator.SurroundFromUpperLeft:
      case IdsOperator.SurroundFromUpperRight:
      case IdsOperator.SurroundFromLowerLeft:
      case IdsOperator.SurroundFromLowerRight:
      case IdsOperator.Overlaid: {
        const old1 = ids[1];
        const old2 = ids[2];
        const new0 = (ctx.path.push(0), mapIdsNodeLeafs(old1, mapFn, ctx));
        const new1 = (ctx.path.push(1), mapIdsNodeLeafs(old2, mapFn, ctx));
        return new0 === old1 && new1 === old2
          ? (ids as IdsNode<U>)
          : [ids[0], new0, new1];
      }
      case IdsOperator.LeftToMiddleToRight:
      case IdsOperator.AboveToMiddleAndBelow: {
        const old1 = ids[1];
        const old2 = ids[2];
        const old3 = ids[3];
        const new1 = (ctx.path.push(0), mapIdsNodeLeafs(old1, mapFn));
        const new2 = (ctx.path.push(1), mapIdsNodeLeafs(old2, mapFn));
        const new3 = (ctx.path.push(2), mapIdsNodeLeafs(old3, mapFn));
        return new1 === old1 && new2 === old2 && new3 === old3
          ? (ids as IdsNode<U>)
          : [ids[0], new1, new2, new3];
      }
      default: {
        throw new UnexpectedValueError(ids);
      }
    }
  } finally {
    ctx.path.pop();
  }
}

export function mapIdsNode<T>(
  ids: IdsNode<T>,
  mapFn: (node: IdsNode<T>) => IdsNode<T>,
): IdsNode<T> {
  ids = mapFn(ids);

  if (!Array.isArray(ids)) {
    return ids;
  }

  switch (ids[0]) {
    case IdsOperator.HorizontalReflection:
    case IdsOperator.Rotation: {
      const old1 = ids[1];
      const new0 = mapIdsNode(old1, mapFn);
      return new0 === old1 ? ids : [ids[0], new0];
    }
    case IdsOperator.LeftToRight:
    case IdsOperator.AboveToBelow:
    case IdsOperator.FullSurround:
    case IdsOperator.SurroundFromAbove:
    case IdsOperator.SurroundFromBelow:
    case IdsOperator.SurroundFromLeft:
    case IdsOperator.SurroundFromRight:
    case IdsOperator.SurroundFromUpperLeft:
    case IdsOperator.SurroundFromUpperRight:
    case IdsOperator.SurroundFromLowerLeft:
    case IdsOperator.SurroundFromLowerRight:
    case IdsOperator.Overlaid: {
      const old1 = ids[1];
      const old2 = ids[2];
      const new0 = mapIdsNode(old1, mapFn);
      const new1 = mapIdsNode(old2, mapFn);
      return new0 === old1 && new1 === old2 ? ids : [ids[0], new0, new1];
    }
    case IdsOperator.LeftToMiddleToRight:
    case IdsOperator.AboveToMiddleAndBelow: {
      const old1 = ids[1];
      const old2 = ids[2];
      const old3 = ids[3];
      const new1 = mapIdsNode(old1, mapFn);
      const new2 = mapIdsNode(old2, mapFn);
      const new3 = mapIdsNode(old3, mapFn);
      return new1 === old1 && new2 === old2 && new3 === old3
        ? ids
        : [ids[0], new1, new2, new3];
    }
    default: {
      throw new UnexpectedValueError(ids);
    }
  }
}

export function* walkIdsNodeLeafs<T>(ids: IdsNode<T>): Generator<T> {
  for (const n of walkIdsNode(ids)) {
    if (isLeaf(n)) {
      yield n;
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

/**
 * Merge nested `⿰` into a `⿲`, e.g.:
 *
 * - `⿰⿰xyz` → `⿲xyz`
 * - `⿰x⿰yz` → `⿲xyz`
 */
export function horizontalPairToTripleMergeIdsTransform<T>(
  ids: IdsNode<T>,
): IdsNode<T> | null {
  if (!Array.isArray(ids)) {
    return null;
  }

  if (ids[0] === IdsOperator.LeftToRight) {
    const typedIds = ids;
    const left = getLeftToRightLeft(typedIds);
    const right = getLeftToRightRight(typedIds);

    if (Array.isArray(left) && left[0] === IdsOperator.LeftToRight) {
      return [
        IdsOperator.LeftToMiddleToRight,
        getLeftToRightLeft(left),
        getLeftToRightRight(left),
        right,
      ];
    } else if (Array.isArray(right) && right[0] === IdsOperator.LeftToRight) {
      return [
        IdsOperator.LeftToMiddleToRight,
        left,
        getLeftToRightLeft(right),
        getLeftToRightRight(right),
      ];
    }
  }

  return null;
}

/**
 * Merge nested `⿱` into a `⿳`, e.g.:
 *
 * - `⿱⿱xyz` → `⿳xyz`
 * - `⿱x⿱yz` → `⿳xyz`
 */
export function verticalPairToTripleMergeIdsTransform<T>(
  ids: IdsNode<T>,
): IdsNode<T> | null {
  if (!Array.isArray(ids)) {
    return null;
  }

  if (ids[0] === IdsOperator.AboveToBelow) {
    const above = getAboveToBelowAbove(ids);
    const below = getAboveToBelowBelow(ids);

    if (Array.isArray(above) && above[0] === IdsOperator.AboveToBelow) {
      return [
        IdsOperator.AboveToMiddleAndBelow,
        getAboveToBelowAbove(above),
        getAboveToBelowBelow(above),
        below,
      ];
    } else if (Array.isArray(below) && below[0] === IdsOperator.AboveToBelow) {
      return [
        IdsOperator.AboveToMiddleAndBelow,
        above,
        getAboveToBelowAbove(below),
        getAboveToBelowBelow(below),
      ];
    }
  }

  return null;
}

export function makeVerticalMergeCharacterIdsTransform<T>(
  above: T,
  below: T,
  merged: T,
): IdsTransform<T> {
  return (ids) => {
    const operator = getOperator(ids);
    if (operator === IdsOperator.AboveToBelow) {
      const typedIds = ids as [
        typeof IdsOperator.AboveToBelow,
        IdsNode<T>,
        IdsNode<T>,
      ];
      const aboveNode = getAboveToBelowAbove(typedIds);
      const belowNode = getAboveToBelowBelow(typedIds);

      if (
        isLeaf(aboveNode) &&
        aboveNode === above &&
        isLeaf(belowNode) &&
        belowNode === below
      ) {
        return merged;
      }
    }

    return null;
  };
}

export function idsNodeToString<T>(
  ids: IdsNode<T>,
  leafToString: (leaf: T) => string,
): string {
  if (!Array.isArray(ids)) {
    return leafToString(ids);
  }

  switch (ids[0]) {
    case IdsOperator.HorizontalReflection:
    case IdsOperator.Rotation: {
      return `${ids[0]}${idsNodeToString(ids[1], leafToString)}`;
    }
    case IdsOperator.LeftToRight:
    case IdsOperator.AboveToBelow:
    case IdsOperator.FullSurround:
    case IdsOperator.SurroundFromAbove:
    case IdsOperator.SurroundFromBelow:
    case IdsOperator.SurroundFromLeft:
    case IdsOperator.SurroundFromRight:
    case IdsOperator.SurroundFromUpperLeft:
    case IdsOperator.SurroundFromUpperRight:
    case IdsOperator.SurroundFromLowerLeft:
    case IdsOperator.SurroundFromLowerRight:
    case IdsOperator.Overlaid: {
      return `${ids[0]}${idsNodeToString(ids[1], leafToString)}${idsNodeToString(ids[2], leafToString)}`;
    }
    case IdsOperator.LeftToMiddleToRight:
    case IdsOperator.AboveToMiddleAndBelow: {
      return `${ids[0]}${idsNodeToString(ids[1], leafToString)}${idsNodeToString(ids[2], leafToString)}${idsNodeToString(ids[3], leafToString)}`;
    }
    default: {
      throw new UnexpectedValueError(ids);
    }
  }
}

const wikiGraphemeComponentSchema = z.object({
  /**
   * The hanzi grapheme (if any) formed by the strokes. Usually this can
   * be populated, but in some cases the strokes don't form a valid
   * grapheme and instead are combined for more creative visual reasons.
   */
  hanzi: z.string().optional(),
  label: z.string().optional(),
  /**
   * Comma-separated list of stroke indices (0-based) for strokes that are
   * part of this grapheme. Allows shorthand ranges (e.g. 0-2,5 is the same as
   * 0,1,2,5).
   */
  strokes: z.string().default(``),
  /**
   * When the component uses a different number of strokes than `hanzi` it's
   * normally marked as a bug. However in cases when it's intentional (e.g. 禸)
   * this field can be used to specify the different in stroke count.
   */
  strokeDiff: z.number().optional(),
  /**
   * What color to render this component in the decomposition illustration. This
   * allows highlighting different components in different colors for clarity.
   */
  color: z.string().optional(),
});

export type WikiGraphemeComponent = z.infer<typeof wikiGraphemeComponentSchema>;

function buildIdsNodeSchema<T extends z.ZodType>(
  leafSchema: T,
): z.ZodType<IdsNode<z.infer<T>>> {
  const depth0Schema = leafSchema;

  const depth1Schema = z.union([
    depth0Schema,
    z.tuple([idsOperatorArity1, depth0Schema]),
    z.tuple([idsOperatorArity2, depth0Schema, depth0Schema]),
    z.tuple([idsOperatorArity3, depth0Schema, depth0Schema, depth0Schema]),
  ]);

  const depth2Schema = z.union([
    depth1Schema,
    z.tuple([idsOperatorArity1, depth1Schema]),
    z.tuple([idsOperatorArity2, depth1Schema, depth1Schema]),
    z.tuple([idsOperatorArity3, depth1Schema, depth1Schema, depth1Schema]),
  ]);

  const depth3Schema = z.union([
    depth2Schema,
    z.tuple([idsOperatorArity1, depth2Schema]),
    z.tuple([idsOperatorArity2, depth2Schema, depth2Schema]),
    z.tuple([idsOperatorArity3, depth2Schema, depth2Schema, depth2Schema]),
  ]);

  const depth4Schema = z.union([
    depth3Schema,
    z.tuple([idsOperatorArity1, depth3Schema]),
    z.tuple([idsOperatorArity2, depth3Schema, depth3Schema]),
    z.tuple([idsOperatorArity3, depth3Schema, depth3Schema, depth3Schema]),
  ]);

  const depth5Schema = z.union([
    depth4Schema,
    z.tuple([idsOperatorArity1, depth4Schema]),
    z.tuple([idsOperatorArity2, depth4Schema, depth4Schema]),
    z.tuple([idsOperatorArity3, depth4Schema, depth4Schema, depth4Schema]),
  ]);

  return depth5Schema as z.ZodType<IdsNode<z.infer<T>>>;
}

// TODO [zod@>=4.1.12] try refactor to use https://github.com/colinhacks/zod/issues/5089
const wikiGraphemeDecompositionSchema = buildIdsNodeSchema(
  wikiGraphemeComponentSchema,
);

export type WikiGraphemeDecomposition = IdsNode<WikiGraphemeComponent>;

/**
 * Schema for grapheme.json files.
 */
export const wikiGraphemeDataSchema = z.object({
  /**
   * The hanzi character represented by this grapheme (e.g. 看).
   */
  hanzi: z.string(),
  /**
   * Stroke information, ideally SVG paths but otherwise just the count.
   */
  strokes: z.union([
    z.number().describe(`Stroke count`),
    z.array(z.string()).describe(`SVG paths for each stroke (in order)`),
  ]),
  /**
   * The simplified form of this grapheme, if it is a traditional form.
   *
   * The property is used on traditional graphemes because it's expected there
   * are fewer of those in the dataset since this app focuses on Mandarin.
   */
  traditionalFormOf: hanziTextSchema.optional(),
  /**
   * If this grapheme is a component form of another grapheme, that hanzi.
   */
  componentFormOf: hanziTextSchema.optional(),
  /**
   * Alternative IDS decompositions
   */
  decompositions: z.array(z.string()).optional(),
  /**
   * The meaning mnemonic for the grapheme. This doesn't necessarily correspond
   * to the etymological components, and their meanings can differ too. It's
   * intended for beginner learners and optimised for mnemonic usefulness.
   */
  mnemonic: z
    .object({
      /**
       * The layout of the components. The first element is the combining
       * operator, and the remaining are the components for each slot.
       */
      components: wikiGraphemeDecompositionSchema,
      stories: z
        .array(
          z.object({
            gloss: z.string(),
            story: z.string(),
            /**
             * If there are other stories that depend on this one to make sense,
             * they can be nested inside their dependency.
             */
            children: z
              .array(
                z.object({
                  gloss: z.string(),
                  story: z.string(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type WikiGraphemeData = z.infer<typeof wikiGraphemeDataSchema>;

export function componentToString(component: WikiGraphemeComponent): string {
  if (`hanzi` in component && component.hanzi != null) {
    return component.hanzi;
  } else if (`strokes` in component) {
    return strokeCountToCharacter(parseIndexRanges(component.strokes).length);
  }
  throw new Error(`Invalid component format`);
}

export function graphemeStrokeCount(graphemeData: WikiGraphemeData): number {
  return typeof graphemeData.strokes === `number`
    ? graphemeData.strokes
    : graphemeData.strokes.length;
}
