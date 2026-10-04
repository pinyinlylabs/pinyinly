import { dictionaryQuery } from "@/client/query";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { DropdownMenu } from "@/client/ui/DropdownMenu";
import { SkillWordRows } from "@/client/ui/SkillWordRows";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import type { Dictionary } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

type HskLevel = `1` | `2` | `3` | `4`;

const hskLevels: readonly HskLevel[] = [`1`, `2`, `3`, `4`];

export default function SkillsHskLevelRoutePage() {
  const { level } = useLocalSearchParams<{ level?: string }>();
  const parsedLevel = parseHskLevel(level);
  const { data: dictionary } = useQuery(dictionaryQuery);

  if (parsedLevel == null) {
    return null;
  }

  return (
    <View className="gap-5">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/skills">Skills</Breadcrumbs.Item>
        <Breadcrumbs.Item menu={<HskLevelMenu currentLevel={parsedLevel} />}>
          {`HSK ${parsedLevel}`}
        </Breadcrumbs.Item>
      </Breadcrumbs>

      <View>
        <Text className="pyly-body-title">{`HSK ${parsedLevel}`}</Text>
        <HeaderTitleProvider.ScrollTrigger title={`HSK ${parsedLevel}`} />
      </View>

      <SkillWordRows
        hanziWords={hskWordsFromDictionary(dictionary, parsedLevel)}
        showHskLozenges={false}
      />
    </View>
  );
}

function parseHskLevel(level: string | undefined): HskLevel | null {
  if (level === `1` || level === `2` || level === `3` || level === `4`) {
    return level;
  }

  return null;
}

function HskLevelMenu({ currentLevel }: { currentLevel: HskLevel }) {
  return (
    <DropdownMenu.Content>
      {hskLevels.map((level) => (
        <DropdownMenu.Item
          href={`/skills/hsk/${level}`}
          iconEnd={level === currentLevel ? `check` : undefined}
          iconSize={16}
          key={level}
        >
          {`HSK ${level}`}
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  );
}

function hskWordsFromDictionary(
  dictionary: Dictionary | undefined,
  level: HskLevel,
) {
  if (dictionary == null) {
    return [];
  }

  switch (level) {
    case `1`: {
      return dictionary.hsk1HanziWords;
    }
    case `2`: {
      return dictionary.hsk2HanziWords;
    }
    case `3`: {
      return dictionary.hsk3HanziWords;
    }
    case `4`: {
      return dictionary.hsk4HanziWords;
    }
  }
}
