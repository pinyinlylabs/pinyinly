declare module "*.mdx" {
  import type { MdxComponentType } from "@/client/ui/mdx";

  const Component: MdxComponentType;
  export default Component;
}
