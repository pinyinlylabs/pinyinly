import * as r from "@/data/rizzleSchema";
import * as s from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import {
  rizzleCustomType,
  sFsrsRating,
  sMnemonicThemeId,
  sPinyinInitialGroupId,
  sSkill,
  zodJson,
} from "./schemaUtil";

const alphabet = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`;
const length = 12;

const nanoid = customAlphabet(alphabet, length);

export const schema = s.pgSchema(`haohaohow`);

export const user = schema.table(`user`, {
  id: s.text(`id`).primaryKey().$defaultFn(nanoid),
  createdAt: s
    .timestamp(`createdAt`, {
      mode: `date`,
      withTimezone: true,
    })
    .defaultNow()
    .notNull(),
});

export const authSession = schema.table(`authSession`, {
  id: s.text(`id`).primaryKey(),
  userId: s
    .text(`userId`)
    .notNull()
    .references(() => user.id),
  expiresAt: s
    .timestamp(`expiresAt`, {
      mode: `date`,
      withTimezone: true,
    })
    .notNull(),
});

export const authOAuth2 = schema.table(
  `authOAuth2`,
  {
    id: s.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: s
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    provider: s.text(`provider`).notNull(),
    /**
     * The ID that the provider uses to identify the user.
     */
    providerUserId: s.text(`providerUserId`).notNull(),
    createdAt: s.timestamp(`timestamp`).defaultNow().notNull(),
  },
  (t) => [s.unique().on(t.provider, t.providerUserId)],
);

export const skillRating = schema.table(`skillRating`, {
  id: s.text(`id`).primaryKey().$defaultFn(nanoid),
  userId: s
    .text(`userId`)
    .references(() => user.id)
    .notNull(),
  skill: sSkill(`skillId`).notNull(),
  rating: sFsrsRating(`rating`).notNull(),
  createdAt: s.timestamp(`timestamp`).defaultNow().notNull(),
});

export const skillState = schema.table(
  `skillState`,
  {
    id: s.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: s
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    skill: sSkill(`skillId`).notNull(),
    srs: rizzleCustomType(r.rSrsState(), `json`)(`srs`),
    due: s.timestamp(`dueAt`).notNull(),
    createdAt: s.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [s.unique().on(t.userId, t.skill)],
);

export const pinyinInitialAssociation = schema.table(
  `pinyinInitialAssociation`,
  {
    id: s.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: s
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    initial: s.text(`initial`).notNull(),
    name: s.text(`name`).notNull(),
    updatedAt: s.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: s.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [s.unique().on(t.userId, t.initial)],
);

export const pinyinFinalAssociation = schema.table(
  `pinyinFinalAssociation`,
  {
    id: s.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: s
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    final: s.text(`final`).notNull(),
    name: s.text(`name`).notNull(),
    updatedAt: s.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: s.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [s.unique().on(t.userId, t.final)],
);

export const pinyinInitialGroupTheme = schema.table(
  `pinyinInitialGroupTheme`,
  {
    id: s.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: s
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    groupId: sPinyinInitialGroupId(`groupId`).notNull(),
    themeId: sMnemonicThemeId(`themeId`).notNull(),
    updatedAt: s.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: s.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [s.unique().on(t.userId, t.groupId)],
);

export const replicacheClientGroup = schema.table(`replicacheClientGroup`, {
  id: s.text(`id`).primaryKey().$defaultFn(nanoid),
  userId: s
    .text(`userId`)
    .references(() => user.id)
    .notNull(),
  /**
   * Replicache requires that cookies are ordered within a client group. To
   * establish this order we simply keep a counter.
   */
  cvrVersion: s.integer(`cvrVersion`).notNull().default(0),
  updatedAt: s.timestamp(`timestamp`).defaultNow().notNull(),
});

export const replicacheClient = schema.table(`replicacheClient`, {
  id: s.text(`id`).primaryKey().$defaultFn(nanoid),
  clientGroupId: s
    .text(`clientGroupId`)
    .references(() => replicacheClientGroup.id)
    .notNull(),
  lastMutationId: s.integer(`lastMutationId`).notNull(),
  updatedAt: s.timestamp(`timestamp`).defaultNow().notNull(),
});

export const replicacheMutation = schema.table(`replicacheMutation`, {
  id: s.text(`id`).primaryKey().$defaultFn(nanoid),
  clientId: s
    .text(`clientId`)
    .references(() => replicacheClient.id)
    .notNull(),
  mutation: s.json(`mutation`).notNull(),
  success: s.boolean(),
  processedAt: s.timestamp(`processedAt`).defaultNow().notNull(),
});

/**
 * CVRs are stored keyed under a random unique ID which becomes the cookie
 * sent to Replicache.
 */
export const replicacheCvr = schema.table(`replicacheCvr`, {
  id: s.text(`id`).primaryKey().$defaultFn(nanoid),
  /**
   * Map of clientID->lastMutationID pairs, one for each client in the client
   * group.
   */
  lastMutationIds: zodJson(
    `lastMutationIds`,
    z.record(
      z.string(), // clientId
      z.number(), // lastMutationId
    ),
  ).notNull(),
  /**
   * For each entity visible to the user, map of key->version:id pairs, grouped
   * by table name.
   *
   * It's necessary to store `replicacheEntityKey` within this value so that
   * `del` ops can be constructed and sent to the client. Otherwise it would be
   * necessary to keep a copy of the whole entity because keys can be encoded
   * using arbitrary inputs.
   */
  entities: zodJson(
    `entities`,
    z.record(
      z.string(), // tableName
      z.record(
        z.string(), // primaryKey
        z.string(), // <version>:<replicacheEntityKey>
      ),
    ),
  ).notNull(),
  createdAt: s.timestamp(`createdAt`).defaultNow().notNull(),
});
