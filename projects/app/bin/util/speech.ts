import { openaiApiKey } from "#util/env.ts";
import { existsSync, mkdir, writeFile } from "@pinyinly/lib/fs";
import { nonNullable } from "@pinyinly/lib/invariant";
import { spawnSync } from "node:child_process";
import path from "node:path";
import OpenAI from "openai";

// Available OpenAI TTS voices
export const AVAILABLE_VOICES = [
  `alloy`,
  `ash`,
  `ballad`,
  `echo`,
  `fable`,
  `nova`,
  `onyx`,
  `sage`,
  `shimmer`,
] as const;
export type Voice = (typeof AVAILABLE_VOICES)[number];

// Voice-specific instructions for better pronunciation
const VOICE_INSTRUCTIONS: Record<Voice, string> = {
  alloy: `You are a teaching Mandarin Chinese. Pronounce the words clearly and crisply.`,
  ash: `You are teaching Mandarin Chinese. Speak at conversational speed, pronouncing words clearly and crisply.`,
  ballad: `Speak in Mandarin Chinese.`,
  echo: `You are teaching Mandarin Chinese. Speak at conversational speed, pronouncing words clearly and crisply.`,
  fable: `You are a teaching Mandarin Chinese. Pronounce the words clearly and crisply.`,
  nova: `Speak casually like a local Chinese in Mandarin, do not over annunciate.`,
  onyx: `You are teaching Mandarin Chinese. Speak at conversational speed, pronouncing words clearly and crisply.`,
  sage: `Speak casually like a local Chinese in Mandarin, do not over annunciate.`,
  shimmer: `You are teaching Mandarin Chinese. Speak at conversational speed, pronouncing words clearly and crisply.`,
};

export interface GenerateSpeechOptions {
  phrase: string;
  voice: Voice;
  outputDir?: string;
  speed?: number;
  format?: `mp3` | `m4a`;
  baseFileName?: string;
  /** If true, only check which files exist without generating */
  check?: boolean;
  /** Optional OpenAI instance for testing */
  openai?: OpenAI;
}

/**
 * Build the expected output file path for a given voice.
 */
function buildOutputFilePath(
  outputDir: string,
  baseFileName: string,
  voice: Voice,
  format: `mp3` | `m4a`,
): string {
  const extension = format === `m4a` ? `m4a` : `mp3`;
  return path.join(outputDir, `${baseFileName}-${voice}.${extension}`);
}

async function generateAudioFile(
  openai: OpenAI,
  text: string,
  voice: Voice,
  speed: number,
): Promise<Buffer> {
  const instruction = VOICE_INSTRUCTIONS[voice];

  const response = await openai.audio.speech.create({
    model: `gpt-4o-mini-tts`,
    voice,
    input: text,
    instructions: instruction,
    response_format: `mp3`,
    speed,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function convertMp3ToM4a(mp3Path: string, m4aPath: string): void {
  const result = spawnSync(`ffmpeg`, [
    `-i`,
    mp3Path,
    `-c:a`,
    `aac`,
    `-b:a`,
    `128k`,
    `-y`, // overwrite output file
    m4aPath,
  ]);

  if (result.error) {
    throw new Error(`FFmpeg not found: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`FFmpeg failed: ${result.stderr.toString()}`);
  }
}

async function saveAudioFile(
  audioBuffer: Buffer,
  outputDir: string,
  baseFileName: string,
  voice: Voice,
  format: `mp3` | `m4a`,
): Promise<string> {
  // Save as mp3 first
  const mp3FilePath = buildOutputFilePath(
    outputDir,
    baseFileName,
    voice,
    `mp3`,
  );

  await mkdir(path.dirname(mp3FilePath), { recursive: true });
  await writeFile(mp3FilePath, audioBuffer);

  if (format === `m4a`) {
    // Convert to m4a
    const m4aFilePath = buildOutputFilePath(
      outputDir,
      baseFileName,
      voice,
      `m4a`,
    );

    try {
      convertMp3ToM4a(mp3FilePath, m4aFilePath);
      // Remove the mp3 file after successful conversion
      const fs = await import(`node:fs/promises`);
      await fs.unlink(mp3FilePath);
      return m4aFilePath;
    } catch (error: unknown) {
      console.warn(
        `Failed to convert to m4a, keeping mp3 format: ${String(error)}`,
      );
      return mp3FilePath;
    }
  }

  return mp3FilePath;
}

/**
 * Generate speech audio files for a given phrase using OpenAI TTS.
 *
 * @param options Configuration options
 * @returns true when successful (or file exists in check mode), false otherwise
 */
export async function generateSpeech(
  options: GenerateSpeechOptions,
): Promise<boolean> {
  const {
    phrase,
    voice,
    outputDir = `./wiki-audio`,
    speed = 1,
    format = `m4a`,
    check = false,
  } = options;

  // Use provided base filename or generate from phrase
  // Keep pinyin characters (including tone marks) and word characters
  const baseFileName =
    options.baseFileName ??
    phrase.replaceAll(/[^\u4E00-\u9FFF\wāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜÜ]/g, ``);

  // Check mode: return whether the expected file already exists
  if (check) {
    const filePath = buildOutputFilePath(
      outputDir,
      baseFileName,
      voice,
      format,
    );
    return existsSync(filePath);
  }

  const openai =
    options.openai ??
    new OpenAI({
      apiKey: nonNullable(openaiApiKey),
    });

  const audioBuffer = await generateAudioFile(openai, phrase, voice, speed);
  await saveAudioFile(audioBuffer, outputDir, baseFileName, voice, format);
  return true;
}
