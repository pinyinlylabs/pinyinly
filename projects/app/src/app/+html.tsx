import { StartupLoader } from "@/client/ui/StartupLoader";
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function RootHtml({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } =
    useServerDocumentContext();

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
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        <StartupLoader />
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
