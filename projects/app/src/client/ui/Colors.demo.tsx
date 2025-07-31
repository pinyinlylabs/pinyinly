import { Text, View } from "react-native";

export default () => {
  const bgColors = [
    `bg-red`,
    `bg-orange`,
    `bg-amber`,
    `bg-yellow`,
    `bg-lime`,
    `bg-wasabi`,
    `bg-green`,
    `bg-emerald`,
    `bg-teal`,
    `bg-cyan`,
    `bg-cyanold`,
    `bg-sky`,
    `bg-blue`,
    `bg-indigo`,
    `bg-violet`,
    `bg-purple`,
    `bg-fuchsia`,
    `bg-pink`,
    `bg-rose`,
    `bg-brick`,
    `bg-slate`,
    `bg-gray`,
    `bg-zinc`,
    `bg-neutral`,
    `bg-stone`,
    `bg-cloud`,
    `bg-ink`,
    `bg-bg`,
  ];

  // force tailwind to include these classes
  void `bg-ink-loud bg-brick-loud bg-bg-loud`;

  const opacities = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const columnLabels = (
    <View
      className={`
        flex-row gap-2

        [.pyly-color-scheme-dark_&]:flex-row-reverse
      `}
    >
      {opacities.map((o, i) => (
        <View key={i} className="w-9 items-center justify-center">
          <Text className="pyly-dev-dt">
            <Text className="text-fg/20">/</Text>
            {o * 100}
          </Text>
        </View>
      ))}
      <View className="w-9 items-center justify-center">
        <Text className="pyly-dev-dt">loud</Text>
      </View>
    </View>
  );
  return (
    <View
      className={`
        flex-1 items-end

        [.pyly-color-scheme-dark_&]:items-start
      `}
    >
      <View
        className={`
          flex-row gap-4

          [.pyly-color-scheme-dark_&]:flex-row-reverse
        `}
      >
        <View
          className={`
            items-end gap-2

            [.pyly-color-scheme-dark_&]:items-start
          `}
        >
          <View>
            <Text className="invisible text-xs">Colors</Text>
          </View>
          {bgColors.map((bgColor) => (
            <View key={bgColor} className={`h-9 justify-center`}>
              <Text className="pyly-dev-dt text-fg">
                {bgColor.replace(`bg-`, ``)}
              </Text>
            </View>
          ))}
        </View>
        <View className="gap-2">
          {columnLabels}
          {bgColors.map((bgColor) => {
            const loudBgColor = `${bgColor}-loud`;

            return (
              <View
                key={bgColor}
                className={`
                  flex-row gap-2

                  [.pyly-color-scheme-dark_&]:flex-row-reverse
                `}
              >
                {opacities.map((opacity, index) => (
                  <View
                    className={`
                      size-9 rounded-lg

                      ${bgColor}
                    `}
                    key={index}
                    style={{ opacity }}
                  />
                ))}
                <View
                  className={`
                    size-9 rounded-lg

                    ${loudBgColor}
                  `}
                />
              </View>
            );
          })}
          {columnLabels}
        </View>
      </View>
    </View>
  );
};
