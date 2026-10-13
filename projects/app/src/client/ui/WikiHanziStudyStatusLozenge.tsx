import { useStudyToggle } from "@/client/ui/hooks/useStudyToggle";
import { useDb } from "@/client/ui/hooks/useDb";
import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import {
  coerceRank,
  getHanziWordRank,
  rankRules,
  rankToAbsoluteProgress,
} from "@/data/skills";
import { useLiveQuery } from "@tanstack/react-db";
import { Lozenge } from "./Lozenge";
import type { LozengeColor } from "./Lozenge";

export function WikiHanziStudyStatusLozenge({
  hanziWord,
}: {
  hanziWord: HanziWord | null;
}) {
  return hanziWord == null ? null : <StudyStatus hanziWord={hanziWord} />;
}

function StudyStatus({ hanziWord }: { hanziWord: HanziWord }) {
  const db = useDb();
  const { isStudying } = useStudyToggle(hanziWord);
  const { data: skillStates } = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );

  if (!isStudying) {
    return null;
  }

  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );
  const rankedHanziWord = getHanziWordRank({
    hanziWord,
    skillSrsStates,
    rankRules,
  });
  const rank = coerceRank(rankedHanziWord.rank);
  const progress = rankToAbsoluteProgress({
    rank,
    completion: rankedHanziWord.completion,
  });
  const color = rankColor[rank];

  return (
    <Lozenge
      color={color}
      progress={progress}
      progressClassName={rankProgressClass[rank]}
    >
      Studying
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
  0: `bg-fg/15`,
  1: `bg-fg/30`,
  2: `bg-blue/35`,
  3: `bg-violet/35`,
  4: `bg-fuchsia/35`,
} satisfies Record<ReturnType<typeof coerceRank>, string>;
