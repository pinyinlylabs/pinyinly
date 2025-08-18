import { mkdir, writeFile } from "@pinyinly/lib/fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import OpenAI from "openai";
import yargs from "yargs";

// Available OpenAI TTS voices
const AVAILABLE_VOICES = [
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
type Voice = (typeof AVAILABLE_VOICES)[number];

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

interface GenerateAudioOptions {
  phrase: string;
  voices?: Voice[];
  outputDir?: string;
  speed?: number;
  format?: `mp3` | `m4a`;
  baseFileName?: string;
}

async function generateAudioFile(
  openai: OpenAI,
  text: string,
  voice: Voice,
  speed = 1,
): Promise<Buffer> {
  console.log(`Generating audio for "${text}" with voice "${voice}"...`);

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

function convertMp3ToM4a(
  mp3Path: string,
  m4aPath: string,
): void {
  console.log(`Converting ${mp3Path} to ${m4aPath}...`);

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
    throw new Error(
      `FFmpeg failed: ${result.stderr.toString()}`,
    );
  }
}

async function saveAudioFile(
  audioBuffer: Buffer,
  phrase: string,
  voice: Voice,
  outputDir: string,
  format: `mp3` | `m4a` = `m4a`,
  baseFileName?: string,
): Promise<string> {
  // Use provided base filename or generate from phrase
  const finalBaseFileName =
    baseFileName ?? phrase.replaceAll(/[^\u4E00-\u9FFF\w]/g, ``); // Keep only Chinese characters and word characters

  // Save as mp3 first
  const mp3FileName = `${finalBaseFileName}-${voice}.mp3`;
  const mp3FilePath = `${outputDir}/${mp3FileName}`;

  await mkdir(path.dirname(mp3FilePath), { recursive: true });
  await writeFile(mp3FilePath, audioBuffer);

  if (format === `m4a`) {
    // Convert to m4a
    const m4aFileName = `${finalBaseFileName}-${voice}.m4a`;
    const m4aFilePath = `${outputDir}/${m4aFileName}`;

    try {
      convertMp3ToM4a(mp3FilePath, m4aFilePath);
      // Remove the mp3 file after successful conversion
      const fs = await import(`node:fs/promises`);
      await fs.unlink(mp3FilePath);
      console.log(`Saved audio file: ${m4aFilePath}`);
      return m4aFilePath;
    } catch (error: unknown) {
      console.warn(`Failed to convert to m4a, keeping mp3 format: ${String(error)}`);
      console.log(`Saved audio file: ${mp3FilePath}`);
      return mp3FilePath;
    }
  } else {
    console.log(`Saved audio file: ${mp3FilePath}`);
    return mp3FilePath;
  }
}

async function generateWikiSpeech(
  options: GenerateAudioOptions,
): Promise<void> {
  const {
    phrase,
    voices = AVAILABLE_VOICES,
    outputDir = `./wiki-audio`,
    speed = 1,
    format = `m4a`,
    baseFileName,
  } = options;

  console.log(`Generating speech audio for phrase: "${phrase}"`);
  console.log(`Using voices: ${voices.join(`, `)}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Speed: ${speed}`);
  console.log(`Format: ${format}`);
  if (baseFileName != null && baseFileName !== ``) {
    console.log(`Base filename: ${baseFileName}`);
  }

  // Check if OPENAI_API_KEY is set
  if (process.env[`OPENAI_API_KEY`] == null || process.env[`OPENAI_API_KEY`] === ``) {
    console.error(`Error: OPENAI_API_KEY environment variable is not set.`);
    console.error(
      `Please set your OpenAI API key: export OPENAI_API_KEY='your-api-key'`,
    );
    throw new Error(`OPENAI_API_KEY environment variable is not set`);
  }

  const openai = new OpenAI();
  const createdFiles: string[] = [];

  for (const voice of voices) {
    try {
      const audioBuffer = await generateAudioFile(openai, phrase, voice, speed);
      const filePath = await saveAudioFile(
        audioBuffer,
        phrase,
        voice,
        outputDir,
        format,
        baseFileName,
      );
      createdFiles.push(filePath);
    } catch (error) {
      console.error(`Failed to generate audio for voice "${voice}":`, error);
    }
  }

  console.log(
    `\nCompleted generating ${createdFiles.length} audio files for "${phrase}"`,
  );
  console.log(`Created files:`);
  for (const file of createdFiles) {
    console.log(`  - ${file}`);
  }
}

// CLI interface
async function main() {
  await yargs(process.argv.slice(2))
    .command(
      `$0 <phrase>`,
      `Generate speech audio files for a Chinese phrase using OpenAI TTS`,
      (yargs) => {
        return yargs
          .positional(`phrase`, {
            describe: `Chinese phrase to generate speech for`,
            type: `string`,
            demandOption: true,
          })
          .option(`voices`, {
            describe: `Comma-separated list of voices to use`,
            type: `string`,
            default: AVAILABLE_VOICES.join(`,`),
          })
          .option(`output-dir`, {
            describe: `Output directory for audio files`,
            type: `string`,
            default: `./wiki-audio`,
          })
          .option(`speed`, {
            describe: `Speech speed (0.25 to 4.0)`,
            type: `number`,
            default: 1,
          })
          .option(`format`, {
            describe: `Output audio format`,
            type: `string`,
            choices: [`mp3`, `m4a`],
            default: `m4a`,
          })
          .option(`base-filename`, {
            describe: `Base filename to use (defaults to cleaned phrase)`,
            type: `string`,
          });
      },
      async (argv) => {
        const voices = argv.voices
          .split(`,`)
          .map((v) => v.trim() as Voice)
          .filter((v) => AVAILABLE_VOICES.includes(v));

        if (voices.length === 0) {
          console.error(
            `No valid voices specified. Available voices:`,
            AVAILABLE_VOICES.join(`, `),
          );
          throw new Error(`No valid voices specified`);
        }

        await generateWikiSpeech({
          phrase: argv.phrase,
          voices,
          outputDir: argv.outputDir,
          speed: argv.speed,
          format: argv.format as `mp3` | `m4a`,
          baseFileName: argv.baseFilename,
        });
      },
    )
    .option(`help`, {
      alias: `h`,
      description: `Show help`,
    })
    .example(`$0 '你好'`, `Generate audio files for '你好' with all voices`)
    .example(
      `$0 '你好' --voices alloy,nova`,
      `Generate audio files with only alloy and nova voices`,
    )
    .example(
      `$0 '你好' --output-dir ./custom-output`,
      `Generate audio files in custom directory`,
    )
    .example(
      `$0 '你好' --format mp3`,
      `Generate audio files in MP3 format instead of M4A`,
    )
    .example(
      `$0 '上' --base-filename shang4`,
      `Generate files named shang4-{voice}.m4a for proper wiki structure`,
    )
    .demandCommand(
      1,
      `You must provide a Chinese phrase to generate speech for`,
    )
    .strict()
    .parseAsync();
}

// Run the main function
try {
  await main();
} catch (error: unknown) {
  console.error(`Error:`, error);
  throw error;
}
