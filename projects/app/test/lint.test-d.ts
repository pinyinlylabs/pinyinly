// pyly-not-src-test

import { test } from "vitest";

test(`@typescript-eslint/return-await`, () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const promiseValue = () => Promise.resolve(null);

  const myAsyncFunction = async () => {
    return promiseValue();
  };

  const mySyncFunction = () => {
    return promiseValue();
  };

  void myAsyncFunction();
  void mySyncFunction();
});
