import path from "node:path";
import { nonNullable } from "@pinyinly/lib/invariant";
import yargs from "yargs";

const appRootMarker = `id="root"`;

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
  const url = new URL(inputUrl);
  if (url.protocol !== `http:` && url.protocol !== `https:`) {
    throw new Error(`URL must use HTTP or HTTPS.`);
  }

  const signal = nonNullable(
    AbortSignal.timeout(30_000) as RequestInit[`signal`],
  );
  const response = await fetch(url, { signal });
  await assertAppResponse(response);
  console.info(`App smoke check passed: ${url.href}`);
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

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  await main();
}
