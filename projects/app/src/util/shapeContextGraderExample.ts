import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText } from "@/data/model";
import { shapeContextGraderDefaults } from "@/util/shapeContextGrader";
import type {
  ShapeContextOptions,
  WritingStrokePoint,
} from "@/util/shapeContextGrader";
import { z } from "zod";

const shapeContextOptionsSchema = z
  .object({
    sampleCount: z.number().int().min(8).max(256).nullable().optional(),
    sampleSpacing: z.number().positive().max(1).optional(),
    radialBins: z.number().int().min(1).max(16),
    angularBins: z.number().int().min(4).max(32),
    iterations: z.number().int().min(0).max(8),
    tpsRegularization: z.number().positive().max(100),
    unmatchedCost: z.number().positive().max(5),
    maxRotationDegrees: z.number().min(0).max(45),
    rotationSteps: z.number().int().min(1).max(12),
  })
  .strict()
  .transform((options) => ({ ...shapeContextGraderDefaults, ...options }));

export interface ShapeContextGraderExample {
  id: string;
  skip?: boolean;
  drawnStrokes: string;
  options?: ShapeContextOptions;
}

export function shapeContextGraderExampleCharacter(
  example: ShapeContextGraderExample,
): string {
  return example.id.slice(0, example.id.indexOf(`-`));
}

const writingStrokesSchema = z
  .array(
    z
      .array(z.object({ x: z.number(), y: z.number() }).strict())
      .min(1)
      .max(4096),
  )
  .min(1)
  .max(128)
  .superRefine((strokes, context) => {
    if (strokes.reduce((count, stroke) => count + stroke.length, 0) > 16_384) {
      context.addIssue({ code: `custom`, message: `Too many drawn points` });
    }
  });

export const shapeContextStrokesCodec = z.codec(
  z.string().min(1).max(300_000),
  writingStrokesSchema,
  {
    decode: (value) =>
      value.split(`|`).map((stroke) =>
        stroke.split(`;`).map((point) => {
          const coordinates = point.split(`,`);
          if (
            coordinates.length !== 2 ||
            coordinates.some(
              (part) =>
                !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu.test(part),
            )
          ) {
            throw new Error(`Each point must be encoded as x,y`);
          }
          return { x: Number(coordinates[0]), y: Number(coordinates[1]) };
        }),
      ),
    encode: (strokes) =>
      strokes
        .map((stroke) =>
          stroke
            .map(
              ({ x, y }) =>
                `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`,
            )
            .join(`;`),
        )
        .join(`|`),
  },
);

export function encodeShapeContextStrokes(
  strokes: readonly (readonly WritingStrokePoint[])[],
): string {
  return z.encode(
    shapeContextStrokesCodec,
    strokes.map((stroke) => [...stroke]),
  );
}

export function decodeShapeContextStrokes(
  value: string,
): WritingStrokePoint[][] {
  return z.decode(shapeContextStrokesCodec, value);
}

const shapeContextGraderExampleSchema = z
  .object({
    id: z
      .string()
      .min(3)
      .max(100)
      .refine(
        (value) => {
          const separator = value.indexOf(`-`);
          return (
            separator > 0 &&
            separator < value.length - 1 &&
            isHanziCharacter(value.slice(0, separator) as HanziText)
          );
        },
        {
          message: `Expected an ID starting with one Hanzi character and a suffix`,
        },
      ),
    drawnStrokes: z.string().min(1).max(300_000),
    options: shapeContextOptionsSchema.optional(),
  })
  .strict()
  .superRefine(({ drawnStrokes }, context) => {
    const result = shapeContextStrokesCodec.safeDecode(drawnStrokes);
    if (!result.success) {
      context.addIssue({ code: `custom`, message: result.error.message });
    }
  });

export function parseShapeContextGraderExample(
  value: unknown,
): ShapeContextGraderExample {
  return shapeContextGraderExampleSchema.parse(value);
}

export function parseShapeContextGraderExampleJson(
  value: string,
): ShapeContextGraderExample {
  if (value.length > 1_000_000) {
    throw new RangeError(`Example JSON is too large`);
  }
  return parseShapeContextGraderExample(JSON.parse(value));
}

export function serializeShapeContextGraderExample(
  example: ShapeContextGraderExample,
): string {
  return JSON.stringify(parseShapeContextGraderExample(example), null, 2);
}

export function shapeContextGraderExampleFragment(
  example: ShapeContextGraderExample,
): string {
  return `#${encodeURIComponent(serializeShapeContextGraderExample(example))}`;
}

export function parseShapeContextGraderExampleFragment(
  fragment: string,
): ShapeContextGraderExample {
  if (fragment.length > 1_000_001) {
    throw new RangeError(`Example fragment is too large`);
  }
  const encoded = fragment.startsWith(`#`) ? fragment.slice(1) : fragment;
  if (encoded.length === 0) {
    throw new Error(`No example data was provided in the URL fragment`);
  }
  return parseShapeContextGraderExampleJson(decodeURIComponent(encoded));
}
