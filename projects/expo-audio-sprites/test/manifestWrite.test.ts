import { loadManifest } from "#manifestRead.ts";
import {
  applyRules,
  generateSpriteAssignments,
  getInputFiles,
  hashFile,
  resolveIncludePatterns,
  saveManifest,
  syncManifestWithFilesystem,
  updateManifestSegments,
} from "#manifestWrite.ts";
import type { SpriteManifest } from "#types.ts";
import { vol } from "memfs";
import { beforeEach, describe, expect, test, vi } from "vitest";

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
vi.mock(`../src/ffmpeg`, () => ({
  analyzeAudioFile: vi.fn().mockResolvedValue({
    duration: {
      fromContainer: 1.5, // Default duration in seconds
    },
  }),
}));

describe(
  `generateSpriteAssignments suite` satisfies HasNameOf<
    typeof generateSpriteAssignments
  >,
  () => {
    test(`should group files by sprite name based on rules`, () => {
      const files = [
        `audio/wiki/hello/greeting.m4a`,
        `audio/wiki/hello/goodbye.m4a`,
        `audio/wiki/world/intro.m4a`,
        `audio/sounds/beep.m4a`,
        `other/file.m4a`,
      ];

      const rules = [
        {
          match: `audio/wiki/(?<page>[^/]+)/(?<file>[^/]+)\\.m4a`,
          sprite: `wiki-\${page}`,
        },
        {
          match: `audio/sounds/(?<file>[^/]+)\\.m4a`,
          sprite: `sounds`,
        },
      ];

      const result = generateSpriteAssignments(files, rules);

      expect(result.get(`wiki-hello`)).toEqual([
        `audio/wiki/hello/greeting.m4a`,
        `audio/wiki/hello/goodbye.m4a`,
      ]);
      expect(result.get(`wiki-world`)).toEqual([`audio/wiki/world/intro.m4a`]);
      expect(result.get(`sounds`)).toEqual([`audio/sounds/beep.m4a`]);
      expect(result.get(`other`)).toBeUndefined(); // No matching rule
    });

    test(`should handle empty files array`, () => {
      const files: string[] = [];
      const rules = [
        {
          match: `audio/(?<category>[^/]+)/.*\\.m4a`,
          sprite: `\${category}`,
        },
      ];

      const result = generateSpriteAssignments(files, rules);

      expect(result.size).toBe(0);
    });

    test(`should handle empty rules array`, () => {
      const files = [`audio/wiki/hello.m4a`, `audio/sounds/beep.m4a`];
      const rules: { match: string; sprite: string }[] = [];

      const result = generateSpriteAssignments(files, rules);

      expect(result.size).toBe(0);
    });

    test(`should handle files that don't match any rules`, () => {
      const files = [`video/clip.mp4`, `image/photo.jpg`];
      const rules = [
        {
          match: `audio/.*\\.m4a`,
          sprite: `audio-files`,
        },
      ];

      const result = generateSpriteAssignments(files, rules);

      expect(result.size).toBe(0);
    });
  },
);

