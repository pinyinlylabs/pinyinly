import {
  applyRules,
  getInputFiles,
  hashFile,
  loadManifest,
  resolveIncludePatterns,
} from "#manifestRead.ts";
import type { SpriteManifest } from "#types.ts";
import { vol } from "memfs";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock fs module to use memfs
vi.mock(`node:fs`, async () => {
  const memfs = await vi.importActual(`memfs`);
  return memfs[`fs`];
});

// Redirect `node:fs/promises` to use `memfs`'s `promises` API
vi.mock(`node:fs/promises`, async () => {
  const { promises } = await vi.importActual(`memfs`);
  return promises;
});

// Mock the analyzeAudioFile function to avoid running ffmpeg in tests
vi.mock(`../src/ffmpeg`, () => ({
  analyzeAudioFile: vi.fn().mockResolvedValue({
    duration: {
      fromContainer: 1.5, // Default duration in seconds
    },
  }),
}));

describe(`hashFile suite` satisfies HasNameOf<typeof hashFile>, () => {
  beforeEach(() => {
    vol.reset();
  });

  test(`should produce different hashes for different file contents`, () => {
    const file1Path = `/test/file1.m4a`;
    const file2Path = `/test/file2.m4a`;

    vol.fromJSON({
      [file1Path]: `content A`,
      [file2Path]: `content B`,
    });

    const hash1 = hashFile(file1Path);
    const hash2 = hashFile(file2Path);

    expect(hash1).not.toBe(hash2);
  });

  test(`should error when file doesn't exist`, () => {
    const nonExistentPath = `/test/nonexistent.m4a`;

    expect(() => hashFile(nonExistentPath)).toThrow();
  });

  test(`should hash file content consistently`, () => {
    const filePath = `/test/example.m4a`;
    const fileContent = `fake audio binary content`;

    vol.fromJSON({
      [filePath]: fileContent,
    });

    const hash1 = hashFile(filePath);
    const hash2 = hashFile(filePath);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
  });
});

