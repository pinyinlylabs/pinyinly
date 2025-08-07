import {
  analyzeAudioFile,
  generateSpriteCommand,
  parseFfmpegOutput,
  parseTimestampToSeconds,
} from "#ffmpeg.ts";
import { loadManifest } from "#manifestRead.ts";
import { saveManifest, syncManifestWithFilesystem } from "#manifestWrite.ts";
import type { SpriteManifest } from "#types.ts";
import * as fs from "@pinyinly/lib/fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

const fixturesDir = path.join(import.meta.dirname, `fixtures`);
const outputsDir = path.join(fixturesDir, `outputs`);

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

describe(
  `generateSpriteCommand suite` satisfies HasNameOf<
    typeof generateSpriteCommand
  >,
  () => {
    test(`generates correct command for single file`, () => {
      const audioFiles = [
        {
          filePath: `/path/to/audio1.m4a`,
          startTime: 0,
          duration: 1.5,
        },
      ];

      const command = generateSpriteCommand(audioFiles, `/output/sprite.m4a`);

      expect(command).toEqual([
        `ffmpeg`,
        `-i`,
        `/path/to/audio1.m4a`,
        `-filter_complex`,
        `[0:0]acopy[delayed0]; [delayed0]amix=inputs=1:duration=longest[mixed]; [mixed]aresample=44100[output]`,
        `-map`,
        `[output]`,
        `-c:a`,
        `aac`,
        `-b:a`,
        `128k`,
        `-ar`,
        `44100`,
        `-y`,
        `/output/sprite.m4a`,
      ]);
    });

    test(`generates correct command for multiple files with delays`, () => {
      const audioFiles = [
        {
          filePath: `/path/to/audio1.m4a`,
          startTime: 0,
          duration: 1.5,
        },
        {
          filePath: `/path/to/audio2.m4a`,
          startTime: 2.5, // 1 second buffer after first file
          duration: 2,
        },
      ];

      const command = generateSpriteCommand(audioFiles, `/output/sprite.m4a`);

      expect(command).toEqual([
        `ffmpeg`,
        `-i`,
        `/path/to/audio1.m4a`,
        `-i`,
        `/path/to/audio2.m4a`,
        `-filter_complex`,
        `[0:0]acopy[delayed0]; [1:0]adelay=2500:all=1[delayed1]; [delayed0][delayed1]amix=inputs=2:duration=longest[mixed]; [mixed]aresample=44100[output]`,
        `-map`,
        `[output]`,
        `-c:a`,
        `aac`,
        `-b:a`,
        `128k`,
        `-ar`,
        `44100`,
        `-y`,
        `/output/sprite.m4a`,
      ]);
    });

    test(`sorts files by start time`, () => {
      const audioFiles = [
        {
          filePath: `/path/to/audio2.m4a`,
          startTime: 2,
          duration: 1,
        },
        {
          filePath: `/path/to/audio1.m4a`,
          startTime: 0,
          duration: 1.5,
        },
      ];

      const command = generateSpriteCommand(audioFiles, `/output/sprite.m4a`);

      // Should process audio1 first (startTime 0), then audio2 (startTime 2.0)
      expect(command).toEqual([
        `ffmpeg`,
        `-i`,
        `/path/to/audio1.m4a`,
        `-i`,
        `/path/to/audio2.m4a`,
        `-filter_complex`,
        `[0:0]acopy[delayed0]; [1:0]adelay=2000:all=1[delayed1]; [delayed0][delayed1]amix=inputs=2:duration=longest[mixed]; [mixed]aresample=44100[output]`,
        `-map`,
        `[output]`,
        `-c:a`,
        `aac`,
        `-b:a`,
        `128k`,
        `-ar`,
        `44100`,
        `-y`,
        `/output/sprite.m4a`,
      ]);
    });

    test(`allows custom sample rate`, () => {
      const audioFiles = [
        {
          filePath: `/path/to/audio1.m4a`,
          startTime: 0,
          duration: 1,
        },
      ];

      const command = generateSpriteCommand(
        audioFiles,
        `/output/sprite.m4a`,
        48_000,
      );

      expect(command).toContain(`-ar`);
      expect(command).toContain(`48000`);
      // Check that the filter complex contains the custom sample rate
      const filterComplexIndex = command.indexOf(`-filter_complex`);
      const filterComplex = command[filterComplexIndex + 1];
      expect(filterComplex).toContain(`aresample=48000`);
    });

    test(`throws error for empty files array`, () => {
      expect(() => generateSpriteCommand([], `/output/sprite.m4a`)).toThrow(
        `Cannot create sprite from empty audio files array`,
      );
    });

    test(`throws error for invalid start times`, () => {
      const audioFiles = [
        {
          filePath: `/path/to/audio1.m4a`,
          startTime: 0,
          duration: 2,
        },
        {
          filePath: `/path/to/audio2.m4a`,
          startTime: 1, // Overlaps with first file
          duration: 1,
        },
      ];

      expect(() =>
        generateSpriteCommand(audioFiles, `/output/sprite.m4a`),
      ).toThrow(
        `Invalid start time: file /path/to/audio2.m4a has start time 1 but current time is 2`,
      );
    });
  },
);

