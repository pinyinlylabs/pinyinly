import { IS_CI } from "#util/env.js";
import chalk from "chalk";
import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeAudioFile } from "./ffmpeg";

const projectRootDir = path.join(import.meta.dirname, `../..`);
const wikiDir = path.join(projectRootDir, `src/client/wiki`);

describe(`speech files`, async () => {
  const audioGlob = path.join(wikiDir, `**/*.{mp3,m4a,aac}`); // adjust this to your structure

  for await (const filePath of fs.glob(audioGlob)) {
    const projectRelPath = path.relative(projectRootDir, filePath);

    describe(projectRelPath, async () => {
      it(`duration is correct`, async () => {
        const { duration } = await analyzeAudioFile(filePath);

        expect(duration.fromDecoding).toEqual(duration.fromMetadata);
      });

      it(`loudness is within allowed tolerance`, async () => {
        // ChatGPT recommends to target -18 LUFS because:
        //
        // | Use Case                     | Target LUFS                              | Notes                                                       |
        // | ---------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
        // | **Spotify / Apple Music**    | `-14 LUFS`                               | Most streaming platforms normalize to this                  |
        // | **YouTube**                  | `-14 to -13 LUFS`                        | YouTube doesn't officially disclose, but `-14 LUFS` is safe |
        // | **Podcast**                  | `-16 LUFS`                               | Mono or low-bandwidth optimized                             |
        // | **Broadcast (TV / Radio)**   | `-23 LUFS` (Europe) <br> `-24 LUFS` (US) | EBU R128 (Europe), ATSC A/85 (US)                           |
        // | **Game audio / apps**        | `-16 to -20 LUFS`                        | Depends on platform & purpose                               |
        // | **Speech for learning apps** | `-18 to -16 LUFS`                        | Good compromise between clarity and comfort                 |
        //
        // Target **-18 LUFS** because:
        //
        // - 🎧 Less aggressive than music
        // - 🧠 Good for repeated listening
        // - 📱 Comfortable on mobile speakers
        // - 🔄 Balances speech clarity and ear fatigue
        const targetLufs = -18;
        const allowedTolerance = 1;

        const { loudnorm } = await analyzeAudioFile(filePath);

        const loudness = loudnorm.input_i;
        const delta = Math.abs(loudness - targetLufs);

        if (delta > allowedTolerance) {
          const ext = path.extname(projectRelPath); // To tell ffmpeg to keep the same container.
          const fixedSuffix = `-loudness-fix${ext}`; // Use a suffix specific to this test to avoid other tests from clobbering the same file.
          const fixCommand = `ffmpeg -i "${filePath}" -af loudnorm=I=-18:TP=-1.5:LRA=5:linear=true:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:print_format=summary "${filePath}${fixedSuffix}"`;

          if (IS_CI) {
            console.warn(
              chalk.yellow(
                `To fix this, re-run the tests outside CI or run: `,
                chalk.dim(fixCommand),
              ),
            );
          } else {
            execSync(fixCommand);
          }
        }

        expect(delta).toBeLessThanOrEqual(allowedTolerance);
      });
    });
  }
});
