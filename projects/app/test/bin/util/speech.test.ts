// pyly-not-src-test
import type { GenerateSpeechOptions } from "#bin/util/speech.ts";
import { generateSpeech } from "#bin/util/speech.ts";
import { existsSync, mkdir, rm, writeFile } from "@pinyinly/lib/fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const TEST_OUTPUT_DIR = `./test-output/speech`;

describe(`generateSpeech` satisfies HasNameOf<typeof generateSpeech>, () => {
  beforeEach(async () => {
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
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
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        check: true,
      });

      expect(ok).toBe(false);
    });

    test(`returns true when file exists`, async () => {
      await writeFile(path.join(TEST_OUTPUT_DIR, `你好-nova.m4a`), `test`);

      const ok = await generateSpeech({
        phrase: `你好`,
        voice: `nova`,
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        check: true,
      });

      expect(ok).toBe(true);
    });

    test(`uses baseFileName`, async () => {
      await writeFile(path.join(TEST_OUTPUT_DIR, `nihao-nova.m4a`), `test`);

      const ok = await generateSpeech({
        phrase: `你好`,
        baseFileName: `nihao`,
        voice: `nova`,
        outputDir: TEST_OUTPUT_DIR,
        format: `m4a`,
        check: true,
      });

      expect(ok).toBe(true);
    });
  });

  describe(`generate mode`, () => {
    test(`creates mp3 file and returns true`, async () => {
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
        outputDir: TEST_OUTPUT_DIR,
        format: `mp3`,
        openai: mockOpenAI,
      });

      expect(ok).toBe(true);
      expect(existsSync(path.join(TEST_OUTPUT_DIR, `你好-nova.mp3`))).toBe(
        true,
      );
      expect(mockCreate).toHaveBeenCalledTimes(1);
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
        outputDir: TEST_OUTPUT_DIR,
        format: `mp3`,
        openai: mockOpenAI,
      });

      await expect(result).rejects.toThrow();
    });
  });
});
