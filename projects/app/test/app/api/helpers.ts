import assert from "node:assert/strict";
import { spawn as _spawn } from "node:child_process";
import { TestContext } from "node:test";
import { setTimeout } from "node:timers/promises";

export type TestExpoServer = Awaited<ReturnType<typeof testExpoServer>>;

export function testExpoServer(t: TestContext) {
  t.diagnostic(`Starting Expo server...`);

  // Use a different port each time to avoid conflicts. Sometimes the port isn't
  // released properly when running multiple tests in sequence.
  const PORT = 42_000 + Math.round(Math.random() * 10_000);
  const SERVER_URL = `http://localhost:${PORT}`; // Default Expo server URL

  const server = _spawn(
    `npx`,
    [`expo`, `start`, `--offline`, `--port`, `${PORT}`],
    {
      stdio: `pipe`, // Pipe output to console
      signal: t.signal,
    },
  );

  server.stdout.on(`data`, (chunk: Buffer) => {
    t.diagnostic(`server stdout: ${chunk.toString().trimEnd()}`);
  });
  server.stderr.on(`data`, (chunk: string) => {
    t.diagnostic(`server stderr: ${chunk.toString().trimEnd()}`);
  });
  server.addListener(`error`, (err) => {
    if (err instanceof Error && err.name === `AbortError`) {
      return;
    }
    throw err;
  });

  const _fetch = async (input: string, init?: RequestInit) =>
    await fetch(
      `${SERVER_URL}${input}`,
      Object.assign(
        { ...init },
        {
          signal:
            init?.signal == null
              ? t.signal
              : AbortSignal.any([t.signal, init.signal]),
        },
      ),
    );

  return {
    fetch: _fetch,
    untilReady: async () => {
      let response;
      do {
        try {
          t.diagnostic(`Checking /api/healthcheck`);
          response = await _fetch(`/api/healthcheck`, {
            signal: AbortSignal.timeout(1000),
          });

          if (response.ok) {
            const data = (await response.json()) as unknown;
            assert.deepEqual(data, { healthcheck: `ok` });
            break;
          }
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          t.diagnostic(`Error: ${error}`);
        }

        // Check every 500ms
        await setTimeout(500, { signal: t.signal });
      } while (!t.signal.aborted);

      assert.equal(response?.ok, true);
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    [Symbol.asyncDispose]: async () => {
      // The sockets need to be destroyed otherwise the process hangs the test.
      server.stdin.destroy();
      server.stdout.destroy();
      server.stderr.destroy();

      if (!server.killed) {
        t.diagnostic(`Shutting down server...`);
        // SIGTERM doesn't seem to shutdown cleanly and the test ends up
        // hanging. But SIGKILL does kill it properly.
        if (!server.kill(`SIGKILL`)) {
          throw new Error(`Failed to kill server.`);
        }
      }
    },
  };
}
