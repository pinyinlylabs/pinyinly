// @ts-check

/// <reference types="node" />

const { defineConfig } = require("@yarnpkg/types");
const { parseSyml } = require("@yarnpkg/parsers");
const fs = require("node:fs/promises");
const YAML = require("yaml");

const semver = require("semver");

/**
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Context} Context
 */

/**
 * This rule checks that Moon's toolchain versions match Yarn's. It's *supposed*
 * to just work, but sometimes Renovate gets things out of sync so this is a
 * safety net.
 *
 * @param {Context} ctx
 */
async function enforceMoonToolchainVersion(ctx) {
  const toolchainYaml = await fs.readFile(__dirname + "/.moon/toolchain.yml", {
    encoding: "utf-8",
  });
  const toolchainNodeVersion =
    /"(.+?)" # renovate: datasource=node-version depName=node versioning=node/.exec(
      toolchainYaml,
    )?.[1];
  const toolchainYarnVersion =
    /"(.+?)" # renovate: datasource=npm depName=@yarnpkg\/cli/.exec(
      toolchainYaml,
    )?.[1];

  const packageJson = JSON.parse(
    await fs.readFile(__dirname + "/package.json", { encoding: "utf-8" }),
  );
  const packageNodeVersion = packageJson.engines.node;
  const packageYarnVersion = packageJson.packageManager.split("yarn@")[1];

  if (toolchainNodeVersion != packageNodeVersion) {
    reportRootError(
      ctx,
      `Node version mismatch: ${toolchainNodeVersion} != ${packageNodeVersion}`,
    );
  }
  if (toolchainYarnVersion != packageYarnVersion) {
    reportRootError(
      ctx,
      `Yarn version mismatch: ${toolchainNodeVersion} != ${packageNodeVersion}`,
    );
  }
  invariant(toolchainNodeVersion == packageNodeVersion);
  invariant(toolchainYarnVersion == packageYarnVersion);
}

/**
 * This rule will enforce that a workspace MUST depend on the same version of
 * a dependency as the one used by the other workspaces.
 *
 * @param {Context} context
 */
function enforceConsistentDependenciesAcrossTheProject({ Yarn }) {
  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === `peerDependencies`) continue;

    for (const otherDependency of Yarn.dependencies({
      ident: dependency.ident,
    })) {
      if (
        otherDependency.type === `peerDependencies` ||
        otherDependency.workspace === dependency.workspace
      )
        continue;

      dependency.update(otherDependency.range);
    }
  }
}

/**
 * This rule will enforce that a the app API server and the app itself use
 * consistent versions of things. This seems like a sensible idea for things
 * like Sentry.
 *
 * @param {Context} context
 */
async function enforceConsistentAppPnpmAndYarnDependencies({ Yarn }) {
  // Read the pnpm-lock.yaml file and ensure that the dependencies are the same
  // as the ones in the yarn.lock file.
  const pnpmLock = await fs.readFile(
    __dirname + "/projects/app/api/pnpm-lock.yaml",
    { encoding: "utf-8" },
  );

  // Parse the pnpm-lock.yaml content into an object and query all directly
  // declared dependencies.
  const pnpmLockParsed = YAML.parse(pnpmLock);
  /** @type {Record<String, { specifier: string; version: string}>} */
  const pnpmDeps = pnpmLockParsed.importers["."].dependencies;

  const appWorkspace = Yarn.workspace({ cwd: "projects/app" });
  invariant(appWorkspace != null);
  const appDeps = Yarn.dependencies({ workspace: appWorkspace });

  // Ensure that any app dependencies that are also declared in the API server have the
  // same versions. This isn't totally bulletproof because it doesn't account
  // for transitive packages.
  for (const appDep of appDeps) {
    const pnpmDep = pnpmDeps[appDep.ident];
    if (pnpmDep != null) {
      invariant(appDep.resolution != null);
      if (appDep.resolution.version !== pnpmDep.version) {
        reportRootError(
          { Yarn },
          `projects/app dependency inconsistency (pnpm/yarn has locked different versions). Dependency ${appDep.ident} has different versions in ./api/pnpm-lock.yaml (${pnpmDep.version}) and ./yarn.lock (${appDep.resolution.version})`,
        );
      }
    }
  }
}

/**
 * Yarn constraint function that ensures all packages with a specific scope have
 * the same non-fuzzy version.
 *
 * @param {Context} ctx
 * @param {string} scope
 */
function enforceScopedDependencyVersions({ Yarn }, scope) {
  // Get all dependencies with the specified scope
  const scopedDependencies = Yarn.dependencies().filter((dependency) =>
    dependency.ident.startsWith(scope),
  );

  // Get the highest version of the scoped dependencies
  const highestVersion = scopedDependencies
    .map((dependency) => semver.minVersion(dependency.range))
    .filter((version) => version != null)
    .sort(semver.rcompare)[0]
    ?.toString();
  invariant(highestVersion != null);

  // Update all dependencies with the specified scope to the unique version
  for (const dependency of scopedDependencies) {
    dependency.update(highestVersion);
  }
}

