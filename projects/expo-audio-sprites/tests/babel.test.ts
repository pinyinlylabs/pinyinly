import audioSpriteBabelPreset, { hashFile, hashFileContent } from "#babel.ts";
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

describe(`Audio Sprite Babel Preset`, () => {
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
    // Override the filesystem with invalid manifest
    vol.fromJSON({
      "/manifest.json": JSON.stringify({
        // Missing spriteFiles array
        segments: {
          "123123": [0, 1.2, 0.5],
        },
      }),
    });

    const input = `const audio = require('./sounds/beep.m4a');`;
    const filePath = `/project/test.js`;

    const output = transformCode(input, filePath, {
      manifestPath: `/manifest.json`,
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
    vol.fromJSON({
      "/manifest.json": JSON.stringify({
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
      manifestPath: `/manifest.json`,
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
});

describe(`hashFile` satisfies NameOf<typeof hashFile>, () => {
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
