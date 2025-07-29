import { MDXComponentsContext } from "@/client/ui/mdx";
import { use } from "react";

export function useMDXComponents() {
  const components = use(MDXComponentsContext);

  return withProxyErrors(components);
}

/**
 * Wraps MDX components in a proxy to catch missing components at runtime.
 */
function withProxyErrors<T>(components: Record<string, T>) {
  return new Proxy(components, {
    get(target, prop) {
      if (typeof prop !== `string`) {
        return;
      }
      const component = target[prop];
      if (component != null) {
        return target[prop];
      }

      throw new Error(
        `No MDX component found for key: "${prop}". Define it using the React provider: <MDXComponents components={{ "${prop}": () => <Text ... /> }}>`,
      );
    },
  });
}
