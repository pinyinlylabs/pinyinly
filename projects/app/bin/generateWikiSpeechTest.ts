import { writeFile, mkdir } from "@pinyinly/lib/fs";
import { createHash } from "crypto";
import { dirname } from "node:path";
import yargs from "yargs";

// Available OpenAI TTS voices
const AVAILABLE_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof AVAILABLE_VOICES)[number];

interface GenerateAudioOptions {
  phrase: string;
  voices?: Voice[];
  outputDir?: string;
  speed?: number;
}

function createMD5(buffer: Buffer): string {
  const hash = createHash("md5");
  hash.update(buffer);
  return hash.digest("hex");
}

async function saveAudioFile(
  audioBuffer: Buffer,
  phrase: string,
  voice: Voice,
  outputDir: string,
): Promise<string> {
  const md5Hash = createMD5(audioBuffer);
  
  // Create filename similar to existing pattern: shang4-alloy.m4a
  // For now, we'll use the phrase as the base name and convert mp3 to m4a if needed
  const baseFileName = phrase.replace(/[^\u4e00-\u9fff\w]/g, ""); // Keep only Chinese characters and word characters
  const fileName = `${baseFileName}-${voice}.mp3`; // Start with mp3, may convert later
  const filePath = `${outputDir}/${fileName}`;
  
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, audioBuffer);
  
  console.log(`Saved audio file: ${filePath}`);
  return filePath;
}

async function generateWikiSpeech(options: GenerateAudioOptions): Promise<void> {
  const {
    phrase,
    voices = AVAILABLE_VOICES,
    outputDir = `./wiki-audio`,
    speed = 1.0,
  } = options;

  console.log(`Generating speech audio for phrase: "${phrase}"`);
  console.log(`Using voices: ${voices.join(", ")}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Speed: ${speed}`);

  // For now, just create dummy files to test the file creation logic
  for (const voice of voices) {
    try {
      const dummyBuffer = Buffer.from(`dummy audio content for ${phrase} with ${voice} voice`);
      await saveAudioFile(dummyBuffer, phrase, voice, outputDir);
    } catch (error) {
      console.error(`Failed to create file for voice "${voice}":`, error);
    }
  }

  console.log(`\nCompleted creating ${voices.length} test files for "${phrase}"`);
}

// CLI interface
const argv = await yargs(process.argv.slice(2))
  .command(
    "$0 <phrase>",
    "Generate speech audio files for a Chinese phrase using OpenAI TTS",
    (yargs) => {
      return yargs
        .positional("phrase", {
          describe: "Chinese phrase to generate speech for",
          type: "string",
          demandOption: true,
        })
        .option("voices", {
          describe: "Comma-separated list of voices to use",
          type: "string",
          default: AVAILABLE_VOICES.join(","),
        })
        .option("output-dir", {
          describe: "Output directory for audio files",
          type: "string",
          default: "./wiki-audio",
        })
        .option("speed", {
          describe: "Speech speed (0.25 to 4.0)",
          type: "number",
          default: 1.0,
        });
    },
    async (argv) => {
      const voices = argv.voices
        .split(",")
        .map((v) => v.trim() as Voice)
        .filter((v) => AVAILABLE_VOICES.includes(v));
      
      if (voices.length === 0) {
        console.error("No valid voices specified. Available voices:", AVAILABLE_VOICES.join(", "));
        process.exit(1);
      }

      await generateWikiSpeech({
        phrase: argv.phrase,
        voices,
        outputDir: argv.outputDir,
        speed: argv.speed,
      });
    },
  )
  .option("help", {
    alias: "h",
    description: "Show help",
  })
  .example("$0 '你好'", "Generate audio files for '你好' with all voices")
  .example("$0 '你好' --voices alloy,nova", "Generate audio files with only alloy and nova voices")
  .example("$0 '你好' --output-dir ./custom-output", "Generate audio files in custom directory")
  .demandCommand(1, "You must provide a Chinese phrase to generate speech for")
  .strict()
  .parseAsync();