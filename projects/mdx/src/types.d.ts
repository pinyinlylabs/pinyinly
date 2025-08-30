import type { ComponentType } from "react";

declare global {
  type MdxComponentsType = Record<string, ComponentType>;

  type MdxComponentType = React.FC<{
    components?: MdxComponentsType;
  }>;
}

declare module "*.mdx" {
  const Component: MdxComponentType;
  export default Component;
}

// This export statement is required to make this file a module
// and ensure the global declarations are properly recognized
export {};
