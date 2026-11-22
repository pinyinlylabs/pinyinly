// pyly-not-src-test
import { mkdir, writeFile } from "@pinyinly/lib/fs";
import path from "node:path";
import type { ShapeContextTerminalHookDiagnostics } from "#test/util/shapeContextGraderDiagnostics.ts";

interface TerminalHookFixtureRecord {
  id: string;
  character: string;
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  terminalHooks: ShapeContextTerminalHookDiagnostics;
}

function csvEscape(value: string | number | boolean): string {
  return `"${String(value).replaceAll(`"`, `""`)}"`;
}

export async function writeTerminalHookFixtureCsv({
  reviewDirectory,
  records,
}: {
  reviewDirectory: string;
  records: readonly TerminalHookFixtureRecord[];
}): Promise<string> {
  await mkdir(reviewDirectory, { recursive: true });
  const header = [
    `fixture_id`,
    `character`,
    `expected_acceptance`,
    `actual_acceptance`,
    `handwriting_stroke_index`,
    `reference_stroke_index`,
    `direction`,
    `reference_confidence`,
    `reference_turn_degrees`,
    `reference_terminal_length_fraction`,
    `reference_terminal_start_fraction`,
    `reference_classification`,
    `reference_simplified_point_count`,
    `handwriting_confidence`,
    `handwriting_turn_degrees`,
    `handwriting_terminal_length_fraction`,
    `handwriting_terminal_start_fraction`,
    `handwriting_classification`,
    `handwriting_simplified_point_count`,
    `terminal_turn_difference_degrees`,
    `terminal_length_ratio_difference`,
    `observation`,
  ].join(`,`);
  const rows = records.flatMap((record) =>
    record.terminalHooks.pairs.map((pair) =>
      [
        record.id,
        record.character,
        record.expectedAcceptance,
        record.actualAcceptance,
        pair.handwritingStrokeIndex,
        pair.referenceStrokeIndex,
        pair.direction,
        pair.reference.confidence,
        pair.reference.terminalTurnDegrees,
        pair.reference.terminalSegmentLengthFraction,
        pair.reference.terminalSegmentStartFraction,
        pair.reference.classification,
        pair.reference.simplifiedPointCount,
        pair.handwriting.confidence,
        pair.handwriting.terminalTurnDegrees,
        pair.handwriting.terminalSegmentLengthFraction,
        pair.handwriting.terminalSegmentStartFraction,
        pair.handwriting.classification,
        pair.handwriting.simplifiedPointCount,
        pair.terminalTurnDifferenceDegrees,
        pair.terminalLengthRatioDifference,
        pair.observation,
      ]
        .map(csvEscape)
        .join(`,`),
    ),
  );
  const outputPath = path.join(reviewDirectory, `terminal-hooks.csv`);
  await writeFile(outputPath, [header, ...rows].join(`\n`));
  return outputPath;
}
