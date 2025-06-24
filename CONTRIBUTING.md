# Contribution guide

## Setup

Install [proto](https://moonrepo.dev/proto):

```sh
curl -fsSL https://moonrepo.dev/install/proto.sh | bash
proto use
```

Now you can start the app:

1. `npx inngest-cli@latest dev`
1. `moon run app:dev`.
1. Scan the QR code on your phone.

# Guides

## Writing a backend database migration

1. Edit the Drizzle schema.
1. Run `moon run app:dbGenerate`

## Debugging Expo server

In VS Code open a `JavaScript Debug Terminal` from the command palette
<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>p</kbd>, then run commands as normal e.g.

```sh
moon run app:dev
```

This works because VS Code configures `NODE_OPTIONS` in the terminal to
`--require` a special `bootloader.js`, so it's important that moon tasks that
define `NODE_OPTIONS` pass through the existing value.

## Adding a cross project dependency

Add to `dependsOn:` within `moon.yml`, then run:

```sh
moon sync projects
```

This will update `package.json/dependencies`, `tsconfig.json/references`, `tsconfig.json/compilerOptions/paths`.

## Upgrading Yarn

Inside `toolchain.yml` edit `node.yarn.version` and update the version. Run
`moon sync projects` to apply the change.

## Upgrading Moon

```sh
proto outdated --update
proto use
```

## Upgrading Proto

```sh
proto upgrade
```

## Upgrading Node.js

Edit `.moon/toolchain.yml` edit `node.version`.

```sh
moon run node-version
```

Moon will automatically synchronize `package.json` `engines.node`, and it will
use proto to download and install the right version of Node.js.

## Upgrading a transitive Yarn dependency (e.g. for security patch)

A normal `yarn up ___` won't work if no workspace depends on it directly, so you
need to use `--recursive`. For example to upgrade `tar` use:

```sh
yarn up -R tar
```

## Upgrading a dependency with a Yarn patch

Yarn doesn't automatically migrate patches, so you need to migrate it manually.

```sh
yarn patch expo-image
patch -d /private/var/folders/fs/...snip.../T/xfs-33350073/user < .yarn/patches/expo-image-npm-1.12.9-116d224baf.patch
yarn patch-commit -s /private/var/folders/fs/...snip.../T/xfs-33350073/user
rm .yarn/patches/expo-image-npm-1.12.9-116d224baf.patch
```

## Updating app icons

Icons can be exported directly from Figma. Frames are labelled appropriately
such that everything in Figma can be exported to the
`projects/app/src/assets` directory.

## Writing Pinyin on macOS

1. Enable the `Pinyin - Simplified` keyboard.
1. Type the pinyin without the tone (e.g. `hao`).
1. Press <kbd>Tab</kbd> to cycle through each tone.
1. Press <kbd>Enter</kbd> to accept the pinyin.

Example: to write `hǎo` type <kbd>h</kbd> <kbd>a</kbd> <kbd>o</kbd> <kbd>Tab</kbd> <kbd>Tab</kbd> <kbd>Tab</kbd> <kbd>Enter</kbd>.

## Local development with Sign in with Apple for Web

1. Set `EXPO_TUNNEL_SUBDOMAIN` in `projects/app/.env.local` to something like
   `pinyinly-<yourname>`.
1. In [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list/serviceId) edit the Service ID for the app and click **Configure**.
1. Click the + button for **Website URLs**, in the **Return URLs** box add
   `https://<EXPO_TUNNEL_SUBDOMAIN>.ngrok.io/api/auth/login/apple/callback`
   (replace `<EXPO_TUNNEL_SUBDOMAIN>` with the value you chose).
1. Save the changes.
1. Start Expo via `moon run app:dev -- --tunnel`.

## iOS Device Enrolment

Add the iPhone (https://docs.expo.dev/build/internal-distribution/#configure-app-signing):

```sh
npx -y eas-cli device:create
npx -y eas-cli device:rename
```

Add the device to the provisioning profile:

```
npx -y eas-cli build --profile=preview --platform=ios
```

It's important that this is done using the interactive version of the command so
that you can authenticate your Apple Developer account and have it synchronize
the provisioning profile.

## Manually marking a Drizzle migration as "run"

In local development it can be useful to merge together migrations without
losing local data. In this case you can manually modify the Drizzle migration
state in `drizzle.__drizzle_migrations`.

Copy the timestamp from `_journal.json`, and the hash is the lower-case SHA256
of the `.sql` migration file.

## Debugging API server running on Vercel

There have been compatibility issues between @expo/server and Vercel in the
past. To help debug these it's useful to run the Vercel server locally in a
JavaScript Debug Terminal.

To do this you need build the Expo web output, and then point `app/api/index.cjs` to the output directory, then run the vercel dev server.

For example you can run something like this:

```sh
cd projects/app
moon run buildVercelExpo --cache=write
```

Now edit `app/api/index.cjs` to point to it:

```diff
-build: require(`path`).join(__dirname, `../dist/vercel/server`),
+build: require(`path`).join(__dirname, `../dist/.cache/vercel-expo/server`),
```

Finally run the vercel dev server: (e.g. with extra logging)

```sh
DEBUG=inngest:* INNGEST_DEV=1 npx vercel dev --listen 8081
```

## Testing Vercel gateway errors locally

Create a `app/api/trpc/replicache.push+api.ts` file containing:

```ts
export function POST() {
  return new Response(
    `An error occurred with your deployment

FUNCTION_INVOCATION_TIMEOUT

syd1::m6bjf-1738011631946-6a41c1b3d99c`,
    {
      status: 504,
      headers: {
        "x-vercel-error": `FUNCTION_INVOCATION_TIMEOUT`,
        "x-vercel-id": `syd1::gqwrj-1738016771255-d9363c982187`,
      },
    },
  );
}
```

Customise this to suit your scenario.

## Environment variables

- **Vercel**: There should be no `EXPO_PUBLIC_` environment variables configured
  in Vercel's environment variables. `EXPO_PUBLIC_` are inlined at build-time by
  metro so there's no effect from having them defined in the environment at
  runtime too. However other environment variables like `DATABASE_URL`
  **should** be defined here as they are read at run-time.

  **`SENTRY_DSN`**: Needs to be defined here, even though it's typically defined
  using `EXPO_PUBLIC_SENTRY_DSN` in other places, the `Sentry.init()` call is
  not in code compiled by Metro and instead is in the entry-point
  `projects/app/api/index.cjs`.

- **`EXPO_PUBLIC_`**: These are inlined into the build and exposed publicly. These
  need to be configured anywhere that builds are done:

  - `.github/workflows/release.yml`
  - `.github/workflows/expo-eas-build.yml`
  - `.github/workflows/pr.yml`

  This means they need to be declared in Github's Action Secrets too.

  Expo's Metro plugin is patched to error if `HHH_STRICT_EXPO_ENV_VARS` is set
  when a `EXPO_PUBLIC_` variable is missing. This helps catch errors during
  build before they reach users.

## Debugging nativewind

First test that tailwind works:

```
yarn tailwindcss --input src/global.css
```

## Updating the bill of materials

The bill of materials is created by looking at what packages were bundled by
Metro into client bundles. Client bundles are actually being distributed, and
that's the important point for many OSS licenses.

Bundling data from Metro is collected from data generated by expo-atlas.

To update the bill of materials run:

```
moon run app:buildBillOfMaterials
```
