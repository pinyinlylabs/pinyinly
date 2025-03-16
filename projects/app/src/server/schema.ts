import * as r from "@/data/rizzleSchema";
import { nanoid } from "@/util/nanoid";
import { sql } from "drizzle-orm";
import * as pg from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  rizzleCustomType,
  sFsrsRating,
  sMnemonicThemeId,
  sPinyinInitialGroupId,
  sSkill,
  zodJson,
} from "./schemaUtil";

export const cvrEntity = z.record(
  z.string({ description: `DB \`id\` primary keys` }),
  z
    .string({
      description: `in the format <xmin>:<replicacheEntityKey>. storing \`replicacheEntityKey>\` makes it possible to construct \`dels\` after the row is deleted`,
    })
    .optional(),
);

export const cvrEntitiesSchema = z.record(
  z.union([
    z.literal(`pinyinInitialAssociation`),
    z.literal(`pinyinFinalAssociation`),
    z.literal(`pinyinInitialGroupTheme`),
    z.literal(`skillState`),
    z.literal(`skillRating`),
  ]),
  cvrEntity,
);

export const schema = pg.pgSchema(`haohaohow`);

export const user = schema.table(`user`, {
  id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
  createdAt: pg
    .timestamp(`createdAt`, {
      mode: `date`,
      withTimezone: true,
    })
    .defaultNow()
    .notNull(),
});

export const authSession = schema.table(`authSession`, {
  id: pg.text(`id`).primaryKey(),
  userId: pg
    .text(`userId`)
    .notNull()
    .references(() => user.id),
  expiresAt: pg
    .timestamp(`expiresAt`, {
      mode: `date`,
      withTimezone: true,
    })
    .notNull(),
});

export const authOAuth2 = schema.table(
  `authOAuth2`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    provider: pg.text(`provider`).notNull(),
    /**
     * The ID that the provider uses to identify the user.
     */
    providerUserId: pg.text(`providerUserId`).notNull(),
    createdAt: pg.timestamp(`timestamp`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.provider, t.providerUserId)],
);

export const skillRating = schema.table(
  `skillRating`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    skill: sSkill(`skillId`).notNull(),
    rating: sFsrsRating(`rating`).notNull(),
    createdAt: pg.timestamp(`timestamp`).defaultNow().notNull(),
  },
  (t) => [pg.index().on(t.userId, t.skill)],
);

export const skillState = schema.table(
  `skillState`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    skill: sSkill(`skill`).notNull(),
    srs: rizzleCustomType(r.rSrsState(), `json`)(`srs`).notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.skill)],
);

export const pinyinInitialAssociation = schema.table(
  `pinyinInitialAssociation`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    initial: pg.text(`initial`).notNull(),
    name: pg.text(`name`).notNull(),
    updatedAt: pg.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.initial)],
);

export const pinyinFinalAssociation = schema.table(
  `pinyinFinalAssociation`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    final: pg.text(`final`).notNull(),
    name: pg.text(`name`).notNull(),
    updatedAt: pg.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.final)],
);

export const pinyinInitialGroupTheme = schema.table(
  `pinyinInitialGroupTheme`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    groupId: sPinyinInitialGroupId(`groupId`).notNull(),
    themeId: sMnemonicThemeId(`themeId`).notNull(),
    updatedAt: pg.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.groupId)],
);

/**
 * A replicache "client group".
 *
 * From the docs:
 *
 * > A client group is a set of clients that share data locally. Changes made by
 * > one client are visible to other clients, even while offline. Client groups
 * > are identified by a unique, randomly generated clientGroupID.
 */
export const replicacheClientGroup = schema.table(
  `replicacheClientGroup`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    /**
     * The schema version that this client group is using, it's set when the first
     * push is made and can be used when syncing mutations between servers.
     */
    schemaVersion: pg.text().notNull(),
    /**
     * Replicache requires that cookies are ordered within a client group. To
     * establish this order we simply keep a counter.
     */
    cvrVersion: pg.integer(`cvrVersion`).notNull().default(0),
    updatedAt: pg.timestamp(`timestamp`).defaultNow().notNull(),
  },
  (t) => [pg.index().on(t.userId)],
);

export const replicacheClient = schema.table(
  `replicacheClient`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    clientGroupId: pg
      .text(`clientGroupId`)
      .references(() => replicacheClientGroup.id)
      .notNull(),
    /**
     * The most recently accepted-by-the-server mutation ID for that client.
     */
    lastMutationId: pg.integer(`lastMutationId`).notNull(),
    updatedAt: pg.timestamp(`timestamp`).defaultNow().notNull(),
  },
  (t) => [pg.index().on(t.clientGroupId)],
);

export const replicacheMutation = schema.table(
  `replicacheMutation`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    clientId: pg
      .text(`clientId`)
      .references(() => replicacheClient.id)
      .notNull(),
    mutationId: pg.integer(`mutationId`).notNull(),
    mutation: pg.json(`mutation`).notNull(),
    success: pg.boolean(),
    processedAt: pg.timestamp(`processedAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.clientId, t.mutationId)],
);

/**
 * CVRs are stored keyed under a random unique ID which becomes the cookie sent
 * to Replicache.
 *
 * This is temporary server-side record of what entity versions a client has
 * seen, it's used to calculate which rows are "new" and need to be sent to the
 * client.
 */
export const replicacheCvr = schema.table(`replicacheCvr`, {
  id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
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
  entities: zodJson(`entities`, cvrEntitiesSchema).notNull(),
  createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
});

export const remoteSync = schema.table(
  `remoteSync`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    /**
     * The local user which will be synced to the remote server.
     */
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    /**
     * The URL to the remote server tRPC endpoint.
     */
    remoteUrl: pg.text(`remoteUrl`).notNull(),
    /**
     * The client group ID that this server will identify as when sending
     * mutations to the remote server. Only one client group will be used. All
     * client groups that are associated with the local user are smoothed
     * together. However the original client IDs are used to avoid needing to
     * re-map values and provide a bit of traceability.
     */
    remoteClientGroupId: pg.text(`remoteClientGroupId`).notNull(),
    /**
     * The profile ID that this server will identify as when sending mutations to
     * the remote server. This is value has no effect.
     *
     * In the context of a browser this is an ID of the browser, the docs say
     *
     * > The browser profile ID for this browser profile. Every instance of
     * > Replicache browser-profile-wide shares the same profile ID.
     */
    remoteProfileId: pg.text(`remoteProfileId`).notNull(),
    /**
     * The session ID used to authenticate with the remote server.
     */
    remoteSessionId: pg.text(`remoteSessionId`).notNull(),
    /**
     * The state of what mutations have been sent to the remote server.
     *
     * It's not viable to use `replicacheMutation.processedAt` to identify
     * mutations and just keep the "last timestamp" because there many cases of
     * duplicates. Instead the mutation ID for each client is used. This is the
     * same strategy used in CVR for `lastMutationIds`
     */
    lastSyncedMutationIds: zodJson(
      `lastSyncedMutationIds`,
      z.record(
        z.string(), // clientId
        z.number(), // lastMutationId
      ),
    ).notNull(),
    /**
     * An array of client IDs that have been pulled from the remote server.
     * These are ignored when pushing.
     */
    pulledClientIds: zodJson(`pulledClientIds`, z.array(z.string()))
      .default(sql`'[]'::json`)
      .notNull(),
  },
  (t) => [
    // Only one sync per user per remote server.
    pg.unique().on(t.remoteUrl, t.userId),
  ],
);
