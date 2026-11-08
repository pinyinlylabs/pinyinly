import { StartupLoader } from "@/client/ui/StartupLoader";
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from "expo-router/html";
import { Children, isValidElement } from "react";
import type { PropsWithChildren, ReactNode } from "react";

function fixSafari187726(headNodes: ReactNode): ReactNode {
  // Safari can cache a stale main.bundle preload and enter a reload loop:
  // https://bugs.webkit.org/show_bug.cgi?id=187726
  // https://bugs.webkit.org/show_bug.cgi?id=193533
  return __DEV__
    ? Children.toArray(headNodes).filter(
        (node) =>
          !isValidElement<{ rel?: string }>(node) ||
          node.props.rel !== `preload`,
      )
    : headNodes;
}

export default function RootHtml({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } =
    useServerDocumentContext();
  const filteredHeadNodes = fixSafari187726(headNodes);

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        {filteredHeadNodes}
      </head>
      <body {...bodyAttributes}>
        <StartupLoader />
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
