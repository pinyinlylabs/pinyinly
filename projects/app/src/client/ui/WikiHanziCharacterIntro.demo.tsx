import { View } from "react-native";
import { characterData } from "./WikiHanziCharacterDecomposition.demo";
import { WikiHanziCharacterIntro } from "./WikiHanziCharacterIntro";

export default () => {
  return (
    <View className="max-w-[500px] flex-1 gap-2">
      <WikiHanziCharacterIntro
        characterData={characterData}
        illustrationSrc={require(`./demo/看.jpg`)}
        illustrationFit="contain"
      />
    </View>
  );
};
