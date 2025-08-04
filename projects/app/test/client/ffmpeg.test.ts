// pyly-not-src-test

import { describe, expect, test } from "vitest";
import { parseFfmpegOutput, parseTimestampToSeconds } from "./ffmpeg";

describe(
  `parseFfmpegOutput suite` satisfies HasNameOf<typeof parseFfmpegOutput>,
  () => {
    test(`extracts loudnorm data`, () => {
      expect(parseFfmpegOutput(outputExample1)).toMatchInlineSnapshot(`
        {
          "duration": {
            "fromContainer": 1.02,
            "fromStream": 1.02,
          },
          "loudnorm": {
            "input_i": -18.04,
            "input_lra": 0,
            "input_thresh": -28.7,
            "input_tp": -3.45,
            "normalization_type": "linear",
            "output_i": -24.03,
            "output_lra": 0,
            "output_thresh": -34.69,
            "output_tp": -9.41,
            "target_offset": 0.03,
          },
          "silences": [
            {
              "duration": 0.16587,
              "end": 0.16587,
              "start": 0,
            },
            {
              "duration": 0.385401,
              "end": 1.024,
              "start": 0.638599,
            },
          ],
        }
      `);
    });
  },
);

describe(
  `parseTimestampToSeconds suite` satisfies HasNameOf<
    typeof parseTimestampToSeconds
  >,
  () => {
    test(`parses HH:MM:SS.SS format`, () => {
      expect(parseTimestampToSeconds(`00:00:00.7`)).toEqual(0.7);
      expect(parseTimestampToSeconds(`00:00:00.69`)).toEqual(0.69);
      expect(parseTimestampToSeconds(`00:00:01`)).toEqual(1);
      expect(parseTimestampToSeconds(`00:00:00.01`)).toEqual(0.01);
      expect(parseTimestampToSeconds(`00:01:23.45`)).toEqual(83.45);
      expect(parseTimestampToSeconds(`01:02:03.04`)).toEqual(3723.04);
    });

    test(`throws on invalid format`, () => {
      expect(() => parseTimestampToSeconds(`invalid`)).toThrow(
        `Invalid time format: invalid`,
      );
    });
  },
);

const outputExample1 = `ffmpeg version 7.1.1 Copyright (c) 2000-2025 the FFmpeg developers
  built with Apple clang version 17.0.0 (clang-1700.0.13.3)
  configuration: --prefix=/opt/homebrew/Cellar/ffmpeg/7.1.1_3 --enable-shared --enable-pthreads --enable-version3 --cc=clang --host-cflags= --host-ldflags='-Wl,-ld_classic' --enable-ffplay --enable-gnutls --enable-gpl --enable-libaom --enable-libaribb24 --enable-libbluray --enable-libdav1d --enable-libharfbuzz --enable-libjxl --enable-libmp3lame --enable-libopus --enable-librav1e --enable-librist --enable-librubberband --enable-libsnappy --enable-libsrt --enable-libssh --enable-libsvtav1 --enable-libtesseract --enable-libtheora --enable-libvidstab --enable-libvmaf --enable-libvorbis --enable-libvpx --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-libxvid --enable-lzma --enable-libfontconfig --enable-libfreetype --enable-frei0r --enable-libass --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-libspeex --enable-libsoxr --enable-libzmq --enable-libzimg --disable-libjack --disable-indev=jack --enable-videotoolbox --enable-audiotoolbox --enable-neon
  libavutil      59. 39.100 / 59. 39.100
  libavcodec     61. 19.101 / 61. 19.101
  libavformat    61.  7.100 / 61.  7.100
  libavdevice    61.  3.100 / 61.  3.100
  libavfilter    10.  4.100 / 10.  4.100
  libswscale      8.  3.100 /  8.  3.100
  libswresample   5.  3.100 /  5.  3.100
  libpostproc    58.  3.100 / 58.  3.100
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'projects/app/src/client/wiki/上/shàng.m4a':
  Metadata:
    major_brand     : M4A
    minor_version   : 512
    compatible_brands: M4A isomiso2
    encoder         : Lavf61.7.100
  Duration: 00:00:01.02, start: 0.000000, bitrate: 63 kb/s
  Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 96000 Hz, mono, fltp, 53 kb/s (default)
      Metadata:
        handler_name    : SoundHandler
        vendor_id       : [0][0][0][0]
Stream mapping:
  Stream #0:0 -> #0:0 (aac (native) -> pcm_s16le (native))
Press [q] to stop, [?] for help
[silencedetect @ 0x1276065b0] silence_start: 0
[silencedetect @ 0x1276065b0] silence_end: 0.16587 | silence_duration: 0.16587
[silencedetect @ 0x1276065b0] silence_start: 0.638599
Output #0, null, to 'pipe:':
  Metadata:
    major_brand     : M4A
    minor_version   : 512
    compatible_brands: M4A isomiso2
    encoder         : Lavf61.7.100
  Stream #0:0(und): Audio: pcm_s16le, 192000 Hz, mono, s16, 3072 kb/s (default)
      Metadata:
        handler_name    : SoundHandler
        vendor_id       : [0][0][0][0]
        encoder         : Lavc61.19.101 pcm_s16le
[Parsed_loudnorm_0 @ 0x1276060e0]
{
        "input_i" : "-18.04",
        "input_tp" : "-3.45",
        "input_lra" : "0.00",
        "input_thresh" : "-28.70",
        "output_i" : "-24.03",
        "output_tp" : "-9.41",
        "output_lra" : "0.00",
        "output_thresh" : "-34.69",
        "normalization_type" : "linear",
        "target_offset" : "0.03"
}
[silencedetect @ 0x1276065b0] silence_end: 1.024 | silence_duration: 0.385401
[out#0/null @ 0x13761ce50] video:0KiB audio:384KiB subtitle:0KiB other streams:0KiB global headers:0KiB muxing overhead: unknown
size=N/A time=00:00:01.02 bitrate=N/A speed= 110x`;
