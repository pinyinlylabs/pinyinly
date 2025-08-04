import type { PinyinSoundGroupId, PinyinSoundId } from "#data/model.ts";
import { v9 as schema, srsStateFromFsrsState } from "#data/rizzleSchema.ts";
import { glossToHanziWord } from "#data/skills.ts";
import { pgXmin } from "#server/lib/db.ts";
import {
  computeEntitiesState,
  computePatch,
  pull,
  push,
} from "#server/lib/replicache/v9.ts";
import type { CvrEntities } from "#server/pgSchema.ts";
import * as s from "#server/pgSchema.ts";
import { nextReview, Rating } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.ts";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { createUser, txTest } from "../dbHelpers";

describe(`push suite` satisfies HasNameOf<typeof push>, () => {
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

describe(`pull suite` satisfies HasNameOf<typeof pull>, () => {
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

      const entitiesState = await computeEntitiesState(tx, user.id);
      const patch = computePatch({}, entitiesState);

      // The CVR should have the lastMutationIds for the clients in the group
      expect(cvr).toMatchObject({
        lastMutationIds: { [client.id]: 66 },
        entities: patch.nextCvrEntities,
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
      expect(pull1).toHaveProperty(`cookie`);
      expect(`lastMutationIdChanges` in pull1).toBe(true);
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
      expect(pull2).toHaveProperty(`cookie`);
      expect(`lastMutationIdChanges` in pull2).toBe(true);
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
        cookie: `cookie` in pull1 ? pull1.cookie : null,
      });
      invariant(`cookie` in pull3);
      expect(pull3).toHaveProperty(`cookie`);
      expect(`lastMutationIdChanges` in pull3).toBe(true);
      expect(pull3.lastMutationIdChanges).toEqual({
        [clientId2]: 1,
      });

      // A pull using cookie3 should report no changes.
      const pull4 = await pull(tx, user.id, {
        profileId: ``,
        clientGroupId,
        pullVersion: 1,
        schemaVersion: schema.version,
        cookie: `cookie` in pull3 ? pull3.cookie : null,
      });
      invariant(`cookie` in pull4);
      expect(pull4).toHaveProperty(`cookie`);
      expect(`lastMutationIdChanges` in pull4).toBe(true);
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

  txTest(`handles skill renames for skillState`, async ({ tx }) => {
    // This test ensures that changes to the skill (which is used as the key in
    // replicache) is correctly turned into delete+add. The skill might change
    // if the HanziWord meaning key is renamed (e.g. 我:i to 我:me).

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

    // Rename 我:i to 我:me. Need to start a new checkpoint so that xmin is
    // updated, otherwise it won't be seen as a diff by computeEntitiesState.
    const [updatedSkillState] = await tx.transaction((tx) =>
      tx
        .update(s.skillState)
        .set({ skill: glossToHanziWord(`我:me`) })
        .where(eq(s.skillState.id, skillState.id))
        .returning(),
    );
    invariant(updatedSkillState != null);

    expect(pull1).toHaveProperty(`cookie`);
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
        order: nonNullable(pull1.cookie).order + 1,
      },
      patch: [
        {
          op: `del`,
          key: schema.skillState.marshalKey({
            skill: glossToHanziWord(`我:i`),
          }),
        },
        {
          op: `put`,
          key: schema.skillState.marshalKey({
            skill: glossToHanziWord(`我:me`),
          }),
          value: schema.skillState.marshalValue(updatedSkillState),
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

    expect(pull1).toHaveProperty(`cookie`);
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

    expect(pull1).toHaveProperty(`cookie`);
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

  txTest(`handles skill renames for skillRating`, async ({ tx }) => {
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

    // Rename 我:i to 我:me. Need to start a new checkpoint so that xmin is
    // updated, otherwise it won't be seen as a diff by computeEntitiesState.
    await tx.transaction((tx) =>
      tx
        .update(s.skillRating)
        .set({ skill: glossToHanziWord(`我:me`) })
        .where(eq(s.skillRating.id, skillRating.id)),
    );

    expect(pull1).toHaveProperty(`cookie`);
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
        order: nonNullable(pull1.cookie).order + 1,
      },
      patch: [
        {
          op: `put`,
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

describe(
  `computeEntitiesState suite` satisfies HasNameOf<typeof computeEntitiesState>,
  () => {
    describe(`schema ${schema.version}`, () => {
      txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

      txTest(`works for non-existant user and client group`, async ({ tx }) => {
        await expect(computeEntitiesState(tx, `1`)).resolves.toEqual({
          hanziGlossMistake: [],
          hanziPinyinMistake: [],
          pinyinSound: [],
          pinyinSoundGroup: [],
          skillState: [],
          skillRating: [],
          setting: [],
        });
      });

      txTest(`works for user`, async ({ tx }) => {
        const user = await createUser(tx);

        await expect(computeEntitiesState(tx, user.id)).resolves.toEqual({
          hanziGlossMistake: [],
          hanziPinyinMistake: [],
          pinyinSound: [],
          pinyinSoundGroup: [],
          skillState: [],
          skillRating: [],
          setting: [],
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
            key: s.skillState.skill,
            xmin: pgXmin(s.skillState),
          });
        invariant(user1SkillState != null);

        await expect(computeEntitiesState(tx, user1.id)).resolves.toEqual({
          hanziGlossMistake: [],
          hanziPinyinMistake: [],
          pinyinSound: [],
          pinyinSoundGroup: [],
          skillRating: [],
          skillState: [user1SkillState],
          setting: [],
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
            xmin: pgXmin(s.skillRating),
          });
        invariant(user1SkillRating != null);

        await expect(computeEntitiesState(tx, user1.id)).resolves.toEqual({
          hanziGlossMistake: [],
          hanziPinyinMistake: [],
          pinyinSound: [],
          pinyinSoundGroup: [],
          skillRating: [user1SkillRating],
          skillState: [],
          setting: [],
        });
      });

      txTest(`only includes pinyinSound for the user`, async ({ tx }) => {
        const user1 = await createUser(tx);
        const user2 = await createUser(tx);

        const [user1PinyinSound] = await tx
          .insert(s.pinyinSound)
          .values([
            {
              userId: user1.id,
              soundId: `p` as PinyinSoundId,
              name: `p1`,
            },
            {
              userId: user2.id,
              soundId: `p` as PinyinSoundId,
              name: `p2`,
            },
          ])
          .returning({
            id: s.pinyinSound.id,
            key: s.pinyinSound.soundId,
            xmin: pgXmin(s.pinyinSound),
          });
        invariant(user1PinyinSound != null);

        await expect(computeEntitiesState(tx, user1.id)).resolves.toEqual({
          hanziGlossMistake: [],
          hanziPinyinMistake: [],
          pinyinSound: [user1PinyinSound],
          pinyinSoundGroup: [],
          skillRating: [],
          skillState: [],
          setting: [],
        });
      });

      txTest(`only includes pinyinSoundGroup for the user`, async ({ tx }) => {
        const user1 = await createUser(tx);
        const user2 = await createUser(tx);

        const [user1PinyinSoundGroup] = await tx
          .insert(s.pinyinSoundGroup)
          .values([
            {
              userId: user1.id,
              soundGroupId: `p` as PinyinSoundGroupId,
              theme: `p1`,
            },
            {
              userId: user2.id,
              soundGroupId: `p` as PinyinSoundGroupId,
              theme: `p2`,
            },
          ])
          .returning({
            id: s.pinyinSoundGroup.id,
            key: s.pinyinSoundGroup.soundGroupId,
            xmin: pgXmin(s.pinyinSoundGroup),
          });
        invariant(user1PinyinSoundGroup != null);

        await expect(computeEntitiesState(tx, user1.id)).resolves.toEqual({
          hanziGlossMistake: [],
          hanziPinyinMistake: [],
          pinyinSound: [],
          pinyinSoundGroup: [user1PinyinSoundGroup],
          skillRating: [],
          skillState: [],
          setting: [],
        });
      });
    });
  },
);

describe(`computePatch suite` satisfies HasNameOf<typeof computePatch>, () => {
  type EntitiesState = Parameters<typeof computePatch>[1];

  test(`unchanged entities are preserved`, async () => {
    const prevCvr: CvrEntities = {
      hanziGlossMistake: { x1: `1` },
      hanziPinyinMistake: { x2: `2` },
      pinyinSound: { x3: `3` },
      pinyinSoundGroup: { x4: `4` },
      skillState: { x6: `6` },
      skillRating: { x7: `7` },
      setting: { x8: `8` },
    };
    const entitiesState: EntitiesState = {
      hanziGlossMistake: [{ id: `x1`, xmin: `1` }],
      hanziPinyinMistake: [{ id: `x2`, xmin: `2` }],
      pinyinSound: [{ id: `x3`, xmin: `3` }],
      pinyinSoundGroup: [{ id: `x4`, xmin: `4` }],
      skillState: [{ id: `x6`, xmin: `6` }],
      skillRating: [{ id: `x7`, xmin: `7` }],
      setting: [{ id: `x8`, xmin: `8` }],
    };
    expect(computePatch(prevCvr, entitiesState)).toEqual({
      nextCvrEntities: prevCvr,
      partial: false,
      patchOpsUnhydrated: {
        hanziGlossMistake: { delKeys: [], putIds: [] },
        hanziPinyinMistake: { delKeys: [], putIds: [] },
        pinyinSound: { delKeys: [], putIds: [] },
        pinyinSoundGroup: { delKeys: [], putIds: [] },
        skillState: { delKeys: [], putIds: [] },
        skillRating: { delKeys: [], putIds: [] },
        setting: { delKeys: [], putIds: [] },
      },
    });
  });
});
