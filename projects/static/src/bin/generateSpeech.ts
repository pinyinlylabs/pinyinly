import { glob, mkdir, rename, rm } from "@pinyinly/lib/fs";
import { createHash } from "crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { dirname } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { phrases, voices } from "../speechData";

yargs(hideBin(process.argv))
  .usage(
    "$0",
    "generate audio files for each phrase and voice",
    (y) => y,
    async () => {
      for (const voice of voices) {
        for (const phrase of phrases) {
          const tempAacPath = "speech.aac";
          spawnSync("say", [
            "-v",
            voice.name,
            "-r",
            "50",
            "-o",
            tempAacPath,
            phrase.text,
          ]);
          const tempM4aPath = "speech.m4a";
          spawnSync("ffmpeg", [
            "-i",
            tempAacPath,
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            tempM4aPath,
          ]);
          const md5Hash = await createMD5(tempM4aPath);
          const destPathPrefix = `public/speech/${phrase.id}/${voice.id}-`;
          const destPath = `${destPathPrefix}${md5Hash}.m4a`;
          await mkdir(dirname(destPath), { recursive: true });

          // Delete all existing files for the given phase and voice.
          for (const path of await glob(`${destPathPrefix}*`)) {
            const isStale = path !== destPath;
            if (isStale) {
              console.log(`Deleting stale file: ${path}`);
            }
            await rm(path);
          }
          await rename(tempM4aPath, destPath);
        }
      }
    },
  )
  .parse();

function createMD5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");

    const readStream = createReadStream(filePath);
    readStream.on("data", (data) => {
      hash.update(data);
    });
    readStream.on("end", () => {
      resolve(hash.digest("hex"));
    });
    readStream.on("error", (err) => reject(err));
  });
}
