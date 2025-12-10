import type {
  HanziCharacter,
  HanziText,
  IdsNode,
  WikiCharacterComponent,
  WikiCharacterData,
} from "@/data/model";
import { IdsOperator, idsOperatorSchema } from "@/data/model";
import { parseIndexRanges } from "@/util/indexRanges";
import { characterCount, splitCharacters } from "@/util/unicode";
import { invariant } from "@pinyinly/lib/invariant";
import { UnexpectedValueError } from "@pinyinly/lib/types";

// Type-safe accessor functions
export function getOperator<T>(ids: Readonly<IdsNode<T>>): string {
  return Array.isArray(ids) ? ids[0] : `Leaf`;
}

export function isAboveToBelowNode<T>(
  ids: Readonly<IdsNode<T>>,
): ids is [typeof IdsOperator.AboveToBelow, IdsNode<T>, IdsNode<T>] {
  return getOperator(ids) === IdsOperator.AboveToBelow;
}

export function isAboveToMiddleAndBelowNode<T>(
  ids: Readonly<IdsNode<T>>,
): ids is [
  typeof IdsOperator.AboveToMiddleAndBelow,
  IdsNode<T>,
  IdsNode<T>,
  IdsNode<T>,
] {
  return getOperator(ids) === IdsOperator.AboveToMiddleAndBelow;
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
        const new1 = (ctx.path.push(0), mapIdsNodeLeafs(old1, mapFn, ctx));
        const new2 = (ctx.path.push(1), mapIdsNodeLeafs(old2, mapFn, ctx));
        const new3 = (ctx.path.push(2), mapIdsNodeLeafs(old3, mapFn, ctx));
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

export function splitHanziText(hanziText: HanziText): HanziCharacter[] {
  return splitCharacters(hanziText) as HanziCharacter[];
}

export function strokeCountToCharacter(strokeCount: number): string {
  return String.fromCodePoint(strokeCount + 9311);
}

export const radicalStrokes = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
];

export function isHanziCharacter(hanzi: HanziText): hanzi is HanziCharacter {
  return hanziCharacterCount(hanzi) === 1;
}

export function hanziCharacterCount(hanziText: HanziText): number {
  return characterCount(hanziText);
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
  if (isAboveToBelowNode(ids)) {
    const above = getAboveToBelowAbove(ids);
    const below = getAboveToBelowBelow(ids);

    if (isAboveToBelowNode(above)) {
      return [
        IdsOperator.AboveToMiddleAndBelow,
        getAboveToBelowAbove(above),
        getAboveToBelowBelow(above),
        below,
      ];
    } else if (isAboveToBelowNode(below)) {
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
    if (isAboveToBelowNode(ids)) {
      const aboveNode = getAboveToBelowAbove(ids);
      const belowNode = getAboveToBelowBelow(ids);

      // ⿱12 -> ⑫
      if (
        isLeaf(aboveNode) &&
        aboveNode === above &&
        isLeaf(belowNode) &&
        belowNode === below
      ) {
        return merged;
      }

      // ⿱1⿱23 -> ⿱⑫3
      if (
        isLeaf(aboveNode) &&
        aboveNode === above &&
        isAboveToBelowNode(belowNode) &&
        getAboveToBelowAbove(belowNode) === below
      ) {
        return [
          IdsOperator.AboveToBelow,
          merged,
          getAboveToBelowBelow(belowNode),
        ];
      }

      // ⿱⿱012 -> ⿱0⑫
      if (
        isAboveToBelowNode(aboveNode) &&
        getAboveToBelowBelow(aboveNode) === above &&
        isLeaf(belowNode) &&
        belowNode === below
      ) {
        return [
          IdsOperator.AboveToBelow,
          getAboveToBelowAbove(aboveNode),
          merged,
        ];
      }
    } else if (isAboveToMiddleAndBelowNode(ids)) {
      const aboveNode = getAboveToMiddleAndBelowAbove(ids);
      const middleNode = getAboveToMiddleAndBelowMiddle(ids);
      const belowNode = getAboveToMiddleAndBelowBelow(ids);

      // ⿳123 -> ⿱⑫3
      if (
        isLeaf(aboveNode) &&
        aboveNode === above &&
        isLeaf(middleNode) &&
        middleNode === below
      ) {
        return [IdsOperator.AboveToBelow, merged, belowNode];
      }

      // ⿳012 -> ⿱0⑫
      if (
        isLeaf(middleNode) &&
        middleNode === above &&
        isLeaf(belowNode) &&
        belowNode === below
      ) {
        return [IdsOperator.AboveToBelow, aboveNode, merged];
      }

      // ⿳1⿱234 -> ⿳⑫34
      if (
        isLeaf(aboveNode) &&
        aboveNode === above &&
        isAboveToBelowNode(middleNode) &&
        isLeaf(getAboveToBelowAbove(middleNode)) &&
        getAboveToBelowAbove(middleNode) === below
      ) {
        return [
          IdsOperator.AboveToMiddleAndBelow,
          merged,
          getAboveToBelowBelow(middleNode),
          belowNode,
        ];
      }

      // ⿳⿱0123 -> ⿳0⑫3
      if (
        isAboveToBelowNode(aboveNode) &&
        isLeaf(getAboveToBelowBelow(aboveNode)) &&
        getAboveToBelowBelow(aboveNode) === above &&
        isLeaf(middleNode) &&
        middleNode === below
      ) {
        return [
          IdsOperator.AboveToMiddleAndBelow,
          getAboveToBelowAbove(aboveNode),
          merged,
          belowNode,
        ];
      }

      // ⿳01⿱23 -> ⿳0⑫3
      if (
        isLeaf(middleNode) &&
        middleNode === above &&
        isAboveToBelowNode(belowNode) &&
        isLeaf(getAboveToBelowAbove(belowNode)) &&
        getAboveToBelowAbove(belowNode) === below
      ) {
        return [
          IdsOperator.AboveToMiddleAndBelow,
          aboveNode,
          merged,
          getAboveToBelowBelow(belowNode),
        ];
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

export function componentToString(component: WikiCharacterComponent): string {
  if (`hanzi` in component && component.hanzi != null) {
    return component.hanzi;
  } else if (`strokes` in component) {
    return strokeCountToCharacter(parseIndexRanges(component.strokes).length);
  }
  throw new Error(`Invalid component format`);
}

export function characterStrokeCount(characterData: WikiCharacterData): number {
  return typeof characterData.strokes === `number`
    ? characterData.strokes
    : characterData.strokes.length;
}
