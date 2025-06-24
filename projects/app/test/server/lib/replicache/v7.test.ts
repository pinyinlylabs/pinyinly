import { v7 as schema, srsStateFromFsrsState } from "#data/rizzleSchema.ts";
import { glossToHanziWord } from "#data/skills.ts";
import { pgXmin } from "#server/lib/db.ts";
import { computeCvrEntities, pull, push } from "#server/lib/replicache/v7.ts";
import * as s from "#server/pgSchema.ts";
import { nextReview, Rating } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.ts";
import { invariant } from "@haohaohow/lib/invariant";
import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { createUser, txTest } from "../dbHelpers";

describe(`${push.name} suite`, () => {
  txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

  describe(`database transaction isolation level`, () => {
    txTest.scoped({ pgConfig: { isolationLevel: `read committed` } });

    txTest(`fails when using the default`, async ({ tx }) => {
      const result = push(tx, `1`, {
        profileId: ``,
        clientGroupId: ``,
        pushVersion: 1,
        schemaVersion: schema.version,
        mutations: [],
      });

      await expect(result).rejects.toThrow(/transaction_isolation/);
    });
  });

  txTest(`handles no mutations`, async ({ tx }) => {
    await push(tx, `1`, {
      profileId: ``,
      clientGroupId: ``,
      pushVersion: 1,
      schemaVersion: schema.version,
      mutations: [],
    });
  });

  txTest(
    `only allows a client group if it matches the user`,
    async ({ tx }) => {
      const user1 = await createUser(tx);
      const user2 = await createUser(tx);

      // Create a client group
      const [clientGroup] = await tx
        .insert(s.replicacheClientGroup)
        .values([
          {
            id: `1`,
            userId: user1.id,
            cvrVersion: 1,
            schemaVersion: schema.version,
          },
        ])
        .returning();
      invariant(clientGroup != null);

      const mut = {
        id: 1,
        name: `noop`,
        args: {},
        timestamp: 10_123,
        clientId: `c0f86dc7-4d49-4f37-a25b-4d06c9f1cb37`,
      };

      // User 2 doesn't own the clientGroup
      await expect(
        push(tx, user2.id, {
          profileId: ``,
          clientGroupId: clientGroup.id,
          pushVersion: 1,
          schemaVersion: schema.version,
          mutations: [mut],
        }),
      ).rejects.toThrow();

      // User 1 does own the clientGroup
      await push(tx, user1.id, {
        profileId: ``,
        clientGroupId: clientGroup.id,
        pushVersion: 1,
        schemaVersion: schema.version,
        mutations: [mut],
      });
    },
  );

  txTest(
    `creates a client group and client if one doesn't exist`,
    async ({ tx }) => {
      const clientId = `clientid`;
      const clientGroupId = `clientgroupid`;

      const user = await createUser(tx);

      const mut = {
        id: 1,
        name: `noop`,
        args: {},
        timestamp: 1,
        clientId,
      };

      await push(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pushVersion: 1,
        schemaVersion: schema.version,
        mutations: [mut],
      });

      const client = await tx.query.replicacheClient.findFirst({
        where: (t, { eq }) => eq(t.id, clientId),
      });
      expect(client?.id).toBe(clientId);

      const clientGroup = await tx.query.replicacheClientGroup.findFirst({
        where: (t, { eq }) => eq(t.id, clientGroupId),
      });
      expect(clientGroup?.id).toBe(clientGroupId);
    },
  );

  txTest(`skips already processed mutations`, async ({ tx }) => {
    const user = await createUser(tx);

    // Create a client group
    const [clientGroup] = await tx
      .insert(s.replicacheClientGroup)
      .values([{ userId: user.id, schemaVersion: schema.version }])
      .returning();
    invariant(clientGroup != null);

    // Create a client
    const [client] = await tx
      .insert(s.replicacheClient)
      .values([{ clientGroupId: clientGroup.id, lastMutationId: 1 }])
      .returning();
    invariant(client != null);

    const mut = {
      id: client.lastMutationId, // use the same ID
      name: schema.rateSkill._def.alias!,
      args: schema.rateSkill.marshalArgs({
        id: nanoid(),
        skill: glossToHanziWord(`我:i`),
        rating: Rating.Good,
        durationMs: null,
        now: new Date(),
      }),
      timestamp: 1,
      clientId: client.id,
    };

    await push(tx, user.id, {
      profileId: ``,
      clientGroupId: clientGroup.id,
      pushVersion: 1,
      schemaVersion: schema.version,
      mutations: [mut],
    });

    expect(
      await tx.query.skillState.findMany({
        where: (t, { eq }) => eq(t.userId, user.id),
      }),
    ).toEqual(
      // The mutation SHOULDN'T have done anything, it should be skipped.
      [],
    );
  });

  txTest(`does not process mutations from the future`, async ({ tx }) => {
    const user = await createUser(tx);

    // Create a client group
    const [clientGroup] = await tx
      .insert(s.replicacheClientGroup)
      .values([{ userId: user.id, schemaVersion: schema.version }])
      .returning();
    invariant(clientGroup != null);

    // Create a client
    const [client] = await tx
      .insert(s.replicacheClient)
      .values([{ clientGroupId: clientGroup.id, lastMutationId: 1 }])
      .returning();
    invariant(client != null);

    const mut = {
      id: client.lastMutationId + 2,
      name: ``,
      args: {},
      timestamp: 1,
      clientId: client.id,
    };

    await expect(
      push(tx, user.id, {
        profileId: ``,
        clientGroupId: clientGroup.id,
        pushVersion: 1,
        schemaVersion: schema.version,
        mutations: [mut],
      }),
    ).rejects.toThrow();
  });

  txTest(
    `invalid mutations must still update client.lastMutationID`,
    async ({ tx }) => {
      const user = await createUser(tx);

      // Create a client group
      const [clientGroup] = await tx
        .insert(s.replicacheClientGroup)
        .values([{ userId: user.id, schemaVersion: schema.version }])
        .returning();
      invariant(clientGroup != null);

      // Create a client
      const [client] = await tx
        .insert(s.replicacheClient)
        .values([{ clientGroupId: clientGroup.id, lastMutationId: 1 }])
        .returning();
      invariant(client != null);

      const mut = {
        id: client.lastMutationId + 1,
        name: `invalidMutation`,
        args: {},
        timestamp: 1,
        clientId: client.id,
      };

      await push(tx, user.id, {
        profileId: ``,
        clientGroupId: clientGroup.id,
        pushVersion: 1,
        schemaVersion: schema.version,
        mutations: [mut],
      });

      expect(
        await tx.query.replicacheClient.findFirst({
          where: (t, { eq }) => eq(t.id, client.id),
        }),
      ).toMatchObject({ lastMutationId: mut.id });
    },
  );

  txTest(`returns correct error for invalid push version`, async ({ tx }) => {
    const result = await push(tx, `1`, {
      profileId: ``,
      clientGroupId: ``,
      pushVersion: 666,
      schemaVersion: schema.version,
      mutations: [],
    });

    expect(result).toEqual({
      error: `VersionNotSupported`,
      versionType: `push`,
    });
  });
});

