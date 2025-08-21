import { findSpriteSegment, loadManifest } from "#manifestRead.ts";
import type { SpriteManifest } from "#types.ts";
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

describe(`loadManifest suite` satisfies HasNameOf<typeof loadManifest>, () => {
  let consoleErrorMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vol.reset();
    consoleErrorMock = vi.spyOn(console, `error`).mockImplementation(() => {
      // Mock console.error to avoid cluttering test output
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test(`should load and parse valid manifest`, () => {
    const manifestPath = `/project/manifest.json`;
    const manifest: SpriteManifest = {
      spriteFiles: [`sprite1.m4a`, `sprite2.m4a`],
      segments: {
        "audio/file1.m4a": {
          sprite: 0,
          start: 0,
          duration: 1.5,
          hash: `abc123`,
        },
        "audio/file2.m4a": {
          sprite: 1,
          start: 0,
          duration: 2,
          hash: `def456`,
        },
      },
      rules: [
        {
          include: [`audio/**/*.m4a`],
          match: `audio/(?<name>[^/]+)\\.m4a`,
          sprite: `\${name}`,
        },
      ],
      outDir: `sprites`,
    };

    vol.fromJSON({
      [manifestPath]: JSON.stringify(manifest),
    });

    const result = loadManifest(manifestPath);

    expect(result).toEqual(manifest);
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  test(`should return null when manifest file does not exist`, () => {
    const manifestPath = `/nonexistent/manifest.json`;

    const result = loadManifest(manifestPath);

    expect(result).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledWith(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      expect.any(Error),
    );
  });

  test(`should return null when manifest contains invalid JSON`, () => {
    const manifestPath = `/project/manifest.json`;

    vol.fromJSON({
      [manifestPath]: `{ invalid json content`,
    });

    const result = loadManifest(manifestPath);

    expect(result).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledWith(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      expect.any(SyntaxError),
    );
  });

  test(`should return null when manifest has invalid structure - missing required fields`, () => {
    const manifestPath = `/project/manifest.json`;

    vol.fromJSON({
      [manifestPath]: JSON.stringify({
        // Missing spriteFiles, segments, rules, include
      }),
    });

    const result = loadManifest(manifestPath);

    expect(result).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledWith(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      expect.any(Error),
    );
  });

  test(`should return null when manifest has invalid structure - wrong types`, () => {
    const manifestPath = `/project/manifest.json`;

    vol.fromJSON({
      [manifestPath]: JSON.stringify({
        spriteFiles: `not-an-array`, // Should be array
        segments: [], // Should be object
        rules: {}, // Should be array
        include: `not-an-array`, // Should be array
      }),
    });

    const result = loadManifest(manifestPath);

    expect(result).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledWith(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      expect.any(Error),
    );
  });

  test(`should return null when segment data has invalid structure`, () => {
    const manifestPath = `/project/manifest.json`;

    vol.fromJSON({
      [manifestPath]: JSON.stringify({
        spriteFiles: [`sprite1.m4a`],
        segments: {
          "audio/file1.m4a": {
            sprite: `invalid`, // Should be number
            start: 0,
            duration: 1.5,
            hash: `abc123`,
          },
        },
        rules: [],
        include: [],
      }),
    });

    const result = loadManifest(manifestPath);

    expect(result).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledWith(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      expect.any(Error),
    );
  });

  test(`should return null when rules have invalid structure`, () => {
    const manifestPath = `/project/manifest.json`;

    vol.fromJSON({
      [manifestPath]: JSON.stringify({
        spriteFiles: [],
        segments: {},
        rules: [
          {
            // Missing sprite property
            match: `audio/*.m4a`,
          },
        ],
        include: [],
      }),
    });

    const result = loadManifest(manifestPath);

    expect(result).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledWith(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      expect.any(Error),
    );
  });

  test(`should load manifest with empty arrays and objects`, () => {
    const manifestPath = `/project/manifest.json`;
    const manifest: SpriteManifest = {
      spriteFiles: [],
      segments: {},
      rules: [],
      outDir: `sprites`,
    };

    vol.fromJSON({
      [manifestPath]: JSON.stringify(manifest),
    });

    const result = loadManifest(manifestPath);

    expect(result).toEqual(manifest);
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });
});

describe(
  `findSpriteSegment suite` satisfies HasNameOf<typeof findSpriteSegment>,
  () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createTestManifest = (): SpriteManifest => ({
      spriteFiles: [`audio-sprite.m4a`, `effects-sprite.m4a`],
      segments: {
        "src/sounds/beep.m4a": {
          sprite: 0,
          start: 0,
          duration: 1.5,
          hash: `abc123`,
        },
        "src/sounds/click.m4a": {
          sprite: 0,
          start: 1.5,
          duration: 0.8,
          hash: `def456`,
        },
        "src/effects/explosion.m4a": {
          sprite: 1,
          start: 0,
          duration: 2,
          hash: `ghi789`,
        },
      },
      rules: [],
      outDir: `sprites`,
    });

    test(`should handle files in different sprite files`, () => {
      const manifest = createTestManifest();
      const manifestPath = `/project/manifest.json`;
      const currentFilePath = `/project/src/effects/explosion.m4a`;

      const result = findSpriteSegment(manifest, manifestPath, currentFilePath);

      expect(result).toMatchInlineSnapshot(`
        {
          "duration": 2,
          "spritePath": "/project/sprites/effects-sprite.m4a",
          "start": 0,
        }
      `);
    });

    test(`should return null if audio file not found in manifest`, () => {
      const manifest = createTestManifest();
      const manifestPath = `/project/manifest.json`;
      const currentFilePath = `/project/src/components/nonexistent.m4a`;

      const result = findSpriteSegment(manifest, manifestPath, currentFilePath);

      expect(result).toBeNull();
    });

    test(`should return null and warn if sprite index is invalid`, () => {
      const consoleSpy = vi.spyOn(console, `warn`).mockImplementation(() => {
        // Mock implementation
      });

      const manifest: SpriteManifest = {
        spriteFiles: [`sprites/audio-sprite.m4a`],
        segments: {
          "src/sounds/broken.m4a": {
            sprite: 999, // Invalid index
            start: 0,
            duration: 1,
            hash: `broken`,
          },
        },
        rules: [],
        outDir: `sprites`,
      };

      const manifestPath = `/project/manifest.json`;
      const currentFilePath = `/project/src/sounds/broken.m4a`;

      const result = findSpriteSegment(manifest, manifestPath, currentFilePath);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Invalid sprite index 999 for segment src/sounds/broken.m4a`,
      );

      consoleSpy.mockRestore();
    });

    test(`should handle absolute paths correctly`, () => {
      const manifest = createTestManifest();
      const manifestPath = `/project/manifest.json`;
      const audioRequirePath = `/project/src/sounds/beep.m4a`;

      const result = findSpriteSegment(
        manifest,
        manifestPath,
        audioRequirePath,
      );

      expect(result).toMatchInlineSnapshot(`
        {
          "duration": 1.5,
          "spritePath": "/project/sprites/audio-sprite.m4a",
          "start": 0,
        }
      `);
    });

    test(`should normalize sprite file paths that don't start with dot`, () => {
      const manifest: SpriteManifest = {
        spriteFiles: [`audio-sprite.m4a`], // No subdirectory
        segments: {
          "src/sounds/beep.m4a": {
            sprite: 0,
            start: 0,
            duration: 1.5,
            hash: `abc123`,
          },
        },
        rules: [],
        outDir: `sprites`,
      };

      const manifestPath = `/project/manifest.json`;
      const currentFilePath = `/project/src/sounds/beep.m4a`;

      const result = findSpriteSegment(manifest, manifestPath, currentFilePath);

      expect(result).toMatchInlineSnapshot(`
        {
          "duration": 1.5,
          "spritePath": "/project/sprites/audio-sprite.m4a",
          "start": 0,
        }
      `);
    });
  },
);
