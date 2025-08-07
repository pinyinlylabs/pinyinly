import audioSpriteBabelPreset from "#babel.ts";
import { hashFileContent } from "#manifestWrite.ts";
import { transform } from "@babel/core";
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

const transformCode = (
  code: string,
  filename: string,
  options: Parameters<typeof audioSpriteBabelPreset>[1],
) => {
  const result = transform(code, {
    presets: [[audioSpriteBabelPreset, options]],
    filename,
  });
  return result?.code ?? ``;
};

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vol.reset();
  vi.restoreAllMocks();
  consoleErrorSpy = vi.spyOn(console, `error`).mockImplementation(() => null);
});

describe(
  `audioSpriteBabelPreset suite` satisfies HasNameOf<
    typeof audioSpriteBabelPreset
  >,
  () => {
    const beep1Content = `fake-audio-content-beep`;
    const beep2Content = `fake-audio-content-audio`;

    test(`should transform .m4a require calls when found in manifest`, () => {
      const manifestPath = `/project/sprites/manifest.json`;

      vol.fromJSON({
        "/project/sounds/beep1.m4a": beep1Content,
        [manifestPath]: JSON.stringify({
          spriteFiles: [`./sprite1-5a7d2c4f.m4a`],
          segments: {
            // Segments now use relative file paths as keys, not hashes
            "../sounds/beep1.m4a": {
              sprite: 0,
              start: 1.2,
              duration: 0.5,
              hash: hashFileContent(beep1Content),
            },
          },
          rules: [],
          include: [],
        }),
      });

      const input = `const audio = require('./beep1.m4a');`;
      const filePath = `/project/sounds/test.js`;
      const output = transformCode(input, filePath, { manifestPath });

      expect(output).toMatchInlineSnapshot(
        `"const audio = require('./beep1.m4a');"`,
      );
    });

    test(`should leave .m4a require calls unchanged when not found in manifest`, () => {
      const manifestPath = `/project/sprites/manifest.json`;

      vol.fromJSON({
        "/project/sounds/beep1.m4a": beep1Content,
        "/project/beep2.m4a": beep2Content,
        "/project/notSprited.m4a": `fake-not-sprited-content-audio`,
        [manifestPath]: JSON.stringify({
          spriteFiles: [`./sprite1-5a7d2c4f.m4a`, `./sprite2-b8e3f7a9.m4a`],
          segments: {
            // Segments now use relative file paths as keys, not hashes
            "../sounds/beep1.m4a": {
              sprite: 0,
              start: 1.2,
              duration: 0.5,
              hash: hashFileContent(beep1Content),
            },
            "../beep2.m4a": {
              sprite: 1,
              start: 2,
              duration: 1,
              hash: hashFileContent(beep2Content),
            },
          },
          rules: [],
          include: [],
        }),
      });

      const input = `const audio = require('./notSprited.m4a');`;
      const filePath = `/project/test.js`;
      const output = transformCode(input, filePath, { manifestPath });

      // Should remain unchanged - no transformation
      expect(output).toMatchInlineSnapshot(
        `"const audio = require('./notSprited.m4a');"`,
      );
    });

    test(`should leave .m4a require calls unchanged when manifest has invalid structure`, () => {
      const manifestPath = `/manifest.json`;

      // Set up the virtual filesystem declaratively
      vol.fromJSON({
        "/project/sounds/beep1.m4a": beep1Content,
        [manifestPath]: JSON.stringify({
          // Missing spriteFiles array, rules, and include
          segments: {},
        }),
      });

      const input = `const audio = require('./sounds/beep1.m4a');`;
      const filePath = `/project/test.js`;
      const output = transformCode(input, filePath, { manifestPath });

      expect(consoleErrorSpy.mock.calls[0]).toMatchInlineSnapshot(
        `
          [
            "Failed to load or parse sprite manifest at /manifest.json:",
            [ZodError: [
            {
              "expected": "array",
              "code": "invalid_type",
              "path": [
                "spriteFiles"
              ],
              "message": "Invalid input: expected array, received undefined"
            },
            {
              "expected": "array",
              "code": "invalid_type",
              "path": [
                "rules"
              ],
              "message": "Invalid input: expected array, received undefined"
            },
            {
              "expected": "array",
              "code": "invalid_type",
              "path": [
                "include"
              ],
              "message": "Invalid input: expected array, received undefined"
            },
            {
              "expected": "string",
              "code": "invalid_type",
              "path": [
                "outDir"
              ],
              "message": "Invalid input: expected string, received undefined"
            }
          ]],
          ]
        `,
      );

      expect(output).toMatchInlineSnapshot(
        `"const audio = require('./sounds/beep1.m4a');"`,
      );
    });
  },
);
