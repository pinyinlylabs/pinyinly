import { useDb } from "@/client/ui/hooks/useDb";
import type { Skill, SrsStateType } from "@/data/model";
import { useLiveQuery } from "@tanstack/react-db";

export function useSkillSrsStates(): Map<Skill, SrsStateType> {
  const db = useDb();
  const { data: skillStates } = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );
  return new Map(skillStates.map((item) => [item.skill, item.srs]));
}
