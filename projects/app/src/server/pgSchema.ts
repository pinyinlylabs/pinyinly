import * as s from "@/data/rizzleSchema";
import { nanoid } from "@/util/nanoid";
import { sql } from "drizzle-orm";
import * as pg from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import {
  pgBase64url,
  pgFsrsRating,
  pgHanziOrHanziWord,
  pgJsonObject,
  pgMnemonicThemeId,
  pgPasskeyTransport,
  pgPinyinInitialGroupId,
  pgPinyinSoundGroupId,
  pgPinyinSoundId,
  pgSkill,
  pgSpaceSeparatoredString,
  rizzleCustomType,
  zodJson,
} from "./pgSchemaUtil";

export const cvrEntitySchema = z.record(
  z
    .string()
    .describe(`the unique part of the replicache entity key, varies by entity`),
  z.string().describe(`xmin value for the row`),
);

export const cvrEntitiesSchema = z.partialRecord(z.string(), cvrEntitySchema);

export type CvrEntities = z.infer<typeof cvrEntitiesSchema>;

export const schema = pg.pgSchema(`haohaohow`);

export const user = schema.table(`user`, {
  id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
  name: pg.varchar(`name`, { length: 30 }),
  createdAt: pg
    .timestamp(`createdAt`, {
      mode: `date`,
      withTimezone: true,
    })
    .defaultNow()
    .notNull(),
});

export const userSetting = schema.table(
  `userSetting`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .notNull()
      .references(() => user.id),
    key: pg.text(`key`).notNull(),
    value: pgJsonObject(`value`),
    updatedAt: pg.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.key)],
);

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

export const authPasskey = schema.table(`authPasskey`, {
  id: pg.varchar(`credentialId`, { length: 100 }).primaryKey(),
  userId: pg
    .text(`userId`)
    .references(() => user.id)
    .notNull(),
  publicKey: pgBase64url(`publicKey`).notNull(),
  webauthnUserId: pgBase64url(`webauthnUserId`).notNull(),
  transports: pgPasskeyTransport(`transports`).array().default([]), // e.g. ["internal", "usb"]
  counter: pg.bigint(`counter`, { mode: `number` }).notNull().default(0),
  createdAt: pg.timestamp(`createdAt`).defaultNow(),
  lastUsedAt: pg.timestamp(`lastUsedAt`),
  deviceType: pg.varchar(`deviceType`, { length: 32 }), // e.g. "iPhone", "Android"
  isBackedUp: pg.boolean(`isBackedUp`).default(false), // synced in iCloud/Google?
});

export const skillRating = schema.table(
  `skillRating`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    skill: pgSkill(`skillId`).notNull(),
    rating: pgFsrsRating(`rating`).notNull(),
    durationMs: pg.doublePrecision(`durationMs`),
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
    skill: pgSkill(`skill`).notNull(),
    srs: rizzleCustomType(s.rSrsState(), `json`)(`srs`).notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.skill)],
);

export const hanziGlossMistake = schema.table(
  `hanziGlossMistake`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    hanziOrHanziWord: pgHanziOrHanziWord(`hanzi`).notNull(),
    gloss: pg.text(`gloss`).notNull(),
    createdAt: pg.timestamp(`timestamp`).defaultNow().notNull(),
  },
  (t) => [pg.index().on(t.userId)],
);

export const hanziPinyinMistake = schema.table(
  `hanziPinyinMistake`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    hanziOrHanziWord: pgHanziOrHanziWord(`hanzi`).notNull(),
    // Intentionally left as strings because it's user input.
    pinyin: pgSpaceSeparatoredString(`pinyin`).notNull(),
    createdAt: pg.timestamp(`timestamp`).defaultNow().notNull(),
  },
  (t) => [pg.index().on(t.userId)],
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
    groupId: pgPinyinInitialGroupId(`groupId`).notNull(),
    themeId: pgMnemonicThemeId(`themeId`).notNull(),
    updatedAt: pg.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.groupId)],
);

export const pinyinSound = schema.table(
  `pinyinSound`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    soundId: pgPinyinSoundId(`soundId`).notNull(),
    name: pg.text(`name`),
    updatedAt: pg.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.soundId)],
);

export const pinyinSoundGroup = schema.table(
  `pinyinSoundGroup`,
  {
    id: pg.text(`id`).primaryKey().$defaultFn(nanoid),
    userId: pg
      .text(`userId`)
      .references(() => user.id)
      .notNull(),
    soundGroupId: pgPinyinSoundGroupId(`soundGroupId`).notNull(),
    /**
     * Override the default name.
     */
    name: pg.text(`name`),
    /**
     * Override the default theme.
     */
    theme: pg.text(`theme`),
    updatedAt: pg.timestamp(`updatedAt`).defaultNow().notNull(),
    createdAt: pg.timestamp(`createdAt`).defaultNow().notNull(),
  },
  (t) => [pg.unique().on(t.userId, t.soundGroupId)],
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
