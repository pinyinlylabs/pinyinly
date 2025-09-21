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

    //   id: `latestSkillRatings`,
    //   query: (q) => {
    //     // Build the subquery first
    //     const latestRatings = q
    //       .from({ skillRating: skillRatingCollection })
    //       .orderBy(({ skillRating }) => skillRating.createdAt, `desc`);

    //     const allSkills = q
    //       .from({ skillRating: skillRatingCollection })
    //       .select(({ skillRating }) => ({ skill: skillRating.skill }))
    //       .distinct();

    //     // Use the subquery in the main query

    //     return (
    //       q
    //         .from({ skill: allSkills })
    //         .leftJoin(
    //           { latestRating: latestRatings },
    //           ({ skill, latestRating }) =>
    //             eq(skill.skill, latestRating.skill),
    //         )
    //         // .where(({ skill, latestRating, skillRating }) => eq(skill.skill, skillRating.skill))
    //         .select(({ skill, latestRating }) => ({
    //           // id: latestRating.id,
    //           skill,
    //           latestRating,
    //           // ...latestRating,
    //         }))
    //     );
    //   },
    //   // getKey: (item) => item.skill,
    // });

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
