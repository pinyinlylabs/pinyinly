import { IS_CI } from "#util/env.js";
import { analyzeAudioFile } from "@pinyinly/expo-audio-sprites/server";
import { glob } from "@pinyinly/lib/fs";
import chalk from "chalk";
import { execSync } from "node:child_process";
import path from "node:path";
import { describe, expect, test } from "vitest";

const projectRootDir = path.join(import.meta.dirname, `../..`);
const wikiDir = path.join(projectRootDir, `src/client/wiki`);

describe(`speech files`, async () => {
  const audioGlob = path.join(wikiDir, `**/*.{mp3,m4a,aac}`); // adjust this to your structure
  const fixTag = `-fix`;

  for (const filePath of await glob(audioGlob)) {
    if (filePath.includes(fixTag)) {
      continue;
    }

    const projectRelPath = path.relative(projectRootDir, filePath);

    describe(projectRelPath, async () => {
      test(`container and real duration is within allowable tolerance and not corrupted`, async () => {
        const { duration } = await analyzeAudioFile(filePath);

        const delta = Math.abs(duration.fromStream - duration.fromContainer);
        expect(delta).toBeLessThanOrEqual(0.02); // Allow 20ms tolerance
      });

      test(`audio file is not empty (based on duration)`, async () => {
        const { duration } = await analyzeAudioFile(filePath);

        expect(duration.fromStream).toBeGreaterThanOrEqual(0.5); // Speech must be at least 500ms
      });

      test(`loudness is within allowed tolerance`, async () => {
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
          const fixedSuffix = `-loudness${fixTag}${ext}`; // Use a suffix specific to this test to avoid other tests from clobbering the same file.
          const fixedFilePath = `${filePath}${fixedSuffix}`;
          const fixCommand = `ffmpeg -y -i "${filePath}" -af loudnorm=I=-18:TP=-1.5:LRA=5:linear=true:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:print_format=summary "${fixedFilePath}"`;

          execOrLogFixCommand(fixCommand, fixedFilePath);
        }

        expect(delta).toBeLessThanOrEqual(allowedTolerance);
      });

      test(`silence is trimmed`, async () => {
        const { silences, duration } = await analyzeAudioFile(filePath);

        // Allow for very small amounts of silence at start/end (e.g., 0.1 seconds)
        const allowedStartOrEndOffset = 0.1;
        const totalDuration = duration.fromStream;

        const expectedStart = 0;
        const expectedEnd = totalDuration;
        let start = expectedStart;
        let end = expectedEnd;

        for (const silence of silences) {
          // Check if silence is at the start
          if (silence.start <= allowedStartOrEndOffset) {
            start = Math.max(start, silence.end);
            continue;
          }

          // Check if silence is at the end
          if (silence.end >= totalDuration - allowedStartOrEndOffset) {
            end = Math.min(end, silence.start);
            continue;
          }
        }

        if (start > expectedStart || end < expectedEnd) {
          const ext = path.extname(projectRelPath);
          const fixedSuffix = `-silence${fixTag}${ext}`;
          const fixedFilePath = `${filePath}${fixedSuffix}`;
          const fixCommand = `ffmpeg -y -i "${filePath}" -af atrim=start=${start}:end=${end} "${fixedFilePath}"`;

          execOrLogFixCommand(fixCommand, fixedFilePath);
        }

        expect(start).toBe(expectedStart);
        expect(end).toBe(expectedEnd);
      });
    });
  }
});

function execOrLogFixCommand(fixCommand: string, fixedFilePath: string): void {
  if (IS_CI) {
    console.warn(
      chalk.yellow(
        `To fix this, re-run the test outside CI or run: `,
        chalk.dim(fixCommand),
      ),
    );
  } else {
    execSync(
      `(echo "% ${fixCommand}"; ${fixCommand}) > "${fixedFilePath}.log" 2>&1`,
    );
    console.warn(chalk.yellow(chalk.bold(`Created:`), fixedFilePath));
  }
}
