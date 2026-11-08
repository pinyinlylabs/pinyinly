import { ExampleStack } from "@/client/ui/demo/components";
import { Text } from "@/client/ui/Text";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { Platform } from "react-native";
import { StartupLoader } from "./StartupLoader";

export default function StartupLoaderDemo() {
  return (
    <>
      {[
        {
          title: `Initial loading`,
          recoveryDelayMs: 15_000,
          allowScripts: true,
        },
        { title: `Taking too long`, recoveryDelayMs: 0, allowScripts: true },
        {
          title: `JavaScript disabled`,
          recoveryDelayMs: 15_000,
          allowScripts: false,
        },
        {
          title: `Loading error`,
          recoveryDelayMs: 15_000,
          allowScripts: true,
          simulateError: true,
        },
      ].map(({ title, recoveryDelayMs, allowScripts, simulateError }) => (
        <ExampleStack key={title} title={title}>
          {Platform.OS === `web` ? (
            <iframe
              title={title}
              className="h-96 w-80 border-0"
              sandbox={allowScripts ? `allow-scripts` : ``}
              srcDoc={renderToStaticMarkup(
                <html lang="en">
                  <head>
                    <meta charSet="utf-8" />
                  </head>
                  <body>
                    <StartupLoader recoveryDelayMs={recoveryDelayMs} />
                    {simulateError ? (
                      <script src="/__startup-loader-demo-missing-script__.js" />
                    ) : null}
                  </body>
                </html>,
              )}
            />
          ) : (
            <Text>This loader is only used on web.</Text>
          )}
        </ExampleStack>
      ))}
    </>
  );
}
