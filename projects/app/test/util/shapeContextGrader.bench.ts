import { readFile } from "@pinyinly/lib/fs";
import { z } from "zod";
import { describe, test } from "vitest";
import { gradeCharacterShape } from "#util/shapeContextGrader.ts";
import type { WritingStrokePoint } from "#util/shapeContextGrader.ts";
import { transformArphicSpaceSvgPath } from "#util/svgFont.ts";
import SVGPathCommander from "svg-path-commander";

const referencePathsFor = async (character: string): Promise<string[]> => {
  const url = new URL(
    `../../src/client/wiki/${character}/character.json`,
    import.meta.url,
  );
  const parsed = z
    .object({ svg: z.object({ medians: z.array(z.string()) }) })
    .parse(JSON.parse(await readFile(url, `utf8`)));
  return parsed.svg.medians.map(transformArphicSpaceSvgPath);
};

const pointsForPaths = (paths: readonly string[]): WritingStrokePoint[][] =>
  paths.map((path) => {
    const length = SVGPathCommander.getTotalLength(path);
    const pointCount = Math.max(2, Math.ceil(length / 20));
    return Array.from({ length: pointCount }, (_, index) =>
      SVGPathCommander.getPointAtLength(
        path,
        (length * index) / (pointCount - 1),
      ),
    );
  });

const fixtures = await Promise.all(
  [`一`, `看`, `做`, `饿`].map(async (character) => {
    const referencePaths = await referencePathsFor(character);
    return {
      character,
      referencePaths,
      drawnStrokes: pointsForPaths(referencePaths),
    };
  }),
);

describe(`shapeContextGrader performance`, () => {
  for (const fixture of fixtures) {
    describe(`${fixture.character} (${fixture.referencePaths.length} strokes)`, () => {
      for (const iterations of [0, 1, 3]) {
        test(`iterations=${iterations}`, async ({ bench }) => {
          await bench(`${fixture.character}: ${fixture.referencePaths.length} strokes, ${iterations} rematch passes`, () => {
            gradeCharacterShape(fixture.drawnStrokes, fixture.referencePaths, {
              iterations,
            });
          }).run();
        });
      }
    });
  }
});
