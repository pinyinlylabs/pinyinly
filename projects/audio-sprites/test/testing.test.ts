import type * as FfmpegModule from "#ffmpeg.ts";
import { hashFileContent } from "#manifestWrite.ts";
import {
  buildAndTestSprites,
  buildSprites,
  checkSpriteManifest,
  createAudioFileTests,
  generateSprites,
  getAllAudioFilesBySprite,
  parseSpriteFileSizeRules,
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
  const module: typeof FfmpegModule = await importOriginal();
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
      include: [`audio*.m4a`],
      match: `(audio.+)\\.m4a$`,
      sprite: `default`,
    },
  ],
  outDir: `sprites`,
};

describe(
  `parseSpriteFileSizeRules` satisfies HasNameOf<
    typeof parseSpriteFileSizeRules
  >,
  () => {
    test(`parses regex and min/max sizes`, () => {
      const result = parseSpriteFileSizeRules([
        { name: /^pinyin-/, minSize: `50kB`, maxSize: `3MB` },
      ]);

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "maxBytes": 3000000,
            "minBytes": 50000,
            "regex": /\\^pinyin-/,
          },
        ]
      `);
    });

    test(`accepts regex objects directly`, () => {
      expect(parseSpriteFileSizeRules([{ name: /^sprite-/, minSize: `1kB` }]))
        .toMatchInlineSnapshot(`
          [
            {
              "maxBytes": undefined,
              "minBytes": 1000,
              "regex": /\\^sprite-/,
            },
          ]
        `);
    });

    test(`throws for invalid range`, () => {
      expect(() =>
        parseSpriteFileSizeRules([
          { name: /^sprite-/, minSize: `2MB`, maxSize: `1MB` },
        ]),
      ).toThrow(/greater than or equal|to be >=/i);
    });

    test(`throws for invalid size text`, () => {
      expect(() =>
        parseSpriteFileSizeRules([{ name: /^sprite-/, minSize: `not-a-size` }]),
      ).toThrow(`Invalid file size "not-a-size"`);
    });
  },
);

describe(
  `checkSpriteManifest` satisfies HasNameOf<typeof checkSpriteManifest>,
  () => {
    test(`returns false when manifest does not exist`, async () => {
      const result = await checkSpriteManifest({
        manifestPath: `/nonexistent/manifest.json`,
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
        "/test/sprites/sprite-1.m4a": `sprite content`,
        "/test/audio1.m4a": `different audio content`, // This will have a different hash
        "/test/audio2.m4a": `fake audio content 2`,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
      });

      expect(result.manifestExists).toBe(true);
      expect(result.spriteFilesExist).toBe(true);
      expect(result.hashesUpToDate).toBe(false);
      expect(result.outdatedFiles.length).toBeGreaterThan(0);
      expect(result.needsRegeneration).toBe(true);
    });

    test(`reports input files that do not match any sprite rule`, async () => {
      const manifestWithUnmatchedInput = {
        ...sampleManifest,
        rules: [
          {
            include: [`audio/**/*.m4a`],
            match: `audio/wiki/.*\\.m4a`,
            sprite: `wiki`,
          },
        ],
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithUnmatchedInput),
        "/test/audio/wiki/matched.m4a": `matched audio content`,
        "/test/audio/other/unmatched.m4a": `unmatched audio content`,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
      });

      expect(result.unmatchedInputFiles).toEqual([`audio/other/unmatched.m4a`]);
    });

    test(`throws when sprite template references missing named capture group`, async () => {
      const manifestWithInvalidRule = {
        ...sampleManifest,
        rules: [
          {
            include: [`audio/**/*.m4a`],
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
            include: [`audio/**/*.m4a`],
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
      });

      expect(result.manifestExists).toBe(true);
    });

    test(`passes when sprite template has no variables`, async () => {
      const manifestWithStaticSprite = {
        ...sampleManifest,
        rules: [
          {
            include: [`audio/**/*.m4a`],
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
      });

      expect(result.manifestExists).toBe(true);
    });

    test(`passes when sprite template uses numbered capture groups`, async () => {
      const manifestWithNumberedGroups = {
        ...sampleManifest,
        rules: [
          {
            include: [`audio/**/*.m4a`],
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
      });

      expect(result.manifestExists).toBe(true);
    });

    test(`detects sprite files below minimum configured size`, async () => {
      const audioContent1 = `fake audio content`;
      const audioContent2 = `fake audio content 2`;

      const manifestWithCorrectHashes = {
        ...sampleManifest,
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: hashFileContent(audioContent1),
          },
          "audio2.m4a": {
            sprite: 0,
            start: 2.5,
            duration: 1.5,
            hash: hashFileContent(audioContent2),
          },
        },
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
        "/test/sprites/sprite-1.m4a": `1234567890`,
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        spriteFileSizes: [{ name: /^sprite-/, minSize: `20B` }],
      });

      expect(result.unusedSpriteFileSizeRules).toEqual([]);
      expect(result.spriteFileSizeViolations).toMatchInlineSnapshot(`
        [
          {
            "maxBytes": undefined,
            "minBytes": 20,
            "ruleName": "^sprite-",
            "sizeBytes": 10,
            "spriteFile": "sprite-1.m4a",
          },
        ]
      `);
    });

    test(`detects sprite files above maximum configured size`, async () => {
      const audioContent1 = `fake audio content`;
      const audioContent2 = `fake audio content 2`;

      const manifestWithCorrectHashes = {
        ...sampleManifest,
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: hashFileContent(audioContent1),
          },
          "audio2.m4a": {
            sprite: 0,
            start: 2.5,
            duration: 1.5,
            hash: hashFileContent(audioContent2),
          },
        },
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
        "/test/sprites/sprite-1.m4a": `12345678901234567890`,
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        spriteFileSizes: [{ name: /^sprite-/, maxSize: `19B` }],
      });

      expect(result.unusedSpriteFileSizeRules).toEqual([]);
      expect(result.spriteFileSizeViolations).toMatchInlineSnapshot(`
        [
          {
            "maxBytes": 19,
            "minBytes": undefined,
            "ruleName": "^sprite-",
            "sizeBytes": 20,
            "spriteFile": "sprite-1.m4a",
          },
        ]
      `);
    });

    test(`skips sprite size checks when no rule matches`, async () => {
      const audioContent1 = `fake audio content`;
      const audioContent2 = `fake audio content 2`;

      const manifestWithCorrectHashes = {
        ...sampleManifest,
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: hashFileContent(audioContent1),
          },
          "audio2.m4a": {
            sprite: 0,
            start: 2.5,
            duration: 1.5,
            hash: hashFileContent(audioContent2),
          },
        },
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
        "/test/sprites/sprite-1.m4a": `1234567890`,
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
        spriteFileSizes: [{ name: /^wiki-/, minSize: `1MB` }],
      });

      expect(result.spriteFileSizeViolations).toEqual([]);
      expect(result.unusedSpriteFileSizeRules).toEqual([`^wiki-`]);
    });

    test(`throws when sprite file size rule has invalid range`, async () => {
      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(sampleManifest),
      });

      await expect(
        checkSpriteManifest({
          manifestPath: `/test/manifest.json`,
          spriteFileSizes: [
            { name: /^sprite-/, minSize: `2MB`, maxSize: `1MB` },
          ],
        }),
      ).rejects.toThrow(/greater than or equal|to be >=/i);
    });
  },
);

describe(
  `buildAndTestSprites` satisfies HasNameOf<typeof buildAndTestSprites>,
  () => {
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
        "/test/sprites/sprite-1.m4a": `sprite content`,
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
      });

      const result = await buildAndTestSprites({
        manifestPath: `/test/manifest.json`,
      });

      expect(result.manifestExists).toBe(true);
      expect(result.hashesUpToDate).toBe(true);
      expect(result.spriteFilesExist).toBe(true);
      expect(result.needsRegeneration).toBe(false);
    });

    test(`detects unused sprite files in output directory`, async () => {
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
        "/test/sprites/sprite-1.m4a": `sprite content`,
        "/test/sprites/old-unused-sprite.m4a": `old sprite content`,
        "/test/sprites/another-old-sprite.m4a": `another old sprite`,
        "/test/sprites/non-audio-file.txt": `text file`, // Should be ignored
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
      });

      const result = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
      });

      expect(result.manifestExists).toBe(true);
      expect(result.hashesUpToDate).toBe(true);
      expect(result.spriteFilesExist).toBe(true);
      expect(result.unusedSpriteFiles).toEqual([
        `another-old-sprite.m4a`,
        `old-unused-sprite.m4a`,
      ]);
      expect(result.needsRegeneration).toBe(false);
    });

    test(`automatically cleans up unused sprite files when autoFix is enabled`, async () => {
      const audioContent1 = `fake audio content`;
      const audioContent2 = `fake audio content 2`;

      const manifestWithCorrectHashes = {
        ...sampleManifest,
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: hashFileContent(audioContent1),
          },
          "audio2.m4a": {
            sprite: 0,
            start: 2.5,
            duration: 1.5,
            hash: hashFileContent(audioContent2),
          },
        },
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
        "/test/sprites/sprite-1.m4a": `sprite content`,
        "/test/sprites/old-unused-sprite.m4a": `old sprite content`,
        "/test/sprites/another-old-sprite.m4a": `another old sprite`,
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
      });

      // Verify unused files are detected first
      const beforeCleanup = await checkSpriteManifest({
        manifestPath: `/test/manifest.json`,
      });
      expect(beforeCleanup.unusedSpriteFiles).toHaveLength(2);

      // Run testSprites with autoFix enabled
      const result = await buildAndTestSprites({
        manifestPath: `/test/manifest.json`,
        autoFix: true,
      });

      // After cleanup, no unused files should remain
      expect(result.unusedSpriteFiles).toHaveLength(0);

      // Verify the unused files were actually deleted from the filesystem
      expect(vol.existsSync(`/test/sprites/old-unused-sprite.m4a`)).toBe(false);
      expect(vol.existsSync(`/test/sprites/another-old-sprite.m4a`)).toBe(
        false,
      );
      expect(vol.existsSync(`/test/sprites/sprite-1.m4a`)).toBe(true); // Expected file should remain
    });

    test(`returns result in passing scenario`, async () => {
      const audioContent1 = `fake audio content`;
      const audioContent2 = `fake audio content 2`;

      const manifestWithCorrectHashes = {
        ...sampleManifest,
        segments: {
          "audio1.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: hashFileContent(audioContent1),
          },
          "audio2.m4a": {
            sprite: 0,
            start: 2.5,
            duration: 1.5,
            hash: hashFileContent(audioContent2),
          },
        },
      };

      vol.fromJSON({
        "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
        "/test/sprites/sprite-1.m4a": `1234567890`,
        "/test/audio1.m4a": audioContent1,
        "/test/audio2.m4a": audioContent2,
      });

      const result = await buildAndTestSprites({
        manifestPath: `/test/manifest.json`,
        spriteFileSizes: [{ name: /^sprite-/, minSize: `1B`, maxSize: `20B` }],
      });

      expect(result.spriteFileSizeViolations).toEqual([]);
      expect(result.unusedSpriteFileSizeRules).toEqual([]);
    });
  },
);

describe(`buildSprites` satisfies HasNameOf<typeof buildSprites>, () => {
  test(`returns status without asserting`, async () => {
    const audioContent1 = `fake audio content`;
    const audioContent2 = `fake audio content 2`;

    const manifestWithCorrectHashes = {
      ...sampleManifest,
      segments: {
        "audio1.m4a": {
          sprite: 0,
          start: 0,
          duration: 1.5,
          hash: hashFileContent(audioContent1),
        },
        "audio2.m4a": {
          sprite: 0,
          start: 2.5,
          duration: 1.5,
          hash: hashFileContent(audioContent2),
        },
      },
    };

    vol.fromJSON({
      "/test/manifest.json": JSON.stringify(manifestWithCorrectHashes),
      "/test/sprites/sprite-1.m4a": `1234567890`,
      "/test/audio1.m4a": audioContent1,
      "/test/audio2.m4a": audioContent2,
    });

    const result = await buildSprites({
      manifestPath: `/test/manifest.json`,
      spriteFileSizes: [{ name: /^sprite-/, minSize: `20B` }],
    });

    expect(result.spriteFileSizeViolations).toHaveLength(1);
  });
});

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
        outDir: `sprites`,
      };

      const spriteGroups = getAllAudioFilesBySprite(manifest);

      expect(spriteGroups).toMatchInlineSnapshot(`
        Map {
          "sprites/sprite-0.m4a" => [
            {
              "duration": 1.5,
              "hash": "hash1",
              "relFilePath": "audio1.m4a",
              "startTime": 0,
            },
            {
              "duration": 1,
              "hash": "hash3",
              "relFilePath": "../audio3.m4a",
              "startTime": 2.5,
            },
          ],
          "../sprites-1.m4a" => [
            {
              "duration": 2,
              "hash": "hash2",
              "relFilePath": "subdir/audio2.m4a",
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
        rules: [
          {
            include: [`audio*.m4a`],
            match: `.*`,
            sprite: `default`,
          },
        ],
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
            include: [`audio*.m4a`],
            match: `(audio.+)\\.m4a$`,
            sprite: `sprite`,
          },
        ],
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

describe(
  `createAudioFileTests` satisfies HasNameOf<typeof createAudioFileTests>,
  () => {
    test(`can be called with minimal options`, async () => {
      // Create some fake audio files in the virtual filesystem
      vol.fromJSON({
        "/test/audio1.m4a": `fake audio content`,
        "/test/audio2.m4a": `fake audio content 2`,
      });

      // This should not throw an error
      expect(() => {
        void createAudioFileTests({
          audioGlob: `/test/*.m4a`,
        });
      }).not.toThrow();
    });

    test(`can be called with all options`, async () => {
      vol.fromJSON({
        "/test/project/audio/speech1.m4a": `fake speech content`,
        "/test/project/audio/speech2.aac": `fake speech content 2`,
      });

      expect(() => {
        void createAudioFileTests({
          audioGlob: `/test/project/audio/*.{m4a,aac}`,
          targetLufs: -16,
          loudnessTolerance: 2,
          allowedStartOrEndOffset: 0.2,
          minDuration: 1,
          durationTolerance: 0.1,
          projectRoot: `/test/project`,
        });
      }).not.toThrow();
    });

    test(`handles empty glob results gracefully`, async () => {
      // Don't create any files, so glob will return empty array
      expect(() => {
        void createAudioFileTests({
          audioGlob: `/nonexistent/*.m4a`,
        });
      }).not.toThrow();
    });
  },
);
