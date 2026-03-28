import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText } from "@/data/model";
import { Linking, Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { WikiTitledBox } from "./WikiTitledBox";
import { Icon } from "./Icon";

const externalResources = [
  {
    name: `CharacterPop`,
    getHref: (hanzi: HanziText) =>
      `https://characterpop.com/characters/${encodeURIComponent(hanzi)}`,
    singleCharacterOnly: true,
  },
  {
    name: `Dong Chinese`,
    getHref: (hanzi: HanziText) =>
      `https://www.dong-chinese.com/wiki/${encodeURIComponent(hanzi)}`,
    singleCharacterOnly: false,
  },
  {
    name: `HanziHero`,
    getHref: (hanzi: HanziText) =>
      isHanziCharacter(hanzi)
        ? `https://hanzihero.com/simplified/characters/${encodeURIComponent(hanzi)}`
        : `https://hanzihero.com/simplified/words/${encodeURIComponent(hanzi)}`,
    singleCharacterOnly: false,
  },
  {
    name: `Wiktionary`,
    getHref: (hanzi: HanziText) =>
      `https://en.wiktionary.org/wiki/${encodeURIComponent(hanzi)}`,
    singleCharacterOnly: false,
  },
] as const;

export function WikiHanziExternalResources({ hanzi }: { hanzi: HanziText }) {
  const links = externalResources
    .filter(
      (resource) => !resource.singleCharacterOnly || isHanziCharacter(hanzi),
    )
    .map((resource) => ({
      name: resource.name,
      href: resource.getHref(hanzi),
    }));

  if (links.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="External resources" className="mx-4">
      <View className="gap-2 p-3">
        {links.map((link) => (
          <Pressable
            key={link.name}
            onPress={() => {
              Linking.openURL(link.href).catch((err: unknown) => {
                console.error(`Failed to open URL: ${link.href}`, err);
              });
            }}
            className="flex-row items-center gap-1"
          >
            <Text className={resourceLinkClass()}>{link.name}</Text>
            <Icon icon="open" size={16} />
          </Pressable>
        ))}
      </View>
    </WikiTitledBox>
  );
}

const resourceLinkClass = tv({
  base: `pyly-body pyly-ref`,
});