/**
 * @param {boolean} condition
 * @returns {asserts condition}
 */
function invariant(condition) {
  if (!condition) {
    throw new Error(`invariant failed`);
  }
}

/**
 * This rule will enforce that `@types/<pkg>` dependencies are compatible with
 * the bare `<pkg>` dependency.
 *
 * It can be customized to allow more/less granular version matches, for example
 * `@types/react` should match the `major.minor` of `react`, but other packages
 * should just match the `major` because they're less maintained and have less
 * granular releases.
 *
 * @param {Context} ctx
 * @param {{ [identAtRange: string]: string }} [resolutions] Overrides e.g. `{
 * "eslint@^7": "~6.54.0" }` means allow `@types/eslint@~6.54.0` for `eslint@^7`
 */
function enforceStrictTypesCompatibility(ctx, resolutions = {}) {
  const { Yarn } = ctx;
  const unseen = new Set(Object.keys(resolutions));

  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === `peerDependencies`) continue;
    if (dependency.ident.startsWith(`@types/`)) continue;

    for (const typesDependency of Yarn.dependencies({
      ident: typesPackageIdent(dependency.ident),
    })) {
      if (typesDependency.type === `peerDependencies`) continue;

      const identAtRange = `${dependency.ident}@${dependency.range}`;
      unseen.delete(identAtRange);

      let expectedTypesRange =
        resolutions[identAtRange] ?? rangeMatchingMinor(dependency.range);

      typesDependency.update(expectedTypesRange);
    }
  }

  // To avoid accidentally keeping cruft around after packages have been
  // updated, ensure that all rules were used.
  if (unseen.size > 0)
    reportRootError(
      ctx,
      `Unused enforceStrictTypesCompatibility(…, resolutions) keys: ${Array.from(unseen).join(",")}`,
    );
}

/**
 * This rule will enforce that there are no unused Yarn patches in
 * .yarn/patches/. It works by checking the yarn.lock file and seeing which
 * patches are used, and then comparing that to the filesystem.
 *
 * @param {Context} ctx
 */
async function enforceAllPatchesAreUsed(ctx) {
  const lockFileParsed = parseSyml(
    await fs.readFile(__dirname + "/yarn.lock", { encoding: "utf-8" }),
  );

  const usedPatchPaths = new Set();

  for (const [, { resolution }] of Object.entries(lockFileParsed)) {
    const x = /#~\/(\.yarn\/patches\/@?[a-z0-9-\.]+\.patch)/g.exec(resolution);
    if (x != null) {
      for (const patchPath of x.slice(1)) {
        usedPatchPaths.add(patchPath);
      }
    }
  }

  for await (const path of fs.glob(`.yarn/patches/*.patch`)) {
    if (!usedPatchPaths.has(path)) {
      reportRootError(ctx, `Unused patch: ${path}`);
    }
  }
}

/**
 * Return the corresponding `@types/` package for a given package.
 *
 * @param {string} packageIdent
 */
function typesPackageIdent(packageIdent) {
  return `@types/${packageIdent.replace("/", "__").replace("@", "")}`;
}

/**
 * Return a semver range that matches the major and minor for a given range.
 *
 * @param {string} range
 */
function rangeMatchingMinor(range) {
  const version = semver.minVersion(range);
  if (version === null) {
    throw new Error(`Could not evalute semver.minVersion(${range})`);
  }
  // Using `1.1.x` style instead of `~1.1.0` because it's more intuitive. The
  // tilde rules are complicated (e.g. ~1.1.0 is different to ~1.1).
  return `${version.major}.${version.minor}.x`;
}

/**
 * @param {Context} context
 * @param {string} message
 */
function reportRootError({ Yarn }, message) {
  const rootWorkspace = Yarn.workspace({ cwd: "." });
  if (rootWorkspace === null) {
    throw new Error("Could not find root workspace");
  }
  rootWorkspace.error(message);
}

module.exports = defineConfig({
  async constraints(ctx) {
    await enforceAllPatchesAreUsed(ctx);
    await enforceConsistentDependenciesAcrossTheProject(ctx);
    await enforceScopedDependencyVersions(ctx, `@trpc/`);
    await enforceStrictTypesCompatibility(ctx, {
      "color@^4.2.3": "^3",
      "debug@^4.3.7": "^4 <=4.3.x",
      "eslint@^9.13.0": "^9 <=9.13.x",
      "pg@^8.12.0": "^8 <=8.12.x",
      "ws@^8.17.1": "^8 <=8.17.x",
      "yargs@^17.7.2": "^17 <=17.7.x",
    });
    await enforceMoonToolchainVersion(ctx);
    await enforceConsistentAppPnpmAndYarnDependencies(ctx);
  },
});
