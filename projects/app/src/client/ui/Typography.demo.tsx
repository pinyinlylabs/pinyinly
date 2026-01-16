import { Text, View } from "react-native";

export default () => {
  const themes = `theme-default theme-success-panel theme-danger-panel`.split(
    ` `,
  );
  return (
    <View className="flex-1 gap-3">
      {[
        `pyly-body-title`,
        `pyly-body-heading`,
        `pyly-body-subheading`,
        `pyly-body-2xl`,
        `pyly-body`,
        `pyly-body-caption`,
        `pyly-body-dt`,
        `pyly-body-input`,
      ].flatMap((family) => (
        <View key={family} className="bg-bg">
          <Text className="pyly-dev-dt">{family}</Text>
          {themes.map((theme) => (
            <View
              key={theme}
              className="flex-row items-center justify-between gap-2"
            >
              <View
                className={`
                  ${theme}

                  flex-row items-center justify-between bg-bg p-2
                `}
              >
                <Text
                  className={`
                    ${family}

                    truncate
                  `}
                >
                  {/* It's important to make sure that utilities like `font-bold` and `font-italic` combine correctly with the `pyly-` text component styles. */}
                  Lorem ipsum <Text className="pyly-bold">pyly-bold</Text> and
                  {` `}
                  <Text className="pyly-italic">pyly-italic</Text> and{` `}
                  <Text className="pyly-ref">pyly-ref 好 good</Text>.
                </Text>
              </View>

              <View className="shrink-0 grow-0">
                <Text className="pyly-dev-dt opacity-50">{theme}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
