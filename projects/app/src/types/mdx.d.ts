declare module "*.mdx" {
  import type { CustomComponentsProp } from "@bacons/mdx";
  import type React from "react";

  const Component: React.FC<{
    components?: CustomComponentsProp;
  }>;
  export default Component;
}
