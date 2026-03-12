// pyly-not-src-test
import type { GenerateSpeechOptions } from "#bin/util/speech.ts";
import {
  buildFileNameCheckRegExp,
  generateSpeech,
  renderFileNameParts,
} from "#bin/util/speech.ts";
import { nanoid } from "#util/nanoid.ts";
import { existsSync, mkdir, readdir, rm, writeFile } from "@pinyinly/lib/fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let TEST_OUTPUT_DIR: string;

describe(`generateSpeech` satisfies HasNameOf<typeof generateSpeech>, () => {
  describe(
    `renderFileNameParts` satisfies HasNameOf<typeof renderFileNameParts>,
    () => {
      test(`renders dynamic tokens`, () => {
        const fileName = renderFileNameParts(
          [`ni3 hao3`, `你好`, `:voice:`, `:id:`],
          {
            voice: `nova`,
            id: `abc123`,
          },
        );

        expect(fileName).toBe(`ni3 hao3-你好-nova-abc123`);
      });
    },
  );

  describe(
    `buildFileNameCheckRegExp` satisfies HasNameOf<
      typeof buildFileNameCheckRegExp
    >,
    () => {
      test(`uses wildcard matching for non-key parts`, () => {
        const pattern = buildFileNameCheckRegExp(
          [
            { text: `ni3 hao3`, key: true },
            { text: `你好`, key: false },
            { text: `:voice:`, key: true },
            { text: `:id:`, key: false },
          ],
          `nova`,
          `m4a`,
        );

        expect(pattern.test(`ni3 hao3-你好-nova-abc123.m4a`)).toBe(true);
        expect(pattern.test(`ni3 hao3-您好-nova-z9.m4a`)).toBe(true);
        expect(pattern.test(`ni3 hao3-你好-alloy-abc123.m4a`)).toBe(false);
      });

      test(`throws when :id: is key=true`, () => {
        expect(() =>
          buildFileNameCheckRegExp(
            [
              { text: `:id:`, key: true },
              { text: `:voice:`, key: true },
            ],
            `nova`,
            `m4a`,
          ),
        ).toThrow(`:id:`);
      });
    },
  );

  beforeEach(async () => {
    TEST_OUTPUT_DIR = `./test-output/speech-${nanoid()}`;
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  describe(`check mode`, () => {
    test(`returns false when file does not exist`, async () => {
      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [`你好`, `:voice:`],
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        check: true,
      });

      expect(ok).toBe(false);
    });

    test(`returns true when sampled file exists in generated directory`, async () => {
      const generatedDir = path.join(TEST_OUTPUT_DIR, `generated`);
      await mkdir(generatedDir, { recursive: true });
      await writeFile(path.join(generatedDir, `你好-nova-abc123.m4a`), `test`);

      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [`你好`, `:voice:`],
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        check: true,
      });

      expect(ok).toBe(true);
    });

    test(`returns true when sampled file exists in output root`, async () => {
      await writeFile(
        path.join(TEST_OUTPUT_DIR, `你好-nova-abc123.m4a`),
        `test`,
      );

      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [`你好`, `:voice:`],
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        check: true,
      });

      expect(ok).toBe(true);
    });

    test(`supports non-key file name parts for check mode`, async () => {
      const generatedDir = path.join(TEST_OUTPUT_DIR, `generated`);
      await mkdir(generatedDir, { recursive: true });
      await writeFile(
        path.join(generatedDir, `ni3hao3-你好-nova-abc123.m4a`),
        `test`,
      );

      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [
          { text: `ni3hao3`, key: true },
          { text: `你好`, key: false },
          { text: `:voice:`, key: true },
          { text: `:id:`, key: false },
        ],
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        check: true,
      });

      expect(ok).toBe(true);
    });

    test(`auto-appends :id: in check mode when samples > 1`, async () => {
      const generatedDir = path.join(TEST_OUTPUT_DIR, `generated`);
      await mkdir(generatedDir, { recursive: true });
      await writeFile(
        path.join(generatedDir, `ni3hao3-nova-anyid.m4a`),
        `test`,
      );

      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [`ni3hao3`, `:voice:`],
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        samples: 2,
        check: true,
      });

      expect(ok).toBe(true);
    });
  });

  describe(`generate mode`, () => {
    test(`creates sampled mp3 file in generated directory and returns true`, async () => {
      const mockAudioBuffer = Buffer.from(`fake audio data`);
      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });
      const mockOpenAI = {
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as unknown as GenerateSpeechOptions[`openai`];

      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [`你好`, `:voice:`],
        outputDir: TEST_OUTPUT_DIR,
        format: `mp3`,
        openai: mockOpenAI,
      });

      expect(ok).toBe(true);
      const generatedDir = path.join(TEST_OUTPUT_DIR, `generated`);
      expect(existsSync(generatedDir)).toBe(true);
      const files = await readdir(generatedDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^你好-nova-[^.]+\.mp3$/);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    test(`auto-appends :id: in generate mode when samples > 1`, async () => {
      const mockAudioBuffer = Buffer.from(`fake audio data`);
      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });
      const mockOpenAI = {
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as unknown as GenerateSpeechOptions[`openai`];

      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [`ni3hao3`, `:voice:`],
        outputDir: TEST_OUTPUT_DIR,
        format: `mp3`,
        samples: 2,
        openai: mockOpenAI,
      });

      expect(ok).toBe(true);
      const generatedDir = path.join(TEST_OUTPUT_DIR, `generated`);
      const files = await readdir(generatedDir);
      expect(files).toHaveLength(2);
      expect(
        files.every((name) => /^ni3hao3-nova-[^.]+\.mp3$/.test(name)),
      ).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    test(`throws when OpenAI call fails`, async () => {
      const mockOpenAI = {
        audio: {
          speech: {
            create: vi.fn().mockRejectedValue(new Error(`boom`)),
          },
        },
      } as unknown as GenerateSpeechOptions[`openai`];

      const result = generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        fileNameParts: [`你好`, `:voice:`],
        outputDir: TEST_OUTPUT_DIR,
        format: `mp3`,
        openai: mockOpenAI,
      });

      await expect(result).rejects.toThrow();
    });
  });
});
