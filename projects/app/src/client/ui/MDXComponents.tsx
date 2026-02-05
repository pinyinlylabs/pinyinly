import { useMDXComponents } from "@/client/hooks/useMDXComponents";
import type { PropsWithChildren } from "react";
import { MDXComponentsContext } from "./mdx";

export function MDXComponents({
  children,
  components,
}: PropsWithChildren<{
  components: Record<
    string,
    // This is a workaround for the type system to allow any component type.
    // oxlint-disable-next-line typescript/no-explicit-any
    any
  >;
}>) {
  return (
    <MDXComponentsContext.Provider
      value={{
        ...useMDXComponents(),
        ...components,
      }}
    >
      {children}
    </MDXComponentsContext.Provider>
  );
}
