import makeDebug from "debug";
import { readFile } from "node:fs/promises";
import yargs from "yargs";
import { jsonStringifyShallowIndent } from "../src/util/json.js";
import { writeUtf8FileIfChanged } from "./util/fs.js";

const debug = makeDebug(`hhh`);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 <paths..>`, `format .asset.json files`)
  .positional(`paths`, {
    type: `string`,
    describe: `path to .asset.json file`,
    demandOption: true,
  })
  .array(`paths`)
  .option(`indentLevels`, {
    type: `number`,
  })
  .option(`debug`, {
    type: `boolean`,
    default: false,
  })
  .version(false)
  .strict()
  .parseAsync();

if (argv.debug) {
  makeDebug.enable(`${debug.namespace},${debug.namespace}:*`);
}

for (const path of argv.paths) {
  const existingContent = await readFile(path, {
    encoding: `utf8`,
  });
  const updated = await writeUtf8FileIfChanged(
    path,
    jsonStringifyShallowIndent(JSON.parse(existingContent), argv.indentLevels),
  );
  debug((updated ? `✨ saved` : `skipped`) + `: %s`, path);
}
