import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import test from "node:test";

void test(`.env file does not exist in projects/app`, async () => {
  const projectRoot = import.meta.dirname + `/../..`;

  // Check that `projectRoot` is pointing to the correct directory.
  await assert.doesNotReject(
    fs.access(projectRoot + `/package.json`),
    `projectRoot considered incorrectly`,
  );

  // Intentionally left absent. Do not use this file as it's not used for Expo API
  // routes (see https://docs.expo.dev/router/reference/api-routes/#deployment)
  //
  // > @expo/server does not inflate environment variables from .env files. They
  // > are expected to load either by the hosting provider or the user.
  await assert.rejects(fs.access(projectRoot + `/.env`), `.env file exists`);
});
