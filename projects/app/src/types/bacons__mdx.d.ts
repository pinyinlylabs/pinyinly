declare module "@bacons/mdx/metro" {
  import type { MetroConfig } from "metro-config";

  export function withMdx(config: MetroConfig): MetroConfig;
}