describe(`Integration tests with real ffmpeg`, () => {
  test(`analyzeAudioFile works with real audio files`, async () => {
    const audioPath = path.join(import.meta.dirname, `fixtures/audio1.mp3`);

    const result = await analyzeAudioFile(audioPath);

    expect(result).toMatchObject({
      duration: {
        fromStream: expect.any(Number) as number,
        fromContainer: expect.any(Number) as number,
      },
      astats: expect.any(Object) as object,
      loudnorm: expect.any(Object) as object,
    });

    // Check that the duration is close to the expected 1.2 seconds
    expect(result.duration.fromStream).toBeCloseTo(1.2, 1);
  });

  test(`generateSpriteCommand produces working ffmpeg command`, async () => {
    const outputPath = path.join(fixturesDir, `test-sprite.m4a`);

    // Clean up any existing output file
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    const audioFiles = [
      {
        filePath: path.join(fixturesDir, `audio1.mp3`),
        startTime: 0,
        duration: 1.2,
      },
      {
        filePath: path.join(fixturesDir, `audio2.mp3`),
        startTime: 2.2, // 1.2 + 1 second buffer
        duration: 0.864,
      },
    ];

    const command = generateSpriteCommand(audioFiles, outputPath);

    // Execute the generated ffmpeg command
    const [program, ...args] = command;
    await execFileAsync(program!, args);

    // Verify the output file was created
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify the output duration is approximately correct
    // Should be: 2.2 (start of second file) + 0.864 (duration of second file) = ~3.064 seconds
    const { stdout } = await execFileAsync(`ffprobe`, [
      `-v`,
      `quiet`,
      `-show_entries`,
      `format=duration`,
      `-of`,
      `csv=p=0`,
      outputPath,
    ]);

    const duration = Number.parseFloat(stdout.trim());
    expect(duration).toBeCloseTo(3.064, 2);

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test(`generateSpriteCommand works with three files`, async () => {
    const outputPath = path.join(outputsDir, `test-sprite-three.m4a`);

    // Clean up any existing output file
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    const audioFiles = [
      {
        filePath: path.join(fixturesDir, `audio1.mp3`), // 1.2 seconds
        startTime: 0,
        duration: 1.2,
      },
      {
        filePath: path.join(fixturesDir, `audio2.mp3`), // 0.864 seconds
        startTime: 2.2, // 1.2 + 1 second buffer
        duration: 0.864,
      },
      {
        filePath: path.join(fixturesDir, `audio3.mp3`), // 1.416 seconds
        startTime: 4.064, // 2.2 + 0.864 + 1 second buffer
        duration: 1.416,
      },
    ];

    const command = generateSpriteCommand(audioFiles, outputPath);

    // Execute the generated ffmpeg command
    const [program, ...args] = command;
    await execFileAsync(program!, args);

    // Verify the output file was created
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify the output duration is approximately correct
    // Should be: 4.064 (start of third file) + 1.416 (duration of third file) = ~5.48 seconds
    const { stdout } = await execFileAsync(`ffprobe`, [
      `-v`,
      `quiet`,
      `-show_entries`,
      `format=duration`,
      `-of`,
      `csv=p=0`,
      outputPath,
    ]);

    const duration = Number.parseFloat(stdout.trim());
    expect(duration).toBeCloseTo(5.48, 2);

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test(`full filesystem integration with manifest processing`, async () => {
    const testDir = path.join(import.meta.dirname, `integration-test`);
    const manifestPath = path.join(testDir, `manifest.json`);

    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }

    // Create test directory structure
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, `audio`), { recursive: true });

    // Copy test audio files to the test directory
    await execFileAsync(`cp`, [
      path.join(fixturesDir, `audio1.mp3`),
      path.join(testDir, `audio`, `test1.mp3`),
    ]);
    await execFileAsync(`cp`, [
      path.join(fixturesDir, `audio2.mp3`),
      path.join(testDir, `audio`, `test2.mp3`),
    ]);
    await execFileAsync(`cp`, [
      path.join(fixturesDir, `audio3.mp3`),
      path.join(testDir, `audio`, `test3.mp3`),
    ]);

    // Create initial manifest
    const initialManifest: SpriteManifest = {
      spriteFiles: [],
      segments: {},
      rules: [
        {
          match: `^audio/test(\\d+)\\.mp3$`,
          sprite: `test-sprite-$1`,
        },
      ],
      include: [`audio/*.mp3`],
      outDir: `sprites`,
    };

    await saveManifest(initialManifest, manifestPath);

    // Verify initial manifest was saved
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Load and verify the manifest
    const loadedManifest = loadManifest(manifestPath);
    expect(loadedManifest).toEqual(initialManifest);

    // Sync manifest with filesystem (this should scan files and update segments)
    const updatedManifest = await syncManifestWithFilesystem(manifestPath);

    // Verify segments were added for each audio file
    expect(Object.keys(updatedManifest.segments)).toHaveLength(3);
    expect(updatedManifest.segments[`audio/test1.mp3`]).toBeDefined();
    expect(updatedManifest.segments[`audio/test2.mp3`]).toBeDefined();
    expect(updatedManifest.segments[`audio/test3.mp3`]).toBeDefined();

    // Check that each segment has the correct structure
    for (const [, segment] of Object.entries(updatedManifest.segments)) {
      expect(segment).toMatchObject({
        sprite: expect.any(Number) as number,
        start: expect.any(Number) as number,
        duration: expect.any(Number) as number,
      });
      expect(segment.duration).toBeGreaterThan(0);
      expect(segment.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    }

    // Verify durations match expected values (approximately)
    expect(updatedManifest.segments[`audio/test1.mp3`]?.duration).toBeCloseTo(
      1.2,
      1,
    );
    expect(updatedManifest.segments[`audio/test2.mp3`]?.duration).toBeCloseTo(
      0.864,
      1,
    );
    expect(updatedManifest.segments[`audio/test3.mp3`]?.duration).toBeCloseTo(
      1.416,
      1,
    );

    // Create sprite file paths for each unique sprite
    const uniqueSprites = new Set(
      Object.values(updatedManifest.segments).map((s) => s.sprite),
    );

    // For this test, let's assume each file gets its own sprite (based on the regex rule)
    // Since our rule captures the number, each file should get a different sprite
    expect(uniqueSprites.size).toBe(3);

    // Generate audio files for sprite generation
    const audioFilesForSprite = Object.entries(updatedManifest.segments).map(
      ([filePath, segment]) => ({
        filePath: path.join(testDir, filePath),
        startTime: segment.start,
        duration: segment.duration,
      }),
    );

    // Sort by start time for sprite generation
    audioFilesForSprite.sort((a, b) => a.startTime - b.startTime);

    // Generate a combined sprite (in real usage, you'd generate separate sprites)
    const spriteOutputPath = path.join(testDir, `combined-sprite.m4a`);

    // For testing, let's create a combined sprite with 1-second buffers
    const audioFilesWithBuffers = audioFilesForSprite.map((file, index) => ({
      ...file,
      startTime: index * 2, // 2-second spacing (1-second buffer between files)
    }));

    const spriteCommand = generateSpriteCommand(
      audioFilesWithBuffers,
      spriteOutputPath,
    );

    // Execute the sprite generation command
    const [program, ...args] = spriteCommand;
    await execFileAsync(program!, args);

    // Verify the sprite was created
    expect(fs.existsSync(spriteOutputPath)).toBe(true);

    // Check the sprite duration
    const { stdout } = await execFileAsync(`ffprobe`, [
      `-v`,
      `quiet`,
      `-show_entries`,
      `format=duration`,
      `-of`,
      `csv=p=0`,
      spriteOutputPath,
    ]);

    const spriteDuration = Number.parseFloat(stdout.trim());
    // Expected: last start time (4) + last file duration (~1.416) = ~5.416
    expect(spriteDuration).toBeCloseTo(5.416, 1);

    // Test that we can reload the manifest from disk and it's still valid
    const reloadedManifest = loadManifest(manifestPath);
    expect(reloadedManifest).toEqual(updatedManifest);

    // Verify that running sync again doesn't change anything (idempotent)
    const secondSyncManifest = await syncManifestWithFilesystem(manifestPath);
    expect(secondSyncManifest).toEqual(updatedManifest);

    // Clean up test directory
    fs.rmSync(testDir, { recursive: true });
  });
});
