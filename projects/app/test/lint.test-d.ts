// pyly-not-src-test

import { test } from "vitest";

test(`@typescript-eslint/return-await`, () => {
  const promiseValue = async () => null;

  const myAsyncFunction = async () => {
    return promiseValue();
  };

  const mySyncFunction = async () => {
    return promiseValue();
  };

  void myAsyncFunction();
  void mySyncFunction();
});
