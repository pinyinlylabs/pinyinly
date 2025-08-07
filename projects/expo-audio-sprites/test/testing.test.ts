import {
  assertSpritesUpToDate,
  checkSpriteManifest,
  getAllAudioFilesBySprite,
  verifySprites,
} from "#testing.ts";
import type { SpriteManifest } from "#types.ts";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock fs module to use memfs
vi.mock(`node:fs`, async () => {
  const { fs } = await vi.importActual(`memfs`);
  return fs;
});

// Mock the analyzeAudioFile function to avoid running ffmpeg in tests
vi.mock(`#ffmpeg.ts`, async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const module: typeof import("../src/ffmpeg.ts") = await importOriginal();
  return {
    ...module,
    // Mock analyzeAudioFileDuration to return a fixed value
    analyzeAudioFileDuration: (async () =>
      1.5) satisfies typeof module.analyzeAudioFileDuration,
    // Mock generateSpriteCommand to return a simple command
    generateSpriteCommand: (() => [
      `echo`,
      `Mock ffmpeg command`,
    ]) satisfies typeof module.generateSpriteCommand,
  };
});

// Mock execa to avoid running actual commands
vi.mock(`execa`, async () => ({
  execa: vi.fn().mockResolvedValue({ stdout: ``, stderr: `` }),
}));

beforeEach(() => {
  vol.reset();
  vi.restoreAllMocks();
});

afterEach(() => {
  vol.reset();
  vi.restoreAllMocks();
});

const sampleManifest: SpriteManifest = {
  spriteFiles: [`sprite-1.m4a`],
  segments: {
    "audio1.m4a": {
      sprite: 0,
      start: 0,
      duration: 1.5,
      hash: `abc123`,
    },
    "audio2.m4a": {
      sprite: 0,
      start: 2.5,
      duration: 1.5,
      hash: `def456`,
    },
  },
  rules: [
    {
      match: `(audio.+)\\.m4a$`,
      sprite: `default`,
    },
  ],
  include: [`audio*.m4a`],
};

describe(
  `checkSpriteManifest` satisfies HasNameOf<typeof checkSpriteManifest>,
  () => {
    test(`returns false when manifest does not exist`, async () => {
      const result = await checkSpriteManifest({
        manifestPath: `/nonexistent/manifest.json`,
        syncManifest: false,
      });

      expect(result.manifestExists).toBe(false);
      expect(result.needsRegeneration).toBe(true);
    });

    test(`detects when sprite files are missing`, async () => {
      // Create manifest without sprite files
      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(sampleManifest),
        "/test/audio1.m4a": `fake audio content`,
        "/test/audio2.m4a": `fake audio content 2`,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        syncManifest: false,
      });

      expect(result.manifestExists).toBe(true);
      expect(result.spriteFilesExist).toBe(false);
      expect(result.missingSpriteFiles).toEqual([`sprite-1.m4a`]);
      expect(result.needsRegeneration).toBe(true);
    });

    test(`detects when hashes are outdated`, async () => {
      // Create manifest and sprite files, but with outdated hashes
      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(sampleManifest),
        "/test/sprite-1.m4a": `sprite content`,
        "/test/audio1.m4a": `different audio content`, // This will have a different hash
        "/test/audio2.m4a": `fake audio content 2`,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        syncManifest: false,
      });

      expect(result.manifestExists).toBe(true);
      expect(result.spriteFilesExist).toBe(true);
      expect(result.hashesUpToDate).toBe(false);
      expect(result.outdatedFiles.length).toBeGreaterThan(0);
      expect(result.needsRegeneration).toBe(true);
    });
  },
);

