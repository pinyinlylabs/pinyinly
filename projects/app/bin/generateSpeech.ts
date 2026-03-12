import yargs from "yargs";
import type { Voice } from "./util/speech.js";
import { AVAILABLE_VOICES, generateSpeech } from "./util/speech.js";

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
          })
          .option(`check`, {
            describe: `Check which files exist without generating`,
            type: `boolean`,
            default: false,
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

        console.log(
          `${argv.check ? `Checking` : `Generating`} speech audio for phrase: "${argv.phrase}"`,
        );
        console.log(`Using voices: ${voices.join(`, `)}`);
        console.log(`Output directory: ${argv.outputDir}`);
        console.log(`Speed: ${argv.speed}`);
        console.log(`Format: ${argv.format}`);
        if (argv.baseFilename != null && argv.baseFilename !== ``) {
          console.log(`Base filename: ${argv.baseFilename}`);
        }

        const outcomes: Array<{ voice: Voice; ok: boolean }> = [];
        for (const voice of voices) {
          const baseFileName = argv.baseFilename ?? argv.phrase;

          const ok = await generateSpeech({
            phrase: argv.phrase,
            voice,
            outputDir: argv.outputDir,
            speed: argv.speed,
            format: argv.format as `mp3` | `m4a`,
            fileNameParts: [baseFileName, `:voice:`],
            check: argv.check,
          });
          outcomes.push({ voice, ok });
        }

        const success = outcomes.filter((x) => x.ok);
        const failed = outcomes.filter((x) => !x.ok);

        if (argv.check) {
          console.log(`\nCheck complete:`);
          console.log(`  Existing files: ${success.length}`);
          console.log(`  Missing files: ${failed.length}`);
        } else {
          console.log(
            `\nCompleted generating ${success.length} audio files for "${argv.phrase}"`,
          );
        }

        if (failed.length > 0) {
          console.log(
            `  Failed voices: ${failed.map((x) => x.voice).join(`, `)}`,
          );
        }
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
      `Generate files named shang4-{voice}.m4a`,
    )
    .example(
      `$0 '你好' --check`,
      `Check which audio files exist without generating`,
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
