import "vitest";

declare module "vitest" {
  interface Assertion<T = any> {
    toMatchJsonFileSnapshot(filePath: string): Promise<void>;
  }

  interface AsymmetricMatchersContaining {
    toMatchJsonFileSnapshot(filePath: string): void;
  }
}