describe(`verifySprites` satisfies HasNameOf<typeof verifySprites>, () => {
  test(`can be called as main test helper`, async () => {
    // Create files with content that matches the expected hashes
    const audioContent1 = `fake audio content`;
    const audioContent2 = `fake audio content 2`;

    // Calculate the actual hashes that will be generated
    const crypto = await import(`node:crypto`);
    const hash1 = crypto
      .createHash(`sha256`)
      .update(audioContent1)
      .digest(`hex`);
    const hash2 = crypto
      .createHash(`sha256`)
      .update(audioContent2)
      .digest(`hex`);

    const manifestWithCorrectHashes = {
      ...sampleManifest,
      segments: {
        "audio1.m4a": {
          sprite: 0,
          start: 0,
          duration: 1.5,
          hash: hash1,
        },
        "audio2.m4a": {
          sprite: 0,
          start: 2.5,
          duration: 1.5,
          hash: hash2,
        },
      },
    };

    vol.fromJSON({
      "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
      "/test/sprite-1.m4a": `sprite content`,
      "/test/audio1.m4a": audioContent1,
      "/test/audio2.m4a": audioContent2,
    });

    const result = await verifySprites({
      manifestPath: `/test/manifest.json`,
      syncManifest: false,
    });

    expect(result.manifestExists).toBe(true);
    expect(result.hashesUpToDate).toBe(true);
    expect(result.spriteFilesExist).toBe(true);
    expect(result.needsRegeneration).toBe(false);
  });
});

describe(
  `assertSpritesUpToDate` satisfies HasNameOf<typeof assertSpritesUpToDate>,
  () => {
    test(`throws when manifest does not exist`, async () => {
      await expect(
        assertSpritesUpToDate({
          manifestPath: `/nonexistent/manifest.json`,
          syncManifest: false,
        }),
      ).rejects.toThrow(`Manifest file does not exist`);
    });

    test(`throws when sprites need regeneration`, async () => {
      // Create correct audio files with matching hashes
      const audioContent1 = `fake audio content`;
      const audioContent2 = `fake audio content 2`;

      const crypto = await import(`node:crypto`);
      const hash1 = crypto
        .createHash(`sha256`)
        .update(audioContent1)
        .digest(`hex`);
      const hash2 = crypto
        .createHash(`sha256`)
        .update(audioContent2)
        .digest(`hex`);

      const manifestWithCorrectHashes = {
        ...sampleManifest,
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: hash1,
          },
          "audio2.m4a": {
            sprite: 0,
            start: 2.5,
            duration: 1.5,
            hash: hash2,
          },
        },
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
        // Missing sprite file intentionally to test sprite file check
      });

      await expect(
        assertSpritesUpToDate({
          manifestPath: `/test/manifest.json`,
          syncManifest: false,
        }),
      ).rejects.toThrow(`Sprite files are missing`);
    });
  },
);

describe(
  `getAllAudioFilesBySprite` satisfies HasNameOf<
    typeof getAllAudioFilesBySprite
  >,
  () => {
    test(`groups all files by sprite index correctly`, () => {
      const manifest: SpriteManifest = {
        spriteFiles: [`sprites/sprite-0.m4a`, `../sprites-1.m4a`],
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: `hash1`,
          },
          "subdir/audio2.m4a": {
            sprite: 1,
            start: 0,
            duration: 2,
            hash: `hash2`,
          },
          "../audio3.m4a": {
            sprite: 0,
            start: 2.5,
            duration: 1,
            hash: `hash3`,
          },
        },
        rules: [],
        include: [],
      };

      const spriteGroups = getAllAudioFilesBySprite(manifest);

      expect(spriteGroups).toMatchInlineSnapshot(`
        Map {
          "sprites/sprite-0.m4a" => [
            {
              "duration": 1.5,
              "filePath": "audio1.m4a",
              "startTime": 0,
            },
            {
              "duration": 1,
              "filePath": "../audio3.m4a",
              "startTime": 2.5,
            },
          ],
          "../sprites-1.m4a" => [
            {
              "duration": 2,
              "filePath": "subdir/audio2.m4a",
              "startTime": 0,
            },
          ],
        }
      `);
    });

    test(`handles empty manifest`, () => {
      const manifest: SpriteManifest = {
        spriteFiles: [],
        segments: {},
        rules: [],
        include: [],
      };

      const spriteGroups = getAllAudioFilesBySprite(manifest);
      expect(spriteGroups).toMatchInlineSnapshot(`Map {}`);
    });
  },
);
