import { memoize0 } from "#util/collections.js";
import { invariant } from "@pinyinly/lib/invariant";
import { $ } from "execa";
import { z } from "zod/v4";
import { execaCached, getFileModTime } from "./execa";

/**
 * Helper function to get ffmpeg version for cache invalidation.
 *
 * Memoized to avoid running ffmpeg -version multiple times
 */
export const getFfmpegVersion = memoize0(async () => {
  const { stdout } = await $`ffmpeg -version`;
  return stdout;
});

export const ansiRed = `\u001B[31m`;
export const ansiGreen = `\u001B[32m`;
export const ansiYellow = `\u001B[33m`;
export const ansiBlue = `\u001B[34m`;
export const ansiMagenta = `\u001B[35m`;
export const ansiCyan = `\u001B[36m`;
export const ansiBold = `\u001B[1m`;
export const ansiDim = `\u001B[2m`;
export const ansiNormal = `\u001B[22m`;
export const ansiReset = `\u001B[0m`;

const stringNumberSchema = z.string().pipe(z.coerce.number());

const loudnormSchema = z.object({
  input_i: stringNumberSchema,
  input_tp: stringNumberSchema,
  input_lra: stringNumberSchema,
  input_thresh: stringNumberSchema,
  output_i: stringNumberSchema,
  output_tp: stringNumberSchema,
  output_lra: stringNumberSchema,
  output_thresh: stringNumberSchema,
  normalization_type: z.string(),
  target_offset: stringNumberSchema,
});

function extractLoudnorm(output: string) {
  // Extract out the loudnorm information from the ffmpeg output, e.g.:
  //
  // ```
  // [Parsed_loudnorm_0 @ 0x156607670]
  // {
  //         "input_i" : "-15.44",
  //         "input_tp" : "-0.68",
  //         "input_lra" : "0.00",
  //         "input_thresh" : "-26.11",
  //         "output_i" : "-24.04",
  //         "output_tp" : "-9.24",
  //         "output_lra" : "0.00",
  //         "output_thresh" : "-34.70",
  //         "normalization_type" : "linear",
  //         "target_offset" : "0.04"
  // }
  // ```
  const match = /^\[Parsed_loudnorm_0.+?(^\{.+?^\})/gms.exec(output);

  const json = match?.[1];
  invariant(
    json != null,
    `Failed to extract JSON from ffmpeg output: \n${output}`,
  );

  const parsed = loudnormSchema.parse(JSON.parse(json));
  return parsed;
}

export async function getLoudnorm(filePath: string) {
  // Get cache invalidation inputs
  const [ffmpegVersion, fileModTime] = await Promise.all([
    getFfmpegVersion(),
    getFileModTime(filePath),
  ]);

  const { stderr, exitCode } = await execaCached(
    `ffmpeg`,
    [`-i`, filePath, `-af`, `loudnorm=print_format=json`, `-f`, `null`, `-`],
    undefined,
    { ffmpegVersion, fileModTime },
  );

  if (exitCode !== 0) {
    throw new Error(`ffmpeg exited with code ${exitCode}: ${stderr}`);
  }

  return extractLoudnorm(stderr);
}
