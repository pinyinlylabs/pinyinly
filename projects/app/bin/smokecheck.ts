import { execFile } from "node:child_process";
import path from "node:path";
import { nonNullable } from "@pinyinly/lib/invariant";
import { promisify } from "node:util";
import yargs from "yargs";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const appRootMarker = `id="root"`;
const appUrlSchema = z.url({ protocol: /^https?$/u });

export async function assertAppResponse(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `App returned HTTP ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  if (!html.includes(appRootMarker)) {
    throw new Error(`Response did not contain the Expo app root.`);
  }
}

async function checkApp(inputUrl: string) {
  const url = new URL(appUrlSchema.parse(inputUrl));
  const vercelToken = process.env[`VERCEL_TOKEN`];
  const response =
    vercelToken !== undefined && vercelToken.length > 0
      ? await fetchProtectedDeployment(url)
      : await fetch(url, {
          signal: nonNullable(
            AbortSignal.timeout(30_000) as RequestInit[`signal`],
          ),
        });
  await assertAppResponse(response);
  console.info(`App smoke check passed: ${url.href}`);
}

async function fetchProtectedDeployment(url: URL): Promise<Response> {
  const { stdout } = await execFileAsync(
    `yarn`,
    [
      `dlx`,
      `vercel@53.4.0`, // renovate: datasource=npm depName=vercel
      `curl`,
      `/`,
      `--deployment`,
      url.href,
      `--`,
      `--silent`,
      `--show-error`,
      `--fail`,
      `--max-time`,
      `30`,
    ],
    {
      cwd: path.resolve(import.meta.dirname, `..`),
      encoding: `utf8`,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 35_000,
    },
  );
  return new Response(stdout);
}

async function main() {
  await yargs(process.argv.slice(2))
    .usage(`$0 <url>`)
    .command(
      `$0 <url>`,
      `Check that an app responds with the Expo app root`,
      (yargs) =>
        yargs.positional(`url`, {
          describe: `URL of the app instance`,
          type: `string`,
          demandOption: true,
        }),
      async (argv) => checkApp(argv.url),
    )
    .version(false)
    .strict()
    .parseAsync();
}

if (import.meta.main) {
  await main();
}
