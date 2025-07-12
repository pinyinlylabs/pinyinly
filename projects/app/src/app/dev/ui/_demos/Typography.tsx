import { Text, View } from "react-native";

export default () => {
  const themes = `theme-default theme-success theme-danger theme-accent`.split(
    ` `,
  );
  return (
    <View className="flex-1 gap-3">
      {[
        `hhh-body-title`,
        `hhh-body-heading`,
        `hhh-body-2xl`,
        `hhh-body`,
        `hhh-body-caption`,
        `hhh-body-dt`,
        `hhh-body-input`,
      ].flatMap((family) => (
        <View key={family}>
          <Text className="hhh-dev-dt">{family}</Text>
          {themes.map((theme) => (
            <View
              key={theme}
              className="flex-row items-center justify-between gap-2"
            >
              <Text
                className={`
                  ${family}
                  ${theme}

                  truncate
                `}
              >
                {/* It's important to make sure that utilities like `font-bold` and `font-italic` combine correctly with the `hhh-` text component styles. */}
                Lorem ipsum <Text className="hhh-bold">hhh-bold</Text> and
                {` `}
                <Text className="hhh-italic">hhh-italic</Text> and{` `}
                <Text className="hhh-ref">hhh-ref 好 good</Text>.
              </Text>
              <View className="shrink-0 grow-0">
                <Text className="hhh-dev-dt opacity-50">{theme}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
