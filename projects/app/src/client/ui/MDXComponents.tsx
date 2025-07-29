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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