describe(`${pull.name} suite`, () => {
  txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

  describe(`database transaction isolation level`, () => {
    txTest.scoped({ pgConfig: { isolationLevel: `read committed` } });

    txTest(`fails when using the default`, async ({ tx }) => {
      const result = pull(tx, `xxx`, {
        profileId: ``,
        clientGroupId: ``,
        pullVersion: 1,
        schemaVersion: schema.version,
        cookie: null,
      });

      await expect(result).rejects.toThrow(/transaction_isolation/);
    });
  });

  txTest(`creates a CVR with lastMutationIds`, async ({ tx }) => {
    const clientGroupId = nanoid();
    const user = await createUser(tx);

    await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: schema.version,
      cookie: null,
    });

    const clientGroup = await tx.query.replicacheClientGroup.findFirst({
      where: (t, { eq }) => eq(t.userId, user.id),
    });

    expect(clientGroup).toMatchObject({ cvrVersion: 1 });
  });

  txTest(
    `non-existant client group creates one and stores cvrVersion`,
    async ({ tx }) => {
      const user = await createUser(tx);

      // Create a client group
      const [clientGroup] = await tx
        .insert(s.replicacheClientGroup)
        .values([{ userId: user.id, schemaVersion: schema.version }])
        .returning();
      invariant(clientGroup != null);

      // Create a client with a specific lastMutationId
      const [client] = await tx
        .insert(s.replicacheClient)
        .values([{ clientGroupId: clientGroup.id, lastMutationId: 66 }])
        .returning();
      invariant(client != null);

      const [skillState] = await tx
        .insert(s.skillState)
        .values([
          {
            userId: user.id,
            srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
            skill: glossToHanziWord(`我:i`),
          },
        ])
        .returning();
      invariant(skillState != null);

      const result = await pull(tx, user.id, {
        profileId: ``,
        clientGroupId: clientGroup.id,
        pullVersion: 1,
        schemaVersion: schema.version,
        cookie: null,
      });

      const cookie = `cookie` in result ? result.cookie : null;
      invariant(cookie != null);

      const cvr = await tx.query.replicacheCvr.findFirst({
        where: (t, { eq }) => eq(t.id, cookie.cvrId),
      });

      const expectedEntities = await computeCvrEntities(tx, user.id);

      // The CVR should have the lastMutationIds for the clients in the group
      expect(cvr).toMatchObject({
        lastMutationIds: { [client.id]: 66 },
        entities: expectedEntities,
      });
    },
  );

  txTest(
    `returns lastMutationIdChanges only for changed clients`,
    async ({ tx }) => {
      const clientGroupId = nanoid();
      const clientId1 = nanoid();
      const clientId2 = nanoid();

      const user = await createUser(tx);

      // Push a mutation from client 1
      await push(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pushVersion: 1,
        schemaVersion: schema.version,
        mutations: [
          {
            id: 1,
            name: `noop`,
            args: {},
            timestamp: 1,
            clientId: clientId1,
          },
        ],
      });

      // A pull without a cookie should return all clients (at this point just
      // client 1).
      const pull1 = await pull(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pullVersion: 1,
        schemaVersion: schema.version,
        cookie: null,
      });
      invariant(`cookie` in pull1);
      // Type assertion since we've verified cookie exists
      expect(pull1.lastMutationIdChanges).toEqual({
        [clientId1]: 1,
      });

      // Do a new mutation from client 2
      await push(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pushVersion: 1,
        schemaVersion: schema.version,
        mutations: [
          {
            id: 1,
            name: `noop`,
            args: {},
            timestamp: 1,
            clientId: clientId2,
          },
        ],
      });

      // A pull without a cookie should return all clients (now client 1 +
      // client 2).
      const pull2 = await pull(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pullVersion: 1,
        schemaVersion: schema.version,
        cookie: null,
      });
      invariant(`cookie` in pull2);
      expect(pull2.lastMutationIdChanges).toEqual({
        [clientId1]: 1,
        [clientId2]: 1,
      });

      // A pull using cookie1 should only report client 2 as changed.
      const pull3 = await pull(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pullVersion: 1,
        schemaVersion: schema.version,
        cookie: pull1.cookie,
      });
      invariant(`cookie` in pull3);
      expect(pull3.lastMutationIdChanges).toEqual({
        [clientId2]: 1,
      });

      // A pull using cookie3 should report no changes.
      const pull4 = await pull(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pullVersion: 1,
        schemaVersion: schema.version,
        cookie: pull3.cookie,
      });
      invariant(`cookie` in pull4);
      expect(pull4.lastMutationIdChanges).toEqual({});
    },
  );

  txTest(`null cookie, returns skillState patches`, async ({ tx }) => {
    const clientGroupId = nanoid();

    const user = await createUser(tx);

    const [skillState] = await tx
      .insert(s.skillState)
      .values([
        {
          userId: user.id,
          srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
          skill: glossToHanziWord(`我:i`),
        },
      ])
      .returning();
    invariant(skillState != null);

    const result = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: schema.version,
      cookie: null,
    });

    expect(result).toMatchObject({
      cookie: {
        order: 1,
      },
      patch: [
        { op: `clear` },
        {
          op: `put`,
          key: schema.skillState.marshalKey(skillState),
          value: schema.skillState.marshalValue({
            skill: skillState.skill,
            srs: skillState.srs,
          }),
        },
      ],
    });
  });

  txTest(`handles deletes for skillState`, async ({ tx }) => {
    const clientGroupId = nanoid();

    const user = await createUser(tx);

    const [skillState] = await tx
      .insert(s.skillState)
      .values([
        {
          userId: user.id,
          srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
          skill: glossToHanziWord(`我:i`),
        },
      ])
      .returning();
    invariant(skillState != null);

    const pull1 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: schema.version,
      cookie: null,
    });

    await tx.delete(s.skillState).where(eq(s.skillState.id, skillState.id));

    invariant(`cookie` in pull1);

    const pull2 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: schema.version,
      cookie: pull1.cookie,
    });

    expect(pull2).toMatchObject({
      cookie: {
        order: 2,
      },
      patch: [
        {
          op: `del`,
          key: schema.skillState.marshalKey(skillState),
        },
      ],
    });
  });

  txTest(`handles deletes for skillRating`, async ({ tx }) => {
    const clientGroupId = nanoid();

    const user = await createUser(tx);

    const now = new Date();

    const [skillRating] = await tx
      .insert(s.skillRating)
      .values([
        {
          userId: user.id,
          skill: glossToHanziWord(`我:i`),
          rating: Rating.Good,
          createdAt: now,
        },
      ])
      .returning();
    invariant(skillRating != null);

    const pull1 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: schema.version,
      cookie: null,
    });

    await tx.delete(s.skillRating).where(eq(s.skillRating.id, skillRating.id));

    invariant(`cookie` in pull1);

    const pull2 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: schema.version,
      cookie: pull1.cookie,
    });

    expect(pull2).toMatchObject({
      cookie: {
        order: 2,
      },
      patch: [
        {
          op: `del`,
          key: schema.skillRating.marshalKey({ id: skillRating.id }),
        },
      ],
    });
  });

  txTest(`handles puts for skillRating`, async ({ tx }) => {
    const clientGroupId = nanoid();

    const user = await createUser(tx);

    const now = new Date();

    const [skillRating] = await tx
      .insert(s.skillRating)
      .values([
        {
          userId: user.id,
          skill: glossToHanziWord(`我:i`),
          rating: Rating.Again,
          createdAt: now,
          durationMs: 1234,
        },
      ])
      .returning();
    invariant(skillRating != null);

    const pull1 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: schema.version,
      cookie: null,
    });

    expect(pull1).toMatchObject({
      patch: [
        {
          op: `clear`,
        },
        {
          op: `put`,
          key: schema.skillRating.marshalKey({ id: skillRating.id }),
          value: schema.skillRating.marshalValue({
            id: skillRating.id,
            skill: glossToHanziWord(`我:i`),
            rating: Rating.Again,
            createdAt: now,
            durationMs: 1234,
          }),
        },
      ],
    });
  });
});