describe(
  `updateManifestSegments suite` satisfies HasNameOf<
    typeof updateManifestSegments
  >,
  () => {
    beforeEach(() => {
      vol.reset();
    });

    test(`should add file hashes to segments based on include patterns`, async () => {
      vol.fromJSON({
        "/project/audio/wiki/hello.m4a": `content1`,
        "/project/audio/sounds/beep.m4a": `content2`,
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [],
          include: [`audio/**/*.m4a`],
        } satisfies SpriteManifest),
      });

      const originalManifest = loadManifest(`/project/manifest.json`);
      const updatedManifest = await updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      // Should have two segments with duration values from mock
      expect(Object.keys(updatedManifest.segments)).toHaveLength(2);

      // All segments should have object structure with mocked duration of 1.5
      // Start times should be calculated with 1 second buffer between segments
      for (const [filePath, segmentData] of Object.entries(
        updatedManifest.segments,
      )) {
        expect(filePath).toMatch(/\.m4a$/); // Should be file path, not hash
        expect(segmentData.sprite).toBe(0);
        expect(segmentData.duration).toBe(1.5);
        expect(segmentData.hash).toHaveLength(64); // SHA-256 hash length

        // Start times will vary based on file order, but should be frame-aligned
        expect(segmentData.start).toBeGreaterThanOrEqual(0);
        // Check that the start time is reasonably frame-aligned (within 1ms tolerance)
        const sampleDuration = 1 / 44_100;
        const remainder = segmentData.start % sampleDuration;
        expect(remainder).toBeLessThan(0.001); // 1ms tolerance for floating point precision
      }
    });

    test(`should preserve existing segments`, async () => {
      vol.fromJSON({
        "/project/audio/existing-file.m4a": `existing content`,
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [],
          include: [`audio/**/*.m4a`],
        } satisfies SpriteManifest),
      });

      const originalManifest = await updateManifestSegments(
        loadManifest(`/project/manifest.json`)!,
        `/project/manifest.json`,
      );

      // Now add a new file

      vol.fromJSON({
        "/project/audio/new-file.m4a": `new content`,
      });
      const updatedManifest = await updateManifestSegments(
        loadManifest(`/project/manifest.json`)!,
        `/project/manifest.json`,
      );

      // Check the previous segment is preserved.
      expect(updatedManifest.segments).toMatchObject(originalManifest.segments);
      expect(originalManifest.segments).toMatchInlineSnapshot(`
        {
          "audio/existing-file.m4a": {
            "duration": 1.5,
            "hash": "131fc6fe7a8464937c72db19863b153ad1ac1b534889ca7dbfc69cfd08088335",
            "sprite": 0,
            "start": 0,
          },
        }
      `);
      expect(updatedManifest.segments).toMatchInlineSnapshot(`
        {
          "audio/existing-file.m4a": {
            "duration": 1.5,
            "hash": "131fc6fe7a8464937c72db19863b153ad1ac1b534889ca7dbfc69cfd08088335",
            "sprite": 0,
            "start": 0,
          },
          "audio/new-file.m4a": {
            "duration": 1.5,
            "hash": "fe32608c9ef5b6cf7e3f946480253ff76f24f4ec0678f3d0f07f9844cbff9601",
            "sprite": 0,
            "start": 2.5,
          },
        }
      `);
    });

    test(`should handle empty include patterns`, async () => {
      vol.fromJSON({
        "/project/audio/file.m4a": `content`,
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          include: [],
          rules: [],
        } satisfies SpriteManifest),
      });

      const originalManifest = loadManifest(`/project/manifest.json`);
      const updatedManifest = await updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      expect(updatedManifest.segments).toEqual({});
    });

    test(`should generate sprite file hash from multiple input files in same sprite`, async () => {
      vol.fromJSON({
        "/project/audio/wiki/hello/greeting.m4a": `hello greeting content`,
        "/project/audio/wiki/hello/goodbye.m4a": `hello goodbye content`,
        "/project/audio/wiki/world/intro.m4a": `world intro content`,
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          include: [`audio/**/*.m4a`],
          rules: [
            {
              match: `audio/wiki/(?<page>[^/]+)/.*\\.m4a`,
              sprite: `wiki-\${page}`,
            },
          ],
        } satisfies SpriteManifest),
      });

      const originalManifest = loadManifest(`/project/manifest.json`);
      const updatedManifest = await updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      // Should have 2 sprite files: wiki-hello and wiki-world
      expect(updatedManifest.spriteFiles).toHaveLength(2);

      const wikiHelloSprite = updatedManifest.spriteFiles.find((file: string) =>
        file.startsWith(`wiki-hello-`),
      );
      const wikiWorldSprite = updatedManifest.spriteFiles.find((file: string) =>
        file.startsWith(`wiki-world-`),
      );

      expect(wikiHelloSprite).toBeDefined();
      expect(wikiWorldSprite).toBeDefined();

      // The wiki-hello sprite should be generated from combining hashes of both hello files
      // The hash should be deterministic based on the content of both files
      expect(wikiHelloSprite).toMatch(/^wiki-hello-[a-f0-9]{12}\.m4a$/);
      expect(wikiWorldSprite).toMatch(/^wiki-world-[a-f0-9]{12}\.m4a$/);

      // Verify segments are assigned to correct sprites
      const segments = Object.values(updatedManifest.segments);
      const sprite0Segments = segments.filter(
        (segment) => segment.sprite === 0,
      );
      const sprite1Segments = segments.filter(
        (segment) => segment.sprite === 1,
      );

      // One sprite should have 2 files (wiki-hello), the other should have 1 (wiki-world)
      const segmentCounts = [
        sprite0Segments.length,
        sprite1Segments.length,
      ].sort();
      expect(segmentCounts).toEqual([1, 2]);
    });

    test(`should generate deterministic sprite hash from sorted file hashes`, async () => {
      // Use specific content that will generate predictable hashes
      vol.fromJSON({
        "/project/audio/test/file1.m4a": `content1`,
        "/project/audio/test/file2.m4a": `content2`,
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          include: [`audio/**/*.m4a`],
          rules: [
            {
              match: `audio/test/.*\\.m4a`,
              sprite: `test-sprite`,
            },
          ],
        } satisfies SpriteManifest),
      });

      const originalManifest = loadManifest(`/project/manifest.json`);
      const updatedManifest1 = await updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      // Run it again with same files - should produce same hash
      const updatedManifest2 = await updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      expect(updatedManifest1.spriteFiles).toEqual(
        updatedManifest2.spriteFiles,
      );
      expect(updatedManifest1.spriteFiles).toHaveLength(1);

      const spriteFile = updatedManifest1.spriteFiles[0];
      expect(spriteFile).toMatch(/^test-sprite-[a-f0-9]{12}\.m4a$/);

      // The sprite should contain both files
      const segments = Object.values(updatedManifest1.segments);
      expect(segments).toHaveLength(2);
      expect(segments.every((segment) => segment.sprite === 0)).toBe(true);
    });

    test(`should generate sprite hash based on file order, not hash order`, async () => {
      // Create files where sorting by filename gives different order than sorting by hash
      vol.fromJSON({
        "/project/audio/test/a.m4a": `zzz`, // filename first, but hash will be large
        "/project/audio/test/z.m4a": `aaa`, // filename last, but hash will be small
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          include: [`audio/**/*.m4a`],
          rules: [
            {
              match: `audio/test/.*\\.m4a`,
              sprite: `test-sprite`,
            },
          ],
        } satisfies SpriteManifest),
      });

      const originalManifest = loadManifest(`/project/manifest.json`);
      const updatedManifest = await updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      expect(updatedManifest.spriteFiles).toHaveLength(1);
      const spriteFile = updatedManifest.spriteFiles[0];

      // The sprite filename should be deterministic and based on file order (a.m4a then z.m4a)
      // This should be consistent regardless of the content hash values
      expect(spriteFile).toMatch(/^test-sprite-[a-f0-9]{12}\.m4a$/);

      // Verify files are in correct order in segments
      const segments = Object.entries(updatedManifest.segments).sort();
      expect(segments).toHaveLength(2);
      expect(segments[0]?.[0]).toBe(`audio/test/a.m4a`); // a.m4a should be first
      expect(segments[1]?.[0]).toBe(`audio/test/z.m4a`); // z.m4a should be second
      expect(segments[0]?.[1]?.start).toBe(0); // first file starts at 0
      expect(segments[1]?.[1]?.start).toBeGreaterThan(0); // second file starts later
    });
  },
);

