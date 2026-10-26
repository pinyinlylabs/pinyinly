import { nonNullable } from "@pinyinly/lib/invariant";
import makeDebug from "debug";
import yargs from "yargs";
import { z } from "zod";

const debug = makeDebug(`pyly`);
const appRootMarker = `id="root"`;
const appUrlSchema = z.url({ protocol: /^https?$/u });

export async function assertAppResponse(response: Response): Promise<void> {
  if (!response.ok) {
    debug(`App returned HTTP %d %s`, response.status, response.statusText);
    throw new Error(
      `App returned HTTP ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  if (!html.includes(appRootMarker)) {
    debug(`Response did not contain the Expo app root: %s`, html);
    throw new Error(`Response did not contain the Expo app root.`);
  }
}

async function checkApp(inputUrl: string) {
  const url = new URL(appUrlSchema.parse(inputUrl));
  const vercelAutomationBypassSecret =
    process.env[`VERCEL_AUTOMATION_BYPASS_SECRET`];
  const response = await fetch(url, {
    headers:
      vercelAutomationBypassSecret !== undefined &&
      vercelAutomationBypassSecret.length > 0
        ? { "x-vercel-protection-bypass": vercelAutomationBypassSecret }
        : undefined,
    signal: nonNullable(AbortSignal.timeout(30_000) as RequestInit[`signal`]),
  });
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
      async (argv) => {
        if (argv[`debug`] === true) {
          makeDebug.enable(`${debug.namespace},${debug.namespace}:*`);
        }
        await checkApp(argv.url);
      },
    )
    .option(`debug`, {
      type: `boolean`,
      description: `Log additional diagnostic details when the check fails`,
      default: false,
    })
    .epilog(
      `If VERCEL_AUTOMATION_BYPASS_SECRET is set, it is sent as the Vercel deployment protection bypass header.`,
    )
    .version(false)
    .strict()
    .parseAsync();
}

if (import.meta.main) {
  await main();
}