describe(`applyRules suite` satisfies HasNameOf<typeof applyRules>, () => {
  test(`should apply named capture groups correctly`, () => {
    const rules = [
      {
        match: `audio/wiki/(?<page>[^/]+)/(?<file>[^/]+)\\.m4a`,
        sprite: `wiki-\${page}`,
      },
    ];

    const result = applyRules(`audio/wiki/hello/greeting.m4a`, rules);
    expect(result).toBe(`wiki-hello`);
  });

  test(`should apply numbered capture groups correctly`, () => {
    const rules = [
      {
        match: `audio/([^/]+)/([^/]+)\\.m4a`,
        sprite: `$1-$2`,
      },
    ];

    const result = applyRules(`audio/wiki/hello.m4a`, rules);
    expect(result).toBe(`wiki-hello`);
  });

  test(`should return undefined when no rules match`, () => {
    const rules = [
      {
        match: `audio/wiki/(?<page>[^/]+)/(?<file>[^/]+)\\.m4a`,
        sprite: `wiki-\${page}`,
      },
    ];

    const result = applyRules(`sounds/beep.m4a`, rules);
    expect(result).toBeUndefined();
  });

  test(`should use first matching rule`, () => {
    const rules = [
      {
        match: `audio/(?<category>[^/]+)/.*\\.m4a`,
        sprite: `first-\${category}`,
      },
      {
        match: `audio/wiki/(?<page>[^/]+)/.*\\.m4a`,
        sprite: `second-\${page}`,
      },
    ];

    const result = applyRules(`audio/wiki/hello.m4a`, rules);
    expect(result).toBe(`first-wiki`);
  });

  test(`should handle invalid regex gracefully`, () => {
    const consoleSpy = vi.spyOn(console, `warn`).mockImplementation(() => {
      // Mock to prevent console output during tests
    });

    const rules = [
      {
        match: `[invalid regex`,
        sprite: `invalid`,
      },
      {
        match: `audio/(?<page>[^/]+)/.*\\.m4a`,
        sprite: `valid-\${page}`,
      },
    ];

    const result = applyRules(`audio/wiki/hello.m4a`, rules);
    expect(result).toBe(`valid-wiki`);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Invalid regex pattern in rule`),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  test(`should handle missing capture groups gracefully`, () => {
    const rules = [
      {
        match: `audio/([^/]+)/.*\\.m4a`,
        sprite: `$1-$2-$3`, // $2 and $3 don't exist
      },
    ];

    const result = applyRules(`audio/wiki/hello.m4a`, rules);
    expect(result).toBe(`wiki-$2-$3`); // Non-existent groups remain as-is
  });
});

describe(
  `resolveIncludePatterns suite` satisfies HasNameOf<
    typeof resolveIncludePatterns
  >,
  () => {
    beforeEach(() => {
      vol.reset();
    });

    test(`should resolve glob patterns to matching files`, () => {
      vol.fromJSON({
        "/project/audio/wiki/hello/greeting.m4a": `content1`,
        "/project/audio/wiki/world/intro.m4a": `content2`,
        "/project/audio/sounds/beep.m4a": `content3`,
        "/project/other/file.txt": `not audio`,
        "/project/audio/subdir/": null, // Directory
      });

      const patterns = [`audio/**/hello/*.m4a`, `audio/sounds/*.m4a`];
      const result = resolveIncludePatterns(patterns, `/project`);

      expect(result).toEqual([
        `audio/sounds/beep.m4a`,
        `audio/wiki/hello/greeting.m4a`,
      ]);
    });

    test(`should handle patterns that match no files`, () => {
      vol.fromJSON({
        "/project/video/clip.mp4": `content`,
      });

      const patterns = [`audio/**/*.m4a`];
      const result = resolveIncludePatterns(patterns, `/project`);

      expect(result).toEqual([]);
    });

    test(`should remove duplicates when patterns overlap`, () => {
      vol.fromJSON({
        "/project/audio/file.m4a": `content`,
      });

      const patterns = [`audio/*.m4a`, `audio/file.m4a`];
      const result = resolveIncludePatterns(patterns, `/project`);

      expect(result).toEqual([`audio/file.m4a`]);
    });

    test(`should handle invalid patterns gracefully`, () => {
      const consoleSpy = vi.spyOn(console, `warn`).mockImplementation(() => {
        // Mock to prevent console output during tests
      });

      vol.fromJSON({
        "/project/audio/file.m4a": `content`,
      });

      // Test with a pattern that causes glob to throw
      const patterns = [`**/**/[**`]; // Very invalid glob pattern
      const result = resolveIncludePatterns(patterns, `/project`);

      expect(result).toEqual([]);
      // Note: glob library might not throw for all invalid patterns,
      // so we'll just ensure the function handles errors gracefully
      consoleSpy.mockRestore();
    });
  },
);

describe(
  `getInputFiles suite` satisfies HasNameOf<typeof getInputFiles>,
  () => {
    beforeEach(() => {
      vol.reset();
    });

    test(`should return files based on manifest include patterns`, () => {
      const manifestPath = `/project/manifest.json`;

      vol.fromJSON({
        "/project/audio/wiki/hello.m4a": `content1`,
        "/project/audio/sounds/beep.m4a": `content2`,
        [manifestPath]: JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [],
          include: [`audio/**/*.m4a`],
        } satisfies SpriteManifest),
      });

      const manifest = loadManifest(manifestPath);
      const result = getInputFiles(manifest!, manifestPath);

      expect(result).toEqual([`audio/sounds/beep.m4a`, `audio/wiki/hello.m4a`]);
    });

    test(`should return empty array when no include patterns specified`, () => {
      const manifestPath = `/project/manifest.json`;

      vol.fromJSON({
        [manifestPath]: JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [],
          include: [],
        } satisfies SpriteManifest),
      });

      const manifest = loadManifest(manifestPath);
      const result = getInputFiles(manifest!, manifestPath);

      expect(result).toEqual([]);
    });

    test(`should return empty array when include is empty array`, () => {
      const manifestPath = `/project/manifest.json`;

      vol.fromJSON({
        [manifestPath]: JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [],
          include: [],
        }),
      });

      const manifest = loadManifest(manifestPath);
      const result = getInputFiles(manifest!, manifestPath);

      expect(result).toEqual([]);
    });
  },
);
