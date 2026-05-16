import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText } from "@/data/model";
import { Link } from "expo-router";
import { Text, View } from "react-native";
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
    name: `MDBG`,
    getHref: (hanzi: HanziText) =>
      `https://www.mdbg.net/chinese/dictionary?page=worddict&email=&wdrst=0&wdqb=${encodeURIComponent(hanzi)}`,
    singleCharacterOnly: false,
  },
  {
    name: `Unihan Database`,
    getHref: (hanzi: HanziText) =>
      `https://www.unicode.org/cgi-bin/GetUnihanData.pl?codepoint=${encodeURIComponent(hanzi)}`,
    singleCharacterOnly: true,
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
    <View className="mt-10 gap-2">
      <Text className="pyly-body-subheading">External resources</Text>
      <View className="flex-row flex-wrap">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href as `https://${string}`}
            target="_blank"
            className={`
              my-1 w-1/2 items-center text-fg-dim

              hover:text-fg
            `}
          >
            <Text className={`mr-1 font-sans text-base font-normal`}>
              {link.name}
            </Text>
            <Icon icon="open" size={16} />
          </Link>
        ))}
      </View>
    </View>
  );
}
