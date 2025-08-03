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

const containerDataSchema = z.object({
  duration: z.string(),
  start: z.string(),
  bitrate: z.string(),
});

const streamDataSchema = z.object({
  size: z.string(),
  time: z.string(),
  bitrate: z.string(),
  speed: z.string(),
});

function extractDuration(output: string) {
  const containerData =
    /Duration: (?<duration>.+?), start: (?<start>.+?), bitrate: (?<bitrate>.+?)$/gms.exec(
      output,
    );
  const container = containerDataSchema.parse(containerData?.groups);

  const streamData =
    /size=(?<size>.+?) time=(?<time>.+?) bitrate=(?<bitrate>.+?) speed=(?<speed>.+?)/gms.exec(
      output,
    );
  const stream = streamDataSchema.parse(streamData?.groups);

  return {
    streamDuration: parseTimestampToSeconds(stream.time),
    containerDuration: parseTimestampToSeconds(container.duration),
  };
}

/**
 * Parses a time string like "00:00:01.02" into seconds.
 * @param timeStr - Format: HH:MM:SS.SS (e.g., "00:01:23.45")
 * @returns number of seconds as a float
 */
function parseTimestampToSeconds(timeStr: string): number {
  const match = /^(?<hh>\d+):(?<mm>\d+):(?<ss>\d+(?:\.\d+)?)$/.exec(timeStr);

  if (!match?.groups) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const { hh, mm, ss } = match.groups;
  return (
    Number.parseInt(hh!, 10) * 3600 +
    Number.parseInt(mm!, 10) * 60 +
    Number.parseFloat(ss!)
  );
}

export async function analyzeAudioFile(filePath: string) {
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

  const { containerDuration, streamDuration } = extractDuration(stderr);

  return {
    containerDuration,
    streamDuration,
    loudnorm: extractLoudnorm(stderr),
  };
}

// Full ffmpeg output example:
//
// % ffmpeg -i 'projects/app/src/client/wiki/上/shàng.m4a' -af loudnorm=print_format=json -f null -
// ffmpeg version 7.1.1 Copyright (c) 2000-2025 the FFmpeg developers
//   built with Apple clang version 17.0.0 (clang-1700.0.13.3)
//   configuration: --prefix=/opt/homebrew/Cellar/ffmpeg/7.1.1_3 --enable-shared --enable-pthreads --enable-version3 --cc=clang --host-cflags= --host-ldflags='-Wl,-ld_classic' --enable-ffplay --enable-gnutls --enable-gpl --enable-libaom --enable-libaribb24 --enable-libbluray --enable-libdav1d --enable-libharfbuzz --enable-libjxl --enable-libmp3lame --enable-libopus --enable-librav1e --enable-librist --enable-librubberband --enable-libsnappy --enable-libsrt --enable-libssh --enable-libsvtav1 --enable-libtesseract --enable-libtheora --enable-libvidstab --enable-libvmaf --enable-libvorbis --enable-libvpx --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-libxvid --enable-lzma --enable-libfontconfig --enable-libfreetype --enable-frei0r --enable-libass --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-libspeex --enable-libsoxr --enable-libzmq --enable-libzimg --disable-libjack --disable-indev=jack --enable-videotoolbox --enable-audiotoolbox --enable-neon
//   libavutil      59. 39.100 / 59. 39.100
//   libavcodec     61. 19.101 / 61. 19.101
//   libavformat    61.  7.100 / 61.  7.100
//   libavdevice    61.  3.100 / 61.  3.100
//   libavfilter    10.  4.100 / 10.  4.100
//   libswscale      8.  3.100 /  8.  3.100
//   libswresample   5.  3.100 /  5.  3.100
//   libpostproc    58.  3.100 / 58.  3.100
// Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'projects/app/src/client/wiki/上/shàng.m4a':
//   Metadata:
//     major_brand     : M4A
//     minor_version   : 512
//     compatible_brands: M4A isomiso2
//     encoder         : Lavf61.7.100
//   Duration: 00:00:01.02, start: 0.000000, bitrate: 63 kb/s
//   Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 96000 Hz, mono, fltp, 53 kb/s (default)
//       Metadata:
//         handler_name    : SoundHandler
//         vendor_id       : [0][0][0][0]
// Stream mapping:
//   Stream #0:0 -> #0:0 (aac (native) -> pcm_s16le (native))
// Press [q] to stop, [?] for help
// Output #0, null, to 'pipe:':
//   Metadata:
//     major_brand     : M4A
//     minor_version   : 512
//     compatible_brands: M4A isomiso2
//     encoder         : Lavf61.7.100
//   Stream #0:0(und): Audio: pcm_s16le, 192000 Hz, mono, s16, 3072 kb/s (default)
//       Metadata:
//         handler_name    : SoundHandler
//         vendor_id       : [0][0][0][0]
//         encoder         : Lavc61.19.101 pcm_s16le
// [Parsed_loudnorm_0 @ 0x123633230]
// {
//         "input_i" : "-18.04",
//         "input_tp" : "-3.45",
//         "input_lra" : "0.00",
//         "input_thresh" : "-28.70",
//         "output_i" : "-24.03",
//         "output_tp" : "-9.41",
//         "output_lra" : "0.00",
//         "output_thresh" : "-34.69",
//         "normalization_type" : "linear",
//         "target_offset" : "0.03"
// }
// [out#0/null @ 0x123637e70] video:0KiB audio:384KiB subtitle:0KiB other streams:0KiB global headers:0KiB muxing overhead: unknown
// size=N/A time=00:00:01.02 bitrate=N/A speed= 105x
