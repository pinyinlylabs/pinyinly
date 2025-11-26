import type { HanziGrapheme, HanziText } from "@/data/model";
import { graphemeCount, splitGraphemes } from "@/util/unicode";
import { invariant } from "@pinyinly/lib/invariant";
import { UnexpectedValueError } from "@pinyinly/lib/types";
import type { StrictExtract } from "ts-essentials";
import { z } from "zod/v4";

export type IdsNode<T> =
  | {
      operator: typeof IdsOperator.LeftToRight;
      left: IdsNode<T>;
      right: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.AboveToBelow;
      above: IdsNode<T>;
      below: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.LeftToMiddleToRight;
      left: IdsNode<T>;
      middle: IdsNode<T>;
      right: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.AboveToMiddleAndBelow;
      above: IdsNode<T>;
      middle: IdsNode<T>;
      below: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.FullSurround;
      surrounding: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromAbove;
      above: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromBelow;
      below: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromLeft;
      left: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromRight;
      right: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromUpperLeft;
      upperLeft: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromUpperRight;
      upperRight: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromLowerLeft;
      lowerLeft: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.SurroundFromLowerRight;
      lowerRight: IdsNode<T>;
      surrounded: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.Overlaid;
      overlay: IdsNode<T>;
      underlay: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.HorizontalReflection;
      reflected: IdsNode<T>;
    }
  | {
      operator: typeof IdsOperator.Rotation;
      rotated: IdsNode<T>;
    }
  | {
      operator: `Leaf`;
      leaf: T;
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

  return { operator: `Leaf`, leaf: char };
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

export function idsNodeToString(ids: IdsNode<string>): string {
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
    case `Leaf`: {
      return ids.leaf;
    }
  }
}

/**
 * Index path to an IDS node, represented as an array of child indices.
 */
export type IdsNodePath = number[];

/**
 * Converts an IDS (Ideographic Description Sequence) node into a nested array
 * structure.
 */