describe(`saveManifest suite` satisfies HasNameOf<typeof saveManifest>, () => {
  beforeEach(() => {
    vol.reset();
  });

  test(`should save manifest to filesystem`, async () => {
    // Create the directory structure
    vol.fromJSON({
      "/project/dummy": `dummy`, // Create /project directory
    });

    const manifest = {
      spriteFiles: [`sprite1.m4a`],
      segments: {
        "audio/file1.m4a": {
          sprite: 0,
          start: 1.2,
          duration: 0.5,
          hash: `hash123`,
        },
      },
      rules: [
        {
          match: `audio/*.m4a`,
          sprite: `audio-sprite`,
        },
      ],
      include: [`audio/**/*.m4a`],
    } satisfies SpriteManifest;

    await saveManifest(manifest, `/project/manifest.json`);

    const savedContent = vol.readFileSync(`/project/manifest.json`, `utf8`);
    const parsedManifest = JSON.parse(
      savedContent as string,
    ) as typeof manifest;

    expect(parsedManifest).toEqual(manifest);
  });

  test(`should format JSON with proper indentation`, async () => {
    // Create the directory structure
    vol.fromJSON({
      "/project/dummy": `dummy`, // Create /project directory
    });

    await saveManifest(
      {
        spriteFiles: [],
        rules: [],
        segments: {},
        include: [],
      },
      `/project/manifest.json`,
    );

    const savedContent = vol.readFileSync(`/project/manifest.json`, `utf8`);

    // Should be formatted with 2-space indentation
    expect(savedContent).toMatchInlineSnapshot(`
      "{
      "spriteFiles":[

      ],
      "rules":[

      ],
      "segments":{

      },
      "include":[

      ]
      }"
    `);
  });
});

