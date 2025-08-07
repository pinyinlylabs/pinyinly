import {
  assertSpritesUpToDate,
  checkSpriteManifest,
  generateSprites,
  getAllAudioFilesBySprite,
  verifySprites,
} from "#testing.ts";
import type { SpriteManifest } from "#types.ts";
import { globSync } from "@pinyinly/lib/fs";
import { vol } from "memfs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock fs module to use memfs
vi.mock(`node:fs`, async () => {
  const { fs } = await vi.importActual(`memfs`);
  return fs;
});

// Redirect `node:fs/promises` to use `memfs`'s `promises` API
vi.mock(`node:fs/promises`, async () => {
  const { promises } = await vi.importActual(`memfs`);
  return promises;
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
  execa: () => ({ stdout: ``, stderr: `` }),
}));

let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vol.reset();
  vi.restoreAllMocks();
  consoleWarnSpy = vi.spyOn(console, `warn`).mockImplementation(() => null);
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
  outDir: `sprites`,
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

    test(`throws when sprite template references missing named capture group`, async () => {
      const manifestWithInvalidRule = {
        ...sampleManifest,
        rules: [
          {
            match: `audio/[^/]+/.*\\.m4a`, // Missing (?<page>...) named capture group
            sprite: `wiki-\${page}`, // References ${page} which doesn't exist
          },
        ],
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithInvalidRule),
        "/test/audio1.m4a": `fake audio content`,
        "/test/audio2.m4a": `fake audio content 2`,
      });

      await expect(
        checkSpriteManifest({
          manifestPath: `/test/manifest.json`,
          syncManifest: false,
        }),
      ).rejects.toThrow(
        `Rule validation failed: sprite template references variables [page] but regex pattern "audio/[^/]+/.*\\.m4a" does not define corresponding named capture groups`,
      );
    });

    test(`passes when sprite template uses correct named capture groups`, async () => {
      const manifestWithValidRule = {
        ...sampleManifest,
        rules: [
          {
            match: `audio/(?<page>[^/]+)/.*\\.m4a`, // Has (?<page>...) named capture group
            sprite: `wiki-\${page}`, // References ${page} which exists
          },
        ],
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithValidRule),
        "/test/sprite-1.m4a": `sprite content`,
        "/test/audio1.m4a": `fake audio content`,
        "/test/audio2.m4a": `fake audio content 2`,
      });

      // Should not throw
      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        syncManifest: false,
      });

      expect(result.manifestExists).toBe(true);
    });

    test(`passes when sprite template has no variables`, async () => {
      const manifestWithStaticSprite = {
        ...sampleManifest,
        rules: [
          {
            match: `audio/.*\\.m4a`,
            sprite: `static-sprite-name`, // No variables
          },
        ],
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithStaticSprite),
        "/test/sprite-1.m4a": `sprite content`,
        "/test/audio1.m4a": `fake audio content`,
        "/test/audio2.m4a": `fake audio content 2`,
      });

      // Should not throw
      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        syncManifest: false,
      });

      expect(result.manifestExists).toBe(true);
    });

    test(`passes when sprite template uses numbered capture groups`, async () => {
      const manifestWithNumberedGroups = {
        ...sampleManifest,
        rules: [
          {
            match: `audio/([^/]+)/.*\\.m4a`, // Uses numbered capture group
            sprite: `wiki-$1`, // References $1 (numbered, not named)
          },
        ],
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithNumberedGroups),
        "/test/sprite-1.m4a": `sprite content`,
        "/test/audio1.m4a": `fake audio content`,
        "/test/audio2.m4a": `fake audio content 2`,
      });

      // Should not throw (numbered groups don't need validation)
      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        syncManifest: false,
      });

      expect(result.manifestExists).toBe(true);
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
        outDir: `sprites`,
      };

      const spriteGroups = getAllAudioFilesBySprite(manifest);

      expect(spriteGroups).toMatchInlineSnapshot(`
        Map {
          "sprites/sprite-0.m4a" => [
            {
              "duration": 1.5,
              "filePath": "audio1.m4a",
              "hash": "hash1",
              "startTime": 0,
            },
            {
              "duration": 1,
              "filePath": "../audio3.m4a",
              "hash": "hash3",
              "startTime": 2.5,
            },
          ],
          "../sprites-1.m4a" => [
            {
              "duration": 2,
              "filePath": "subdir/audio2.m4a",
              "hash": "hash2",
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
        outDir: `sprites`,
      };

      const spriteGroups = getAllAudioFilesBySprite(manifest);
      expect(spriteGroups).toMatchInlineSnapshot(`Map {}`);
    });
  },
);

describe(
  `generateSprites suite` satisfies HasNameOf<typeof generateSprites>,
  () => {
    test(`creates output directories when they don't exist`, async () => {
      // Create a manifest with sprite files in a nested directory
      const manifestWithNestedSprites: SpriteManifest = {
        spriteFiles: [`audio-sprite.m4a`],
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: `abc123`,
          },
        },
        rules: [],
        include: [`audio*.m4a`],
        outDir: `sprites`,
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithNestedSprites),
        "/test/audio1.m4a": `fake audio content`,
      });

      // Verify directory doesn't exist initially
      expect(vol.existsSync(`/test/sprites`)).toBe(false);

      // Generate sprites should create the directory and sprite file
      await generateSprites(`/test/manifest.json`);

      // Verify directory was created
      expect(vol.existsSync(`/test/sprites`)).toBe(true);
    });

    test(`skips generation when sprite file already exists`, async () => {
      const manifestWithExistingSprite: SpriteManifest = {
        spriteFiles: [`sprite-f1aada43ff61.m4a`],
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: `abc123`,
          },
        },
        rules: [
          {
            match: `(audio.+)\\.m4a$`,
            sprite: `sprite`,
          },
        ],
        include: [`audio*.m4a`],
        outDir: `sprites`,
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithExistingSprite),
        "/test/audio1.m4a": `fake audio content`,
        "/test/sprites/sprite-f1aada43ff61.m4a": `existing sprite content`,
      });

      expect(globSync(`/test/**`, { fs: await import(`node:fs`) }))
        .toMatchInlineSnapshot(`
          [
            "/test",
            "/test/sprites",
            "/test/manifest.json",
            "/test/audio1.m4a",
            "/test/sprites/sprite-f1aada43ff61.m4a",
          ]
        `);

      await generateSprites(`/test/manifest.json`);

      // Should not have called ffmpeg since file already exists
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(`Generat`),
      );
    });
  },
);
