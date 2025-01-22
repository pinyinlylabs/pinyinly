import { MnemonicThemeId, PinyinInitialGroupId, Skill } from "@/data/model";
import * as r from "@/data/rizzleSchema";
import * as s from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";

const alphabet = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`;
const length = 12;

const nanoid = customAlphabet(alphabet, length);

export const schema = s.pgSchema(`haohaohow`);

const skill = (name: string) => {
  const marshaler = r.rSkill();
  return customType<{ data: Skill; driverData: r.MarshaledSkill }>({
    dataType() {
      return `text`;
    },
    fromDriver(value): Skill {
      return marshaler.unmarshal(value);
    },
    toDriver(value): r.MarshaledSkill {
      return marshaler.marshal(value);
    },
  })(name);
};

const mnemonicThemeId = (name: string) => {
  const marshaler = r.rMnemonicThemeId;
  return customType<{ data: MnemonicThemeId; driverData: string }>({
    dataType() {
      return `text`;
    },
    fromDriver(value): MnemonicThemeId {
      return marshaler.unmarshal(value);
    },
    toDriver(value): string {
      return marshaler.marshal(value);
    },
  })(name);
};

const pinyinInitialGroupId = (name: string) => {
  const marshaler = r.rPinyinInitialGroupId;
  return customType<{ data: PinyinInitialGroupId; driverData: string }>({
    dataType() {
      return `text`;
    },
    fromDriver(value): PinyinInitialGroupId {
      return marshaler.unmarshal(value);
    },
    toDriver(value): string {
      return marshaler.marshal(value);
    },
  })(name);
};

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
  skill: skill(`skillId`).notNull(),
  rating: s.text(`rating`).notNull(),
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
    skill: skill(`skillId`).notNull(),
    srs: s.json(`srs`),
    dueAt: s.timestamp(`dueAt`).notNull(),
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
    groupId: pinyinInitialGroupId(`groupId`).notNull(),
    themeId: mnemonicThemeId(`themeId`).notNull(),
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
   *
   * ```json
   * { <clientId>: <lastMutationId> }
   * ```
   */
  lastMutationIds: s.json(`lastMutationIds`).notNull(),
  /**
   * For each entity visible to the user, map of key->version pairs, grouped by
   * table name.
   *
   * ```json
   * { <tableName>: { "<primaryKey>": "<version>:<replicacheId>" } }
   * ```
   */
  entities: s.json(`entities`).notNull(),
  createdAt: s.timestamp(`createdAt`).defaultNow().notNull(),
});