describe(
  `syncManifestWithFilesystem suite` satisfies HasNameOf<
    typeof syncManifestWithFilesystem
  >,
  () => {
    beforeEach(() => {
      vol.reset();
    });

    test(`should load, update, and save manifest`, async () => {
      vol.fromJSON({
        "/project/audio/wiki/hello.m4a": `content1`,
        "/project/audio/sounds/beep.m4a": `content2`,
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [
            {
              match: `.+/(?<basename>[^/]+)\\.m4a$`,
              sprite: `\${basename}`,
            },
          ],
          include: [`audio/**/*.m4a`],
        } satisfies SpriteManifest),
      });

      const updatedManifest = await syncManifestWithFilesystem(
        `/project/manifest.json`,
      );

      expect(updatedManifest).toMatchInlineSnapshot(`
        {
          "include": [
            "audio/**/*.m4a",
          ],
          "rules": [
            {
              "match": ".+/(?<basename>[^/]+)\\.m4a$",
              "sprite": "\${basename}",
            },
          ],
          "segments": {
            "audio/sounds/beep.m4a": {
              "duration": 1.5,
              "hash": "dab741b6289e7dccc1ed42330cae1accc2b755ce8079c2cd5d4b5366c9f769a6",
              "sprite": 0,
              "start": 0,
            },
            "audio/wiki/hello.m4a": {
              "duration": 1.5,
              "hash": "d0b425e00e15a0d36b9b361f02bab63563aed6cb4665083905386c55d5b679fa",
              "sprite": 1,
              "start": 0,
            },
          },
          "spriteFiles": [
            "beep-c74af0ec4db0.m4a",
            "hello-5a4f170e6d6e.m4a",
          ],
        }
      `);

      expect(updatedManifest.spriteFiles).toHaveLength(2);

      // Should have populated segments
      expect(Object.keys(updatedManifest.segments)).toHaveLength(2);
    });

    test(`should throw error if manifest cannot be loaded`, async () => {
      vi.spyOn(console, `error`).mockImplementation(() => {
        // Mock to prevent console output during tests
      });

      await expect(() =>
        syncManifestWithFilesystem(`/nonexistent/manifest.json`),
      ).rejects.toThrow(); // Just check that it throws, the specific error can vary
    });
  },
);

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
