// pyly-not-src-test
import { describe, expect, test } from "vitest";
import { assertAppResponse } from "#bin/smokecheck.ts";

describe(`assertAppResponse`, () => {
  test(`accepts the app page`, async () => {
    await expect(
      assertAppResponse(
        new Response(
          `<html><title>Some title</title><div id="root"></div></html>`,
        ),
      ),
    ).resolves.toBeUndefined();
  });

  test(`rejects unsuccessful responses`, async () => {
    await expect(
      assertAppResponse(new Response(`Not Found`, { status: 404 })),
    ).rejects.toThrow(`App returned HTTP 404`);
  });

  test(`rejects successful responses without the Expo app root`, async () => {
    await expect(
      assertAppResponse(new Response(`<html><title>Not found</title></html>`)),
    ).rejects.toThrow(`Response did not contain the Expo app root`);
  });
});