describe(`${computeCvrEntities.name} suite`, () => {
  describe(`schema ${schema.version}`, () => {
    txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

    txTest(`works for non-existant user and client group`, async ({ tx }) => {
      expect(await computeCvrEntities(tx, `1`)).toEqual({
        hanziGlossMistake: {},
        hanziPinyinMistake: {},
        pinyinFinalAssociation: {},
        pinyinInitialAssociation: {},
        pinyinInitialGroupTheme: {},
        skillState: {},
        skillRating: {},
      });
    });

    txTest(`works for user`, async ({ tx }) => {
      const user = await createUser(tx);

      expect(await computeCvrEntities(tx, user.id)).toEqual({
        hanziGlossMistake: {},
        hanziPinyinMistake: {},
        pinyinFinalAssociation: {},
        pinyinInitialAssociation: {},
        pinyinInitialGroupTheme: {},
        skillState: {},
        skillRating: {},
      });
    });

    txTest(`only includes skillState for the user`, async ({ tx }) => {
      const user1 = await createUser(tx);
      const user2 = await createUser(tx);

      const [user1SkillState] = await tx
        .insert(s.skillState)
        .values([
          {
            userId: user1.id,
            skill: glossToHanziWord(`我:i`),
            srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
          },
          {
            userId: user2.id,
            skill: glossToHanziWord(`我:i`),
            srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
          },
        ])
        .returning({
          id: s.skillState.id,
          skill: s.skillState.skill,
          version: pgXmin(s.skillState),
        });
      invariant(user1SkillState != null);

      expect(await computeCvrEntities(tx, user1.id)).toEqual({
        hanziGlossMistake: {},
        hanziPinyinMistake: {},
        pinyinFinalAssociation: {},
        pinyinInitialAssociation: {},
        pinyinInitialGroupTheme: {},
        skillRating: {},
        skillState: {
          [user1SkillState.id]:
            user1SkillState.version +
            `:` +
            schema.skillState.marshalKey(user1SkillState),
        },
      });
    });

    txTest(`only includes skillRating for the user`, async ({ tx }) => {
      const user1 = await createUser(tx);
      const user2 = await createUser(tx);

      const [user1SkillRating] = await tx
        .insert(s.skillRating)
        .values([
          {
            userId: user1.id,
            skill: glossToHanziWord(`我:i`),
            rating: Rating.Again,
          },
          {
            userId: user2.id,
            skill: glossToHanziWord(`我:i`),
            rating: Rating.Good,
          },
        ])
        .returning({
          id: s.skillRating.id,
          skill: s.skillRating.skill,
          createdAt: s.skillRating.createdAt,
          version: pgXmin(s.skillRating),
        });
      invariant(user1SkillRating != null);

      expect(await computeCvrEntities(tx, user1.id)).toEqual({
        hanziGlossMistake: {},
        hanziPinyinMistake: {},
        pinyinFinalAssociation: {},
        pinyinInitialAssociation: {},
        pinyinInitialGroupTheme: {},
        skillRating: {
          [user1SkillRating.id]:
            user1SkillRating.version +
            `:` +
            schema.skillRating.marshalKey({ id: user1SkillRating.id }),
        },
        skillState: {},
      });
    });

    txTest(
      `only includes pinyinFinalAssociation for the user`,
      async ({ tx }) => {
        const user1 = await createUser(tx);
        const user2 = await createUser(tx);

        const [user1PinyinFinalAssociation] = await tx
          .insert(s.pinyinFinalAssociation)
          .values([
            {
              userId: user1.id,
              final: `p`,
              name: `p1`,
            },
            {
              userId: user2.id,
              final: `p`,
              name: `p2`,
            },
          ])
          .returning({
            id: s.pinyinFinalAssociation.id,
            final: s.pinyinFinalAssociation.final,
            version: pgXmin(s.pinyinFinalAssociation),
          });
        invariant(user1PinyinFinalAssociation != null);

        expect(await computeCvrEntities(tx, user1.id)).toEqual({
          hanziGlossMistake: {},
          hanziPinyinMistake: {},
          pinyinFinalAssociation: {
            [user1PinyinFinalAssociation.id]:
              user1PinyinFinalAssociation.version +
              `:` +
              schema.pinyinFinalAssociation.marshalKey(
                user1PinyinFinalAssociation,
              ),
          },
          pinyinInitialAssociation: {},
          pinyinInitialGroupTheme: {},
          skillRating: {},
          skillState: {},
        });
      },
    );

    txTest(
      `only includes pinyinInitialAssociation for the user`,
      async ({ tx }) => {
        const user1 = await createUser(tx);
        const user2 = await createUser(tx);

        const [user1PinyinInitialAssociation] = await tx
          .insert(s.pinyinInitialAssociation)
          .values([
            {
              userId: user1.id,
              initial: `p`,
              name: `p1`,
            },
            {
              userId: user2.id,
              initial: `p`,
              name: `p2`,
            },
          ])
          .returning({
            id: s.pinyinInitialAssociation.id,
            initial: s.pinyinInitialAssociation.initial,
            version: pgXmin(s.pinyinInitialAssociation),
          });
        invariant(user1PinyinInitialAssociation != null);

        expect(await computeCvrEntities(tx, user1.id)).toEqual({
          hanziGlossMistake: {},
          hanziPinyinMistake: {},
          pinyinFinalAssociation: {},
          pinyinInitialAssociation: {
            [user1PinyinInitialAssociation.id]:
              user1PinyinInitialAssociation.version +
              `:` +
              schema.pinyinInitialAssociation.marshalKey(
                user1PinyinInitialAssociation,
              ),
          },
          pinyinInitialGroupTheme: {},
          skillRating: {},
          skillState: {},
        });
      },
    );
  });
});
