import { hanziWordSkillKinds } from "@/data/model";
import { hanziWordSkill } from "@/data/skills";
import { loadDictionary, loadHanziWordMigrations } from "@/dictionary";
import * as s from "@/server/pgSchema";
import { invariant } from "@pinyinly/lib/invariant";
import { subDays } from "date-fns/subDays";
import { inArray, lt, notInArray, sql } from "drizzle-orm";
import {
  pgBatchUpdate,
  substring,
  withDrizzle,
  withRepeatableReadTransaction,
} from "@/server/lib/db";
import { inngest } from "./client";

const dataIntegrityDictionary = inngest.createFunction(
  {
    id: `dataIntegrityDictionary`,
    triggers: [
      // { cron: `30 * * * *` }
    ],
  },
  async ({ step, logger }) => {
    const dict = await loadDictionary();

    await step.run(`check skillRating.skill`, async () => {
      const unknownSkills = await withDrizzle(async (db) =>
        db
          .selectDistinct({ skill: s.skillRating.skill })
          .from(s.skillRating)
          .where(
            notInArray(
              substring(s.skillRating.skill, /^\w+:(.+)$/u),
              dict.allHanziWords,
            ),
          ),
      ).then((x) => x.map((r) => r.skill));

      if (unknownSkills.length > 0) {
        logger.error(
          {
            skillColumn: `skillRating.skill`,
            unknownSkills,
          },
          `Unknown hanzi word skills found`,
        );
      }

      return unknownSkills;
    });

    await step.run(`check skillState.skill`, async () => {
      const unknownSkills = await withDrizzle(async (db) =>
        db
          .selectDistinct({ skill: s.skillState.skill })
          .from(s.skillState)
          .where(
            notInArray(
              substring(s.skillState.skill, /^\w+:(.+)$/u),
              dict.allHanziWords,
            ),
          ),
      ).then((x) => x.map((r) => r.skill));

      if (unknownSkills.length > 0) {
        logger.error(
          {
            skillColumn: `skillState.skill`,
            unknownSkills,
          },
          `Unknown hanzi word skills found`,
        );
      }

      return unknownSkills;
    });
  },
);

const replicacheGarbageCollection = inngest.createFunction(
  {
    description: `Delete old replicache data no longer used to reduce DB bloat.`,
    id: `replicacheGarbageCollection`,
    singleton: { mode: `skip` },
    // Run once every hour
    triggers: [
      // { cron: `0 * * * *` }
    ],
  },
  async ({ step }) => {
    let deletedRowCount = 0;
    do {
      const { deletedRows } = await step.run(
        `replicacheCvr table deletes`,
        async () =>
          withDrizzle(async (db) => {
            const rowsToDelete = await db
              .select({ id: s.replicacheCvr.id })
              .from(s.replicacheCvr)
              .where(lt(s.replicacheCvr.createdAt, subDays(new Date(), 7)))
              .limit(1000);

            const idsToDelete = rowsToDelete.map((r) => r.id);

            const deletedRows = await db
              .delete(s.replicacheCvr)
              .where(inArray(s.replicacheCvr.id, idsToDelete))
              .returning({ id: s.replicacheCvr.id });

            return { deletedRows };
          }),
      );
      deletedRowCount = deletedRows.length;
    } while (deletedRowCount > 0);
  },
);

const pgFullVacuumGarbageCollection = inngest.createFunction(
  {
    description: `Checks PostgreSQL tables for dead tuples and if VACUUM FULL is needed to reclaim space.`,
    id: `pgFullVacuumGarbageCollection`,
    singleton: { mode: `skip` },
    // Run once every day
    triggers: [
      // { cron: `0 0 * * *` }
    ],
  },
  async ({ step }) => {
    type BloatRow = {
      schema_name: string;
      table_name: string;
      table_size: string;
      n_live_tup: number;
      n_dead_tup: number;
      table_dead_pct: number;
      toast_table_size: string | null;
      toast_live_tup: number | null;
      toast_dead_tup: number | null;
      toast_dead_pct: number | null;
      recommendation: `OK` | `Consider VACUUM FULL`;
    };

    const bloatRows = await step.run(`query bloat stats`, async () =>
      withDrizzle(async (db) => {
        const { rows } = await db.execute<BloatRow>(`
  WITH toast_stats AS (
    SELECT 
      t.oid AS toast_oid,
      t.relname AS toast_relname,
      t.reltoastrelid AS toast_relid,
      p.oid AS parent_oid,
      p.relname AS parent_relname,
      ns.nspname AS schema_name,
      pg_total_relation_size(t.oid) AS toast_total_size,
      s.n_dead_tup AS toast_dead_tup,
      s.n_live_tup AS toast_live_tup
    FROM pg_class t
    JOIN pg_class p ON t.reltoastrelid = p.oid
    JOIN pg_namespace ns ON p.relnamespace = ns.oid
    LEFT JOIN pg_stat_all_tables s ON s.relid = t.oid
    WHERE t.relname LIKE 'pg_toast_%'
  ),
  parent_table_stats AS (
    SELECT
      s.relid,
      n.nspname AS schema_name,
      c.relname AS table_name,
      s.n_live_tup,
      s.n_dead_tup,
      pg_total_relation_size(s.relid) AS table_size
    FROM pg_stat_user_tables s
    JOIN pg_class c ON c.oid = s.relid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  )
  SELECT 
    p.schema_name,
    p.table_name,
    pg_size_pretty(p.table_size) AS table_size,
    p.n_live_tup,
    p.n_dead_tup,
    ROUND(((p.n_dead_tup::float / NULLIF(p.n_live_tup + p.n_dead_tup, 0)) * 100)::numeric, 2) AS table_dead_pct,
    pg_size_pretty(t.toast_total_size) AS toast_table_size,
    t.toast_live_tup,
    t.toast_dead_tup,
    ROUND(((t.toast_dead_tup::float / NULLIF(t.toast_live_tup + t.toast_dead_tup, 0)) * 100)::numeric, 2) AS toast_dead_pct,
    CASE 
      WHEN (p.n_dead_tup > 100000 AND (p.n_dead_tup::float / NULLIF(p.n_live_tup + p.n_dead_tup, 0)) > 0.2)
        OR (t.toast_dead_tup > 10000 AND (t.toast_dead_tup::float / NULLIF(t.toast_live_tup + t.toast_dead_tup, 0)) > 0.2)
      THEN 'Consider VACUUM FULL'
      ELSE 'OK'
    END AS recommendation
  FROM parent_table_stats p
  LEFT JOIN toast_stats t ON p.relid = t.parent_oid
  ORDER BY recommendation DESC, table_dead_pct DESC NULLS LAST;
`);
        return rows;
      }),
    );

    const tablesToVacuum = bloatRows.filter(
      (row) => row.recommendation === `Consider VACUUM FULL`,
    );

    for (const table of tablesToVacuum) {
      await step.run(
        `vacuum table ${table.schema_name}.${table.table_name}`,
        async () => {
          // Run VACUUM FULL on the table
          await withDrizzle(async (db) => {
            await db.execute(
              sql`VACUUM FULL ${sql.identifier(table.schema_name)}.${sql.identifier(table.table_name)};`,
            );
          });
        },
      );
    }

    return bloatRows;
  },
);

