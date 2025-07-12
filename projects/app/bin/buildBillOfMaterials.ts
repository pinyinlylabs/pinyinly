import { mapSetAdd, sortComparatorString } from "#util/collections.ts";
import { jsonStringifyShallowIndent } from "#util/json.ts";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import makeDebug from "debug";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import resolvePackagePath from "resolve-package-path";
import { z } from "zod/v4";
import { writeUtf8FileIfChanged } from "./util/fs.js";

const debug = makeDebug(`pyly`);

const projectDir = path.join(import.meta.dirname, `../`);

// Move Zod schema definition to the top
const packageJsonSchema = z.object({
  license: z.string().min(1).optional(),
});

// Construct the path to the atlas.jsonl file
const atlasPath = path.join(projectDir, `.expo/atlas.jsonl`);

// Read the file as UTF-8 text
const atlasContent = await readFile(atlasPath, `utf8`);

// Split the content into separate lines and filter out empty lines
const atlasLines = atlasContent
  .split(`\n`)
  .filter((line) => line.trim().length > 0);

// {"name":"expo-atlas","version":"0.4.0"}
const atlasHeaderSchema = z.object({
  name: z.string(),
  version: z.string(),
});

// Validate the first line of atlas.jsonl against atlasSchema
if (atlasLines[0] == null || atlasLines[0].trim() === ``) {
  throw new Error(`atlas.jsonl is empty or missing first line`);
}
try {
  const firstLineJson: unknown = JSON.parse(atlasLines[0]);
  atlasHeaderSchema.parse(firstLineJson);
  debug(`First line of atlas.jsonl is valid.`);
} catch (error) {
  console.error(`First line of atlas.jsonl is invalid:`, error);
  throw error;
}

// Update schema for package arrays to validate optional non-empty string 'package' field
const packageSchema = z
  .object({
    package: z.string().min(1).optional(),
    // ...other fields are ignored
  })
  .loose();

const bundleLineSchema = z
  .tuple([
    // Index 0
    z
      .enum([`ios`, `android`, `web`])
      .describe(`Platform: ios, android, or web`),
    // Index 1
    z.string().describe(`Project directory`),
    // Index 2
    z.string().describe(`Repo root directory`),
    // Index 3
    z.string().describe(`Entrypoint for the bundle`),
    // Index 4
    z
      .enum([`client`, `node`])
      .describe(`Execution environment: client or node`),
    // Index 5
    z
      .array(packageSchema)
      .describe(`First array of all packages used in the bundle`),
    // Index 6
    z
      .array(packageSchema)
      .describe(
        `Second array of all packages used in the bundle (purpose unknown)`,
      ),
    // Index 7
    z.object({}).loose().describe(`Build config object`),
    // Index 8
    z.object({}).loose().describe(`Serializer config object`),
  ])
  .describe(
    `A bundle line: [platform, projectDir, repoRoot, entrypoint, environment, packages1, packages2, buildConfig, serializerConfig]`,
  );

// Validate each bundle line
const bundleErrors: { line: number; error: unknown }[] = [];
for (let i = 1; i < atlasLines.length; i++) {
  const line = atlasLines[i];
  if (line == null) {
    continue;
  }
  try {
    const bundleLine: unknown = JSON.parse(line);
    bundleLineSchema.parse(bundleLine);
  } catch (error) {
    bundleErrors.push({ line: i + 1, error });
  }
}
if (bundleErrors.length > 0) {
  console.error(`Invalid bundle lines in atlas.jsonl:`);
  for (const { line, error } of bundleErrors) {
    console.error(`  Line ${line}:`, error);
  }
  throw new Error(`atlas.jsonl contains invalid bundle lines.`);
} else {
  debug(`All bundle lines in atlas.jsonl are valid.`);
}

const clientPackagesByPlatform = {
  web: new Set<string>(),
  ios: new Set<string>(),
  android: new Set<string>(),
  all: new Set<string>(), // For combined client packages as a fallback
};

// Output entrypoint and number of packages for each bundle line
for (const line of atlasLines.slice(1)) {
  const parsed = bundleLineSchema.parse(JSON.parse(line));
  const platform = parsed[0];
  const environment = parsed[4];
  const packages1 = parsed[5];
  const packages2 = parsed[6];

  if (environment !== `client`) {
    // Skip non-client environments
    continue;
  }

  for (const pkg of [...packages1, ...packages2]) {
    if (pkg.package == null) {
      continue;
    }

    clientPackagesByPlatform[platform].add(pkg.package);
  }
}

const licenseMap = new Map<
  /* package name */ string,
  /* license string */ string
>([
  // Defaults in-case the package does not have a license specified.
  [`posthog-react-native`, `MIT`],
  [`posthog-js`, `MIT`],
  [`replicache`, `Apache-2.0`],
]);

// Collect all licenses from the client packages.
for (const [, pkgNames] of Object.entries(clientPackagesByPlatform)) {
  for (const pkgName of pkgNames) {
    if (licenseMap.has(pkgName)) {
      continue; // Skip if already processed
    }

    const packageJsonPath = resolvePackagePath(pkgName, import.meta.url);
    invariant(
      packageJsonPath !== null,
      `couldn't resolve package path for ${pkgName}`,
    );
    const pkgJsonContent = await readFile(packageJsonPath, `utf8`);
    const pkgJson = packageJsonSchema.parse(JSON.parse(pkgJsonContent));
    if (pkgJson.license == null) {
      console.error(`Error: Package ${pkgName} does not have a known license.`);
    } else {
      licenseMap.set(pkgName, pkgJson.license);
    }
  }
}

for (const [platform, pkgNames] of Object.entries(clientPackagesByPlatform)) {
  const outFile = path.join(
    projectDir,
    `src/data/bom/billOfMaterials.${platform}.asset.json`,
  );

  if (pkgNames.size === 0) {
    await unlink(outFile).catch(() => null);
    continue;
  }

  const licenses2 = new Map<
    /* license */ string,
    Set</* package name */ string>
  >();
  for (const pkgName of pkgNames) {
    const license = nonNullable(licenseMap.get(pkgName));
    mapSetAdd(licenses2, license, pkgName);
  }

  const licenses3 = [...licenses2.entries()]
    .sort(sortComparatorString(([license]) => license))
    .map(([license, pkgNamesSet]) => [license, [...pkgNamesSet].sort()]);

  await writeUtf8FileIfChanged(outFile, jsonStringifyShallowIndent(licenses3));
}
