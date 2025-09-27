import { useReplicache } from "@/client/hooks/useReplicache";
import type {
  LatestSkillRatingsCollection,
  SkillRatingCollection,
  SkillStateCollection,
  TargetSkillsCollection,
} from "@/client/query";
import {
  getAllTargetSkills,
  latestSkillRatingCollectionOptions,
  rizzleCollectionOptions,
  staticCollectionOptions,
} from "@/client/query";
import { currentSchema } from "@/data/rizzleSchema";
import { createCollection } from "@tanstack/react-db";
import type { PropsWithChildren } from "react";
import { createContext } from "react";

export interface Db {
  skillStateCollection: SkillStateCollection;
  skillRatingCollection: SkillRatingCollection;
  targetSkillsCollection: TargetSkillsCollection;
  latestSkillRatings: LatestSkillRatingsCollection;
}

const Context = createContext<Db | null>(null);

export const DbProvider = Object.assign(
  function DbProvider({ children }: PropsWithChildren) {
    const rizzle = useReplicache();

    const skillStateCollection: SkillStateCollection = createCollection(
      rizzleCollectionOptions({
        id: `skillState`,
        rizzle,
        entity: currentSchema.skillState,
        getKey: (item) => item.skill,
      }),
    );

    const skillRatingCollection: SkillRatingCollection = createCollection(
      rizzleCollectionOptions({
        id: `skillRating`,
        rizzle,
        entity: currentSchema.skillRating,
        getKey: (item) => item.id,
      }),
    );

    const targetSkillsCollection: TargetSkillsCollection = createCollection(
      staticCollectionOptions({
        id: `targetSkills`,
        queryFn: async () => {
          const targetSkills = await getAllTargetSkills();
          return targetSkills.map((skill) => ({ skill }));
        },
        getKey: (item) => item.skill,
      }),
    );

    const latestSkillRatings: LatestSkillRatingsCollection = createCollection(
      latestSkillRatingCollectionOptions({ rizzle }),
    );

    const db: Db = {
      latestSkillRatings,
      skillStateCollection,
      skillRatingCollection,
      targetSkillsCollection,
    };

    return <Context.Provider value={db}>{children}</Context.Provider>;
  },
  { Context },
);
