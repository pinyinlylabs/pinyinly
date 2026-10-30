import { ExampleStack } from "@/client/ui/demo/components";
import { Text } from "@/client/ui/Text";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { Platform } from "react-native";
import { StartupLoader } from "./StartupLoader";

export default function StartupLoaderDemo() {
  return (
    <ExampleStack title="System theme; recovery appears after 15 seconds">
      {Platform.OS === `web` ? (
        <iframe
          title="Pinyinly startup loader"
          className="h-96 w-80 border-0"
          sandbox="allow-scripts"
          srcDoc={renderToStaticMarkup(
            <html lang="en">
              <head>
                <meta charSet="utf-8" />
              </head>
              <body>
                <StartupLoader />
              </body>
            </html>,
          )}
        />
      ) : (
        <Text>This loader is only used on web.</Text>
      )}
    </ExampleStack>
  );
}
