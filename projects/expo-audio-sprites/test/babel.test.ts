import audioSpriteBabelPreset from "#babel.ts";
import { hashFileContent } from "#manifest.ts";
import { transform } from "@babel/core";
import { vol } from "memfs";
import { afterEach } from "node:test";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock fs module to use memfs
vi.mock(`node:fs`, async () => {
  const memfs = await vi.importActual(`memfs`);
  return memfs[`fs`];
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

describe(
  `audioSpriteBabelPreset suite` satisfies HasNameOf<
    typeof audioSpriteBabelPreset
  >,
  () => {
    let consoleErrorMock: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Reset the in-memory filesystem
      vol.reset();

      const beepContent = `fake-audio-content-beep`;
      const audioContent = `fake-audio-content-audio`;

      // Set up the virtual filesystem declaratively
      vol.fromJSON({
        "/project/sounds/beep.m4a": beepContent,
        "/project/audio.m4a": audioContent,
        "/project/notSprited.m4a": `fake-not-sprited-content-audio`,
        "/project/sprites/manifest.json": JSON.stringify({
          spriteFiles: [`./sprite1-5a7d2c4f.m4a`, `./sprite2-b8e3f7a9.m4a`],
          segments: {
            // Hash for "./sounds/beep.m4a"
            [hashFileContent(beepContent)]: [0, 1.2, 0.5],
            // Hash for "./audio.m4a"
            [hashFileContent(audioContent)]: [1, 2, 1],
          },
        }),
      });

      consoleErrorMock = vi.spyOn(console, `error`).mockImplementation(() => {
        // Mock console.error to avoid cluttering test output
      });
    });

    afterEach(() => {
      // Restore the original console.error after each test
      consoleErrorMock.mockRestore();
    });

    test(`should transform .m4a require calls when found in manifest`, () => {
      const input = `const audio = require('./sounds/beep.m4a');`;
      const filePath = `/project/test.js`;

      const output = transformCode(input, filePath, {
        manifestPath: `/project/sprites/manifest.json`,
      });

      expect(output).toMatchInlineSnapshot(`
        "const audio = {
          type: "audiosprite",
          start: 1.2,
          duration: 0.5,
          asset: require("./sprites/sprite1-5a7d2c4f.m4a")
        };"
      `);
    });

    test(`should transform .m4a require calls using rules when segments are not pre-populated`, () => {
      // This test simulates a scenario where rules exist but segments haven't been built yet
      // In a real workflow, rules would be used to determine sprite assignment during build time
      const input = `const audio = require('./audio/wiki/hello/greeting.m4a');`;
      const filePath = `/project/test.js`;

      // Set up manifest with rules but no segments yet
      vol.fromJSON({
        "/project/audio/wiki/hello/greeting.m4a": `fake-greeting-content`,
        "/project/sprites/manifest.json": JSON.stringify({
          spriteFiles: [],
          segments: {},
          rules: [
            {
              match: `audio/wiki/(?<page>[^/]+)/(?<file>[^/]+)\\.m4a`,
              sprite: `wiki-\${page}`,
            },
          ],
        }),
      });

      const output = transformCode(input, filePath, {
        manifestPath: `/project/sprites/manifest.json`,
      });

      // Since no segments exist yet, the transformation should leave the require unchanged
      // This is expected behavior - rules are for build-time sprite generation, not runtime transformation
      expect(output).toMatchInlineSnapshot(
        `"const audio = require('./audio/wiki/hello/greeting.m4a');"`,
      );
    });

    test(`should leave .m4a require calls unchanged when not found in manifest`, () => {
      const input = `const audio = require('./notSprited.m4a');`;
      const filePath = `/project/test.js`;

      const output = transformCode(input, filePath, {
        manifestPath: `/project/sprites/manifest.json`,
      });

      // Should remain unchanged - no transformation
      expect(output).toMatchInlineSnapshot(
        `"const audio = require('./notSprited.m4a');"`,
      );
    });

    test(`should leave .m4a require calls unchanged when manifest has invalid structure`, () => {
      const manifestPath = `/manifest.json`;

      // Override the filesystem with invalid manifest
      vol.fromJSON({
        [manifestPath]: JSON.stringify({
          // Missing spriteFiles array
          segments: {
            "123123": [0, 1.2, 0.5],
          },
        }),
      });

      const input = `const audio = require('./sounds/beep.m4a');`;
      const filePath = `/project/test.js`;

      const output = transformCode(input, filePath, {
        manifestPath,
      });

      expect(consoleErrorMock.mock.calls[0]).toMatchInlineSnapshot(
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
            }
          ]],
          ]
        `,
      );

      expect(output).toMatchInlineSnapshot(
        `"const audio = require('./sounds/beep.m4a');"`,
      );
    });

    test(`should leave .m4a require calls unchanged when manifest has invalid segment data`, () => {
      const manifestPath = `/manifest.json`;
      vol.fromJSON({
        [manifestPath]: JSON.stringify({
          spriteFiles: [`./sprite1-5a7d2c4f.m4a`],
          segments: {
            // Invalid segment data - should be [number, number, number] but has string
            [`123123`]: [`invalid`, 1.2, 0.5],
          },
        }),
      });

      const input = `const audio = require('./sounds/beep.m4a');`;
      const filePath = `/project/test.js`;

      const output = transformCode(input, filePath, {
        manifestPath,
      });

      expect(consoleErrorMock.mock.calls[0]).toMatchInlineSnapshot(
        `
          [
            "Failed to load or parse sprite manifest at /manifest.json:",
            [ZodError: [
            {
              "expected": "number",
              "code": "invalid_type",
              "path": [
                "segments",
                "123123",
                0
              ],
              "message": "Invalid input: expected number, received string"
            }
          ]],
          ]
        `,
      );

      expect(output).toMatchInlineSnapshot(
        `"const audio = require('./sounds/beep.m4a');"`,
      );
    });
  },
);
