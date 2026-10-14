import { useDb } from "@/client/ui/hooks/useDb";
import type { HanziText, HanziWord, Skill, SrsStateType } from "@/data/model";
import { buildHanziWord } from "@/dictionary";
import { rankName } from "@/data/skills";
import type { coerceRank } from "@/data/skills";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { Lozenge } from "./Lozenge";
import type { LozengeColor } from "./Lozenge";
import { getHanziWordsProgress } from "./wikiHanziProgress";

export function WikiHanziProgressLozenge({
  hanzi,
  hanziWord,
}: {
  hanzi: HanziText;
  hanziWord?: HanziWord | null;
}) {
  const db = useDb();
  const { data: dictionaryMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) =>
          and(eq(entry.hanzi, hanzi), eq(entry.sourceKind, `builtIn`)),
        ),
    [db.dictionaryCollection, hanzi],
  );
  const { data: userMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) => eq(dictionary.hanzi, hanzi)),
    [db.userDictionary, hanzi],
  );
  const { data: skillStates } = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );

  const hanziWords = [
    ...(hanziWord == null
      ? dictionaryMeanings.map((meaning) => meaning.hanziWord)
      : [hanziWord]),
    ...(hanziWord == null
      ? userMeanings.map((meaning) => buildHanziWord(hanzi, meaning.meaningKey))
      : []),
  ].filter((word, index, words) => words.indexOf(word) === index);
  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );
  const { progress, rank } = getHanziWordsProgress({
    hanziWords,
    skillSrsStates,
  });

  return (
    <Lozenge
      color={rankColor[rank]}
      progress={progress}
      progressClassName={rankProgressClass[rank]}
    >
      {rankName(rank)}
    </Lozenge>
  );
}

const rankColor = {
  0: `muted-fg`,
  1: `muted-fg`,
  2: `blue`,
  3: `violet`,
  4: `fuchsia`,
} satisfies Record<ReturnType<typeof coerceRank>, LozengeColor>;

const rankProgressClass = {
  0: `bg-fg/8`,
  1: `bg-fg/15`,
  2: `bg-blue/20`,
  3: `bg-violet/20`,
  4: `bg-fuchsia/20`,
} satisfies Record<ReturnType<typeof coerceRank>, string>;
