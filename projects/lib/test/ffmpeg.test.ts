import { parseFfmpegOutput, parseTimestampToSeconds } from "#ffmpeg.ts";
import { describe, expect, test } from "vitest";

test(
  `parseFfmpegOutput suite` satisfies HasNameOf<typeof parseFfmpegOutput>,
  () => {
    expect(parseFfmpegOutput(outputExample1)).toMatchInlineSnapshot(`
      {
        "astats": {
          "Abs Peak count": "1.000000",
          "Bit depth": "31/32/32/32",
          "Channel": "1",
          "Crest factor": "5.703953",
          "DC offset": "-0.000028",
          "Dynamic range": "223.121343",
          "Entropy": "0.738100",
          "Flat factor": "0.000000",
          "Max difference": "0.072427",
          "Max level": "0.545900",
          "Mean difference": "0.005879",
          "Min difference": "0.000000",
          "Min level": "-0.669239",
          "Noise floor count": "2369.000000",
          "Noise floor dB": "-inf",
          "Number of Infs": "0.000000",
          "Number of NaNs": "0.000000",
          "Number of denormals": "0.000000",
          "Number of samples": 67584,
          "Peak count": "2.000000",
          "Peak level dB": "-3.488379",
          "RMS difference": "0.009702",
          "RMS level dB": "-18.611898",
          "RMS peak dB": "-13.427804",
          "RMS trough dB": "-inf",
          "Zero crossings": "2692",
          "Zero crossings rate": "0.039832",
        },
        "duration": {
          "fromContainer": 0.69,
          "fromStream": 0.704,
        },
        "loudnorm": {
          "input_i": -17.33,
          "input_lra": 0,
          "input_thresh": -27.33,
          "input_tp": -3.49,
          "normalization_type": "linear",
          "output_i": -24.03,
          "output_lra": 0,
          "output_thresh": -34.03,
          "output_tp": -10.16,
          "target_offset": 0.03,
        },
        "silences": [
          {
            "duration": 0.179245,
            "end": 0.179245,
            "start": 0,
          },
        ],
      }
    `);
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
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/Users/brad/src/pinyinly/projects/app/src/client/wiki/上/shang4.m4a':
  Metadata:
    major_brand     : M4A 
    minor_version   : 512
    compatible_brands: M4A isomiso2
    encoder         : Lavf61.7.100
  Duration: 00:00:00.69, start: 0.000000, bitrate: 81 kb/s
  Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 96000 Hz, mono, fltp, 68 kb/s (default)
      Metadata:
        handler_name    : SoundHandler
        vendor_id       : [0][0][0][0]
Stream mapping:
  Stream #0:0 -> #0:0 (aac (native) -> pcm_s16le (native))
Press [q] to stop, [?] for help
[silencedetect @ 0x13af3ff50] silence_start: 0
[silencedetect @ 0x13af3ff50] silence_end: 0.179245 | silence_duration: 0.179245
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
[Parsed_astats_0 @ 0x13af3f8e0] Channel: 1
[Parsed_astats_0 @ 0x13af3f8e0] DC offset: -0.000028
[Parsed_astats_0 @ 0x13af3f8e0] Min level: -0.669239
[Parsed_astats_0 @ 0x13af3f8e0] Max level: 0.545900
[Parsed_astats_0 @ 0x13af3f8e0] Min difference: 0.000000
[Parsed_astats_0 @ 0x13af3f8e0] Max difference: 0.072427
[Parsed_astats_0 @ 0x13af3f8e0] Mean difference: 0.005879
[Parsed_astats_0 @ 0x13af3f8e0] RMS difference: 0.009702
[Parsed_astats_0 @ 0x13af3f8e0] Peak level dB: -3.488379
[Parsed_astats_0 @ 0x13af3f8e0] RMS level dB: -18.611898
[Parsed_astats_0 @ 0x13af3f8e0] RMS peak dB: -13.427804
[Parsed_astats_0 @ 0x13af3f8e0] RMS trough dB: -inf
[Parsed_astats_0 @ 0x13af3f8e0] Crest factor: 5.703953
[Parsed_astats_0 @ 0x13af3f8e0] Flat factor: 0.000000
[Parsed_astats_0 @ 0x13af3f8e0] Peak count: 2
[Parsed_astats_0 @ 0x13af3f8e0] Abs Peak count: 1
[Parsed_astats_0 @ 0x13af3f8e0] Noise floor dB: -inf
[Parsed_astats_0 @ 0x13af3f8e0] Noise floor count: 2369
[Parsed_astats_0 @ 0x13af3f8e0] Entropy: 0.738100
[Parsed_astats_0 @ 0x13af3f8e0] Bit depth: 31/32/32/32
[Parsed_astats_0 @ 0x13af3f8e0] Dynamic range: 223.121343
[Parsed_astats_0 @ 0x13af3f8e0] Zero crossings: 2692
[Parsed_astats_0 @ 0x13af3f8e0] Zero crossings rate: 0.039832
[Parsed_astats_0 @ 0x13af3f8e0] Number of NaNs: 0
[Parsed_astats_0 @ 0x13af3f8e0] Number of Infs: 0
[Parsed_astats_0 @ 0x13af3f8e0] Number of denormals: 0
[Parsed_astats_0 @ 0x13af3f8e0] Overall
[Parsed_astats_0 @ 0x13af3f8e0] DC offset: -0.000028
[Parsed_astats_0 @ 0x13af3f8e0] Min level: -0.669239
[Parsed_astats_0 @ 0x13af3f8e0] Max level: 0.545900
[Parsed_astats_0 @ 0x13af3f8e0] Min difference: 0.000000
[Parsed_astats_0 @ 0x13af3f8e0] Max difference: 0.072427
[Parsed_astats_0 @ 0x13af3f8e0] Mean difference: 0.005879
[Parsed_astats_0 @ 0x13af3f8e0] RMS difference: 0.009702
[Parsed_astats_0 @ 0x13af3f8e0] Peak level dB: -3.488379
[Parsed_astats_0 @ 0x13af3f8e0] RMS level dB: -18.611898
[Parsed_astats_0 @ 0x13af3f8e0] RMS peak dB: -13.427804
[Parsed_astats_0 @ 0x13af3f8e0] RMS trough dB: -inf
[Parsed_astats_0 @ 0x13af3f8e0] Flat factor: 0.000000
[Parsed_astats_0 @ 0x13af3f8e0] Peak count: 2.000000
[Parsed_astats_0 @ 0x13af3f8e0] Abs Peak count: 1.000000
[Parsed_astats_0 @ 0x13af3f8e0] Noise floor dB: -inf
[Parsed_astats_0 @ 0x13af3f8e0] Noise floor count: 2369.000000
[Parsed_astats_0 @ 0x13af3f8e0] Entropy: 0.738100
[Parsed_astats_0 @ 0x13af3f8e0] Bit depth: 31/32/32/32
[Parsed_astats_0 @ 0x13af3f8e0] Number of samples: 67584
[Parsed_astats_0 @ 0x13af3f8e0] Number of NaNs: 0.000000
[Parsed_astats_0 @ 0x13af3f8e0] Number of Infs: 0.000000
[Parsed_astats_0 @ 0x13af3f8e0] Number of denormals: 0.000000
[Parsed_loudnorm_1 @ 0x13af3fa20] 
{
	"input_i" : "-17.33",
	"input_tp" : "-3.49",
	"input_lra" : "0.00",
	"input_thresh" : "-27.33",
	"output_i" : "-24.03",
	"output_tp" : "-10.16",
	"output_lra" : "0.00",
	"output_thresh" : "-34.03",
	"normalization_type" : "linear",
	"target_offset" : "0.03"
}
[out#0/null @ 0x13af3a800] video:0KiB audio:264KiB subtitle:0KiB other streams:0KiB global headers:0KiB muxing overhead: unknown
size=N/A time=00:00:00.70 bitrate=N/A speed=45.9x    
`;
