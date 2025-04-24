import type { JestNativeMatchers } from "@testing-library/react-native/build/matchers/types";

declare global {
  import type { Expect } from "expect";

  // This is needed so that in `setup.ts` we can do `globalThis.expect = …`.
  var expect: Expect;
}

declare module "expect" {
  // Add matchers like `.toHaveTextContent(…)` to `expect(…)`. The built-in
  // types from `@testing-library/react-native` only augment the `@jest/expect`
  // package and don't touch `expect`.
  interface Matchers<R, T> extends JestNativeMatchers<R> {}
}

export {};
