import { mock } from "node:test";

// Mock react-native to use react-native-web otherwise Node will try to import
// Flow type files and fail.
mock.module(`react-native`, {
  // @ts-expect-error we don't care about the types of this, it's just for mocking.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  namedExports: await import(`react-native-web`),
});

// Set up global expect
{
  const { expect } = await import(`expect`);
  globalThis.expect = expect;
}
