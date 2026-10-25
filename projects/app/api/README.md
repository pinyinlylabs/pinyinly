This ensures `expo-server` is installed in the deployment because it's not bundled as part of
`expo export`. The Vercel function uses the SDK 58 `expo-server` adapter to serve the server export.

This is using `pnpm` because Vercel only supports Yarn 1 which doesn't support patching
dependencies. The `pnpm-workspace.yaml` file avoids `pnpm` getting confused by being in a Yarn
workspace.
