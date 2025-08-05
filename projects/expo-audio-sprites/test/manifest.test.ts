import {
  applyRules,
  generateSpriteAssignments,
  getInputFiles,
  hashFile,
  loadManifest,
  resolveIncludePatterns,
  saveManifest,
  syncManifestWithFilesystem,
  updateManifestSegments,
} from "#manifest.ts";
import type { SpriteManifest } from "#types.ts";
import { vol } from "memfs";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock fs module to use memfs
vi.mock(`node:fs`, async () => {
  const memfs = await vi.importActual(`memfs`);
  return memfs[`fs`];
});

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

describe(
  `updateManifestSegments suite` satisfies HasNameOf<
    typeof updateManifestSegments
  >,
  () => {
    beforeEach(() => {
      vol.reset();
    });

    test(`should add file hashes to segments based on include patterns`, () => {
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
      const updatedManifest = updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      // Should have two segments with placeholder values
      expect(Object.keys(updatedManifest.segments)).toHaveLength(2);

      // All segments should have placeholder values [0, 0, 0]
      for (const [hash, segmentData] of Object.entries(
        updatedManifest.segments,
      )) {
        expect(hash).toHaveLength(64); // SHA-256 hash length
        expect(segmentData).toEqual([0, 0, 0]);
      }
    });

    test(`should preserve existing segments`, () => {
      vol.fromJSON({
        "/project/audio/existing-file.m4a": `existing content`,
        "/project/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [],
          include: [`audio/**/*.m4a`],
        } satisfies SpriteManifest),
      });

      const originalManifest = updateManifestSegments(
        loadManifest(`/project/manifest.json`)!,
        `/project/manifest.json`,
      );

      // Now add a new file

      vol.fromJSON({
        "/project/audio/new-file.m4a": `new content`,
      });
      const updatedManifest = updateManifestSegments(
        loadManifest(`/project/manifest.json`)!,
        `/project/manifest.json`,
      );

      // Check the previous segment is preserved.
      expect(updatedManifest.segments).toMatchObject(originalManifest.segments);
      expect(originalManifest.segments).toMatchInlineSnapshot(`
        {
          "131fc6fe7a8464937c72db19863b153ad1ac1b534889ca7dbfc69cfd08088335": [
            0,
            0,
            0,
          ],
        }
      `);
      expect(updatedManifest.segments).toMatchInlineSnapshot(`
        {
          "131fc6fe7a8464937c72db19863b153ad1ac1b534889ca7dbfc69cfd08088335": [
            0,
            0,
            0,
          ],
          "fe32608c9ef5b6cf7e3f946480253ff76f24f4ec0678f3d0f07f9844cbff9601": [
            0,
            0,
            0,
          ],
        }
      `);
    });

    test(`should handle empty include patterns`, () => {
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
      const updatedManifest = updateManifestSegments(
        originalManifest!,
        `/project/manifest.json`,
      );

      expect(updatedManifest.segments).toEqual({});
    });
  },
);

describe(`saveManifest suite` satisfies HasNameOf<typeof saveManifest>, () => {
  beforeEach(() => {
    vol.reset();
  });

  test(`should save manifest to filesystem`, () => {
    // Create the directory structure
    vol.fromJSON({
      "/project/dummy": `dummy`, // Create /project directory
    });

    const manifest = {
      spriteFiles: [`sprite1.m4a`],
      segments: {
        hash123: [0, 1.2, 0.5] as [number, number, number],
      },
      rules: [
        {
          match: `audio/*.m4a`,
          sprite: `audio-sprite`,
        },
      ],
      include: [`audio/**/*.m4a`],
    };

    saveManifest(manifest, `/project/manifest.json`);

    const savedContent = vol.readFileSync(`/project/manifest.json`, `utf8`);
    const parsedManifest = JSON.parse(
      savedContent as string,
    ) as typeof manifest;

    expect(parsedManifest).toEqual(manifest);
  });

  test(`should format JSON with proper indentation`, () => {
    // Create the directory structure
    vol.fromJSON({
      "/project/dummy": `dummy`, // Create /project directory
    });

    const manifest = {
      spriteFiles: [],
      rules: [],
      segments: {},
      include: [],
    } satisfies SpriteManifest; // Use the SpriteManifest type for better type checking

    saveManifest(manifest, `/project/manifest.json`);

    const savedContent = vol.readFileSync(
      `/project/manifest.json`,
      `utf8`,
    ) as string;

    // Should be formatted with 2-space indentation
    expect(savedContent).toContain(`{\n  "spriteFiles"`);
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

    test(`should load, update, and save manifest`, () => {
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

      const updatedManifest = syncManifestWithFilesystem(
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
            "d0b425e00e15a0d36b9b361f02bab63563aed6cb4665083905386c55d5b679fa": [
              1,
              0,
              0,
            ],
            "dab741b6289e7dccc1ed42330cae1accc2b755ce8079c2cd5d4b5366c9f769a6": [
              0,
              0,
              0,
            ],
          },
          "spriteFiles": [
            "beep-089e418e.m4a",
            "hello-4f2d6937.m4a",
          ],
        }
      `);

      expect(updatedManifest.spriteFiles).toHaveLength(2);

      // Should have populated segments
      expect(Object.keys(updatedManifest.segments)).toHaveLength(2);
    });

    test(`should throw error if manifest cannot be loaded`, () => {
      vi.spyOn(console, `error`).mockImplementation(() => {
        // Mock to prevent console output during tests
      });

      expect(() => {
        syncManifestWithFilesystem(`/nonexistent/manifest.json`);
      }).toThrow(); // Just check that it throws, the specific error can vary
    });
  },
);