export function idsNodeToArrays<T, Leaf = unknown>(
  ids: IdsNode<T>,
  buildLeaf: (character: T, path: IdsNodePath) => Leaf,
  ctx?: { path: IdsNodePath },
): unknown {
  ctx ??= { path: [] };

  try {
    switch (ids.operator) {
      case IdsOperator.LeftToRight: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.left, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.right, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.AboveToBelow: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.above, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.below, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.LeftToMiddleToRight: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.left, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.middle, buildLeaf, ctx)),
          (ctx.path.push(2), idsNodeToArrays(ids.right, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.AboveToMiddleAndBelow: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.above, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.middle, buildLeaf, ctx)),
          (ctx.path.push(2), idsNodeToArrays(ids.below, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.FullSurround: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.surrounding, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromAbove: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.above, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromBelow: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.below, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromLeft: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.left, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromRight: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.right, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromUpperLeft: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.upperLeft, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromUpperRight: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.upperRight, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromLowerLeft: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.lowerLeft, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.SurroundFromLowerRight: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.lowerRight, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.surrounded, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.Overlaid: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.overlay, buildLeaf, ctx)),
          (ctx.path.push(1), idsNodeToArrays(ids.underlay, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.HorizontalReflection: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.reflected, buildLeaf, ctx)),
        ];
      }
      case IdsOperator.Rotation: {
        return [
          ids.operator,
          (ctx.path.push(0), idsNodeToArrays(ids.rotated, buildLeaf, ctx)),
        ];
      }
      case `Leaf`: {
        return buildLeaf(ids.leaf, ctx.path);
      }
    }
  } finally {
    ctx.path.pop();
  }
}

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

  loop: for (;;) {
    let mutated = false;

    for (const transform of transforms) {
      for (const node of walkIdsNode(result)) {
        const transformed = transform(node);
        if (transformed != null) {
          if (result === ids) {
            result = structuredClone(ids);
            // Restart again on a copy of the data, since now we know mutations
            // are needed.
            continue loop;
          }

          // Overwrite the object in-place.
          for (const key in node) {
            // @ts-expect-error unsafe code
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete node[key];
          }
          Object.assign(node, transformed);

          mutated = true;
        }
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
  switch (ids.operator) {
    case IdsOperator.LeftToRight: {
      yield* walkIdsNodeLeafs(ids.left);
      yield* walkIdsNodeLeafs(ids.right);
      return;
    }
    case IdsOperator.AboveToBelow: {
      yield* walkIdsNodeLeafs(ids.above);
      yield* walkIdsNodeLeafs(ids.below);
      return;
    }
    case IdsOperator.LeftToMiddleToRight: {
      yield* walkIdsNodeLeafs(ids.left);
      yield* walkIdsNodeLeafs(ids.middle);
      yield* walkIdsNodeLeafs(ids.right);
      return;
    }
    case IdsOperator.AboveToMiddleAndBelow: {
      yield* walkIdsNodeLeafs(ids.above);
      yield* walkIdsNodeLeafs(ids.middle);
      yield* walkIdsNodeLeafs(ids.below);
      return;
    }
    case IdsOperator.FullSurround: {
      yield* walkIdsNodeLeafs(ids.surrounding);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromAbove: {
      yield* walkIdsNodeLeafs(ids.above);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromBelow: {
      yield* walkIdsNodeLeafs(ids.below);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLeft: {
      yield* walkIdsNodeLeafs(ids.left);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromRight: {
      yield* walkIdsNodeLeafs(ids.right);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromUpperLeft: {
      yield* walkIdsNodeLeafs(ids.upperLeft);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromUpperRight: {
      yield* walkIdsNodeLeafs(ids.upperRight);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLowerLeft: {
      yield* walkIdsNodeLeafs(ids.lowerLeft);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLowerRight: {
      yield* walkIdsNodeLeafs(ids.lowerRight);
      yield* walkIdsNodeLeafs(ids.surrounded);
      return;
    }
    case IdsOperator.Overlaid: {
      yield* walkIdsNodeLeafs(ids.underlay);
      yield* walkIdsNodeLeafs(ids.overlay);
      return;
    }
    case IdsOperator.HorizontalReflection: {
      yield* walkIdsNodeLeafs(ids.reflected);
      return;
    }
    case IdsOperator.Rotation: {
      yield* walkIdsNodeLeafs(ids.rotated);
      return;
    }
    case `Leaf`: {
      return;
    }
    default: {
      throw new UnexpectedValueError(ids);
    }
  }
}

export function* walkIdsNodeLeafs<T>(
  ids: IdsNode<T>,
): Generator<StrictExtract<IdsNode<T>, { operator: `Leaf` }>> {
  for (const n of walkIdsNode(ids)) {
    if (n.operator === `Leaf`) {
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
  if (ids.operator === IdsOperator.LeftToRight) {
    if (ids.left.operator === IdsOperator.LeftToRight) {
      return {
        operator: IdsOperator.LeftToMiddleToRight,
        left: ids.left.left,
        middle: ids.left.right,
        right: ids.right,
      };
    } else if (ids.right.operator === IdsOperator.LeftToRight) {
      return {
        operator: IdsOperator.LeftToMiddleToRight,
        left: ids.left,
        middle: ids.right.left,
        right: ids.right.right,
      };
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
  if (ids.operator === IdsOperator.AboveToBelow) {
    if (ids.above.operator === IdsOperator.AboveToBelow) {
      return {
        operator: IdsOperator.AboveToMiddleAndBelow,
        above: ids.above.above,
        middle: ids.above.below,
        below: ids.below,
      };
    } else if (ids.below.operator === IdsOperator.AboveToBelow) {
      return {
        operator: IdsOperator.AboveToMiddleAndBelow,
        above: ids.above,
        middle: ids.below.above,
        below: ids.below.below,
      };
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
    if (
      ids.operator === IdsOperator.AboveToBelow &&
      ids.above.operator === `Leaf` &&
      ids.above.leaf === above &&
      ids.below.operator === `Leaf` &&
      ids.below.leaf === below
    ) {
      return {
        operator: `Leaf`,
        leaf: merged,
      };
    }

    return null;
  };
}