const migrateHanziWords = inngest.createFunction(
  {
    id: `migrateHanziWords`,
    triggers: [
      // { cron: `30 * * * *` }
    ],
  },
  async ({ step }) => {
    const hanziWordMigrations = await loadHanziWordMigrations();
    // HanziWord -> HanziWord
    const skillRenames = [...hanziWordMigrations].flatMap(
      ([oldHanziWord, newHanziWord]) =>
        newHanziWord == null // `null` indicates a deletion rather than a rename, so skip these.
          ? []
          : hanziWordSkillKinds.map(
              (skillType) =>
                [
                  hanziWordSkill(skillType, oldHanziWord),
                  hanziWordSkill(skillType, newHanziWord),
                ] as const,
            ),
    );
    // HanziWord -> null
    const skillDeletes = [...hanziWordMigrations].flatMap(
      ([oldHanziWord, newHanziWord]) =>
        // When newHanziWord is null it's a deletion rather than a rename.
        newHanziWord == null
          ? hanziWordSkillKinds.map((skillType) =>
              hanziWordSkill(skillType, oldHanziWord),
            )
          : [],
    );

    //
    // skillRating
    //

    await step.run(`skillRating.skill renames`, async () =>
      withDrizzle(async (db) =>
        pgBatchUpdate(db, {
          whereColumn: s.skillRating.skill,
          setColumn: s.skillRating.skill,
          updates: skillRenames,
        }),
      ),
    );

    await step.run(`skillRating.skill deletes`, async () =>
      withDrizzle(async (db) => {
        const deletedRows = await db
          .delete(s.skillRating)
          .where(inArray(s.skillRating.skill, skillDeletes))
          .returning();

        return { deletedRows };
      }),
    );

    //
    // skillState
    //

    await step.run(`skillState.skill renames`, async () => {
      return withDrizzle(async (db) => {
        return withRepeatableReadTransaction(db, async (db) => {
          const newSkills = skillRenames.map(([, newSkill]) => newSkill);

          const skillStatesWithNewSkill = await db.query.skillState.findMany({
            where: (t) => inArray(t.skill, newSkills),
          });
          const existingNewSkills = new Set(
            skillStatesWithNewSkill.map((r) => r.skill),
          );

          const toMigrate = skillRenames.filter(
            ([, newSkill]) =>
              // We only want to do renames for skillState rows that don't
              // already exist in the new format (a new record would exist if a
              // review was done on the new skill).
              !existingNewSkills.has(newSkill),
          );

          const toDelete = skillRenames
            .filter(([, newSkill]) =>
              // These are stale skill states that
              existingNewSkills.has(newSkill),
            )
            .map(([oldSkill]) => oldSkill);

          // Sanity check that we're not doubling up.
          invariant(toMigrate.length + toDelete.length === skillRenames.length);

          // Migrate old -> new.
          const { affectedRows: migratedCount } = await pgBatchUpdate(db, {
            whereColumn: s.skillState.skill,
            setColumn: s.skillState.skill,
            updates: toMigrate,
          });

          // Delete old that already have a new.
          const deletedRows = await db
            .delete(s.skillState)
            .where(inArray(s.skillState.skill, toDelete))
            .returning();

          return { migratedCount, deletedRows };
        });
      });
    });

    await step.run(`skillState.skill deletes`, async () =>
      withDrizzle(async (db) => {
        const deletedRows = await db
          .delete(s.skillState)
          .where(inArray(s.skillState.skill, skillDeletes))
          .returning();

        return { deletedRows };
      }),
    );
  },
);

export const functions = [
  dataIntegrityDictionary,
  migrateHanziWords,
  pgFullVacuumGarbageCollection,
  replicacheGarbageCollection,
];
