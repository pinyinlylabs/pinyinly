import { openaiApiKey } from "#util/env.ts";
import { nanoid } from "#util/nanoid.ts";
import { regExpEscape } from "#util/regExp.ts";
import { existsSync, mkdir, readdir, writeFile } from "@pinyinly/lib/fs";
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
export type AudioFileFormat = `mp3` | `m4a`;

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
  format?: AudioFileFormat;
  baseFileName?: string;
  /** If true, only check which files exist without generating */
  check?: boolean;
  /** Optional OpenAI instance for testing */
  openai?: OpenAI;
  /** Override instructions for the voice model (e.g., tone-specific prompts) */
  instructions?: string;
  /** Number of samples to generate (defaults to 1). Set > 1 to get multiple samples with nanoid suffixes */
  samples?: number;
}

const GENERATED_SAMPLES_DIRNAME = `generated`;

function getGeneratedOutputDir(outputDir: string): string {
  return path.join(outputDir, GENERATED_SAMPLES_DIRNAME);
}

/**
 * Build the expected output file path for a given voice.
 */
function buildOutputFilePath(
  outputDir: string,
  baseFileName: string,
  voice: Voice,
  format: AudioFileFormat,
  sampleSuffix: string,
): string {
  const extension = format === `m4a` ? `m4a` : `mp3`;
  const suffix = `-${sampleSuffix}`;
  return path.join(outputDir, `${baseFileName}-${voice}${suffix}.${extension}`);
}

/**
 * Returns true if at least one matching file exists.
 *
 * Supported patterns:
 * - base file: {base}-{voice}.{ext}
 * - sampled file: {base}-{voice}-{suffix}.{ext}
 *
 * Looks in both outputDir and outputDir/generated.
 */
async function hasAtLeastOneSample(
  outputDir: string,
  baseFileName: string,
  voice: Voice,
  format: AudioFileFormat,
): Promise<boolean> {
  const extension = format === `m4a` ? `m4a` : `mp3`;
  const escapedBase = regExpEscape(baseFileName);
  const escapedVoice = regExpEscape(voice);
  const fileNamePattern = new RegExp(
    `^${escapedBase}-${escapedVoice}(?:-[^.]+)?\\.${extension}$`,
  );

  const candidateDirs = [outputDir, getGeneratedOutputDir(outputDir)];

  for (const dir of candidateDirs) {
    if (!existsSync(dir)) {
      continue;
    }

    const files = await readdir(dir);
    if (files.some((name) => fileNamePattern.test(name))) {
      return true;
    }
  }

  return false;
}

async function generateAudioFile(
  openai: OpenAI,
  text: string,
  voice: Voice,
  speed: number,
  instructionOverride?: string,
): Promise<Buffer> {
  const instruction = instructionOverride ?? VOICE_INSTRUCTIONS[voice];

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
  outputPath: string,
  format: AudioFileFormat,
): Promise<string> {
  // Save as mp3 first (or as temporary input before m4a conversion)
  const mp3FilePath =
    format === `mp3` ? outputPath : outputPath.replace(/\.m4a$/u, `.tmp.mp3`);

  await mkdir(path.dirname(mp3FilePath), { recursive: true });
  await writeFile(mp3FilePath, audioBuffer);

  if (format === `m4a`) {
    // Convert temporary mp3 to target m4a path
    const m4aFilePath = outputPath;

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
    instructions: instructionOverride,
    samples = 1,
  } = options;

  // Use provided base filename or generate from phrase
  // Keep pinyin characters (including tone marks) and word characters
  const baseFileName =
    options.baseFileName ??
    phrase.replaceAll(/[^\u4E00-\u9FFF\wāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜÜ]/g, ``);

  // Check mode: return whether at least one matching file already exists
  if (check) {
    return hasAtLeastOneSample(outputDir, baseFileName, voice, format);
  }

  const openai =
    options.openai ??
    new OpenAI({
      apiKey: nonNullable(openaiApiKey),
    });

  const generatedOutputDir = getGeneratedOutputDir(outputDir);

  // Generate the specified number of samples
  for (let i = 0; i < samples; i++) {
    const audioBuffer = await generateAudioFile(
      openai,
      phrase,
      voice,
      speed,
      instructionOverride,
    );

    // Always suffix generated files and keep them under generated/
    const sampleSuffix = nanoid();
    const outputPath = buildOutputFilePath(
      generatedOutputDir,
      baseFileName,
      voice,
      format,
      sampleSuffix,
    );
    await saveAudioFile(audioBuffer, outputPath, format);
  }

  return true;
}
