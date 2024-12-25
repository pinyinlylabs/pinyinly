import { SkillType } from "@/data/model";
import * as r from "@/data/rizzleSchema";
import { MarshaledSkillId } from "@/data/rizzleSchema";
import { computeCvrEntities, pull, push } from "@/server/lib/replicache";
import * as schema from "@/server/schema";
import { Rating } from "@/util/fsrs";
import { invariant } from "@haohaohow/lib/invariant";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import assert from "node:assert/strict";
import { test } from "node:test";
import { withDbTest, withTxTest } from "./db";

void test(`push()`, async (t) => {
  const txTest = withTxTest(t);

  await txTest(`handles no mutations`, async (tx) => {
    await push(tx, `1`, {
      profileId: ``,
      clientGroupId: ``,
      pushVersion: 1,
      schemaVersion: `3`,
      mutations: [],
    });
  });

  await txTest(
    `only allows a client group if it matches the user`,
    async (tx) => {
      const mut = {
        id: 1,
        name: `noop`,
        args: {},
        timestamp: 10123,
        clientId: `c0f86dc7-4d49-4f37-a25b-4d06c9f1cb37`,
      };

      // Create a user
      const [user1, user2] = await tx
        .insert(schema.user)
        .values([{ id: `1` }, { id: `2` }])
        .returning();
      invariant(user1 != null && user2 != null);

      // Create a client group
      const [clientGroup] = await tx
        .insert(schema.replicacheClientGroup)
        .values([
          {
            id: `1`,
            userId: user1.id,
            cvrVersion: 1,
          },
        ])
        .returning();
      invariant(clientGroup != null);

      // User 2 doesn't own the clientGroup
      await assert.rejects(
        push(tx, user2.id, {
          profileId: ``,
          clientGroupId: clientGroup.id,
          pushVersion: 1,
          schemaVersion: `3`,
          mutations: [mut],
        }),
      );

      // User 1 does own the clientGroup
      await push(tx, user1.id, {
        profileId: ``,
        clientGroupId: clientGroup.id,
        pushVersion: 1,
        schemaVersion: `3`,
        mutations: [mut],
      });
    },
  );

  await txTest(
    `creates a client group and client if one doesn't exist`,
    async (tx) => {
      const clientId = `clientid`;
      const clientGroupId = `clientgroupid`;

      // Create a user
      const [user] = await tx
        .insert(schema.user)
        .values([{ id: `1` }])
        .returning();
      invariant(user != null);

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
        schemaVersion: `3`,
        mutations: [mut],
      });

      const client = await tx.query.replicacheClient.findFirst({
        where: (t, { eq }) => eq(t.id, clientId),
      });
      assert.equal(client?.id, clientId);

      const clientGroup = await tx.query.replicacheClientGroup.findFirst({
        where: (t, { eq }) => eq(t.id, clientGroupId),
      });
      assert.equal(clientGroup?.id, clientGroupId);
    },
  );

  await txTest(`addSkillState() should insert to the db`, async (tx) => {
    const clientId = `clientid`;
    const clientGroupId = `clientgroupid`;

    // Create a user
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    const now = new Date();

    const mut = {
      id: 1,
      name: `addSkillState`,
      args: r.addSkillState.marshalArgs({
        skill: {
          type: SkillType.EnglishToHanzi,
          hanzi: `我`,
        },
        now,
      }),
      timestamp: 1,
      clientId,
    };

    await push(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pushVersion: 1,
      schemaVersion: `3`,
      mutations: [mut],
    });

    const skillState = await tx.query.skillState.findFirst({
      where: (t, { eq }) => eq(t.userId, user.id),
    });
    assert.ok(skillState != null);
    assert.deepEqual(skillState.dueAt, now);
    assert.deepEqual(skillState.createdAt, now);
    assert.equal(skillState.srs, null);
    assert.equal(
      skillState.skillId,
      r.rSkillId().marshal({
        type: SkillType.EnglishToHanzi,
        hanzi: `我`,
      }),
    );
  });

  await txTest(`skips already processed mutations`, async (tx) => {
    // Create a user
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    // Create a client group
    const [clientGroup] = await tx
      .insert(schema.replicacheClientGroup)
      .values([{ userId: user.id }])
      .returning();
    invariant(clientGroup != null);

    // Create a client
    const [client] = await tx
      .insert(schema.replicacheClient)
      .values([{ clientGroupId: clientGroup.id, lastMutationId: 1 }])
      .returning();
    invariant(client != null);

    const mut = {
      id: client.lastMutationId, // use the same ID
      name: `addSkillState`,
      args: r.addSkillState.marshalArgs({
        skill: {
          type: SkillType.EnglishToHanzi,
          hanzi: `我`,
        },
        now: new Date(),
      }),
      timestamp: 1,
      clientId: client.id,
    };

    await push(tx, user.id, {
      profileId: ``,
      clientGroupId: clientGroup.id,
      pushVersion: 1,
      schemaVersion: `3`,
      mutations: [mut],
    });

    assert.deepEqual(
      await tx.query.skillState.findMany({
        where: (t, { eq }) => eq(t.userId, user.id),
      }),
      // The mutation SHOULDN'T have done anything, it should be skipped.
      [],
    );
  });

  await txTest(`does not process mutations from the future`, async (tx) => {
    // Create a user
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    // Create a client group
    const [clientGroup] = await tx
      .insert(schema.replicacheClientGroup)
      .values([{ userId: user.id }])
      .returning();
    invariant(clientGroup != null);

    // Create a client
    const [client] = await tx
      .insert(schema.replicacheClient)
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

    await assert.rejects(
      push(tx, user.id, {
        profileId: ``,
        clientGroupId: clientGroup.id,
        pushVersion: 1,
        schemaVersion: `3`,
        mutations: [mut],
      }),
    );
  });

  await txTest.todo(`mutations return affected row IDs for CVR`);

  await txTest(
    `invalid mutations must still increment client.lastMutationID`,
    async (tx) => {
      // Create a user
      const [user] = await tx
        .insert(schema.user)
        .values([{ id: `1` }])
        .returning();
      invariant(user != null);

      // Create a client group
      const [clientGroup] = await tx
        .insert(schema.replicacheClientGroup)
        .values([{ userId: user.id }])
        .returning();
      invariant(clientGroup != null);

      // Create a client
      const [client] = await tx
        .insert(schema.replicacheClient)
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
        schemaVersion: `3`,
        mutations: [mut],
      });

      assert.partialDeepStrictEqual(
        await tx.query.replicacheClient.findFirst({
          where: (t, { eq }) => eq(t.id, client.id),
        }),
        { lastMutationId: mut.id },
      );
    },
  );

  await txTest(
    `returns correct error for invalid schema version`,
    async (tx) => {
      const result = await push(tx, `1`, {
        profileId: ``,
        clientGroupId: ``,
        pushVersion: 1,
        schemaVersion: `666`,
        mutations: [],
      });

      assert.deepEqual(result, {
        error: `VersionNotSupported`,
        versionType: `schema`,
      });
    },
  );

  await txTest(`returns correct error for invalid push version`, async (tx) => {
    const result = await push(tx, `1`, {
      profileId: ``,
      clientGroupId: ``,
      pushVersion: 666,
      schemaVersion: `3`,
      mutations: [],
    });

    assert.deepEqual(result, {
      error: `VersionNotSupported`,
      versionType: `push`,
    });
  });
});

void test(`pull()`, async (t) => {
  const txTest = withTxTest(t);

  await txTest(`creates a CVR with lastMutationIds`, async (tx) => {
    const clientGroupId = nanoid();

    // Create a user
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: `3`,
      cookie: null,
    });

    const clientGroup = await tx.query.replicacheClientGroup.findFirst({
      where: (t, { eq }) => eq(t.userId, user.id),
    });

    assert.partialDeepStrictEqual(clientGroup, { cvrVersion: 1 });
  });

  await txTest(
    `non-existant client group creates one and stores cvrVersion`,
    async (tx) => {
      // Create a user
      const [user] = await tx
        .insert(schema.user)
        .values([{ id: `1` }])
        .returning();
      invariant(user != null);

      // Create a client group
      const [clientGroup] = await tx
        .insert(schema.replicacheClientGroup)
        .values([{ userId: user.id }])
        .returning();
      invariant(clientGroup != null);

      // Create a client with a specific lastMutationId
      const [client] = await tx
        .insert(schema.replicacheClient)
        .values([{ clientGroupId: clientGroup.id, lastMutationId: 66 }])
        .returning();
      invariant(client != null);

      const [skillState] = await tx
        .insert(schema.skillState)
        .values([
          {
            userId: user.id,
            dueAt: new Date(),
            srs: null,
            skillId: r.rSkillId().marshal({
              type: SkillType.EnglishToHanzi,
              hanzi: `我`,
            }),
          },
        ])
        .returning();
      invariant(skillState != null);

      const result = await pull(tx, user.id, {
        profileId: ``,
        clientGroupId: clientGroup.id,
        pullVersion: 1,
        schemaVersion: `3`,
        cookie: null,
      });

      const cookie = `cookie` in result ? result.cookie : null;
      assert.ok(cookie != null);

      const cvr = await tx.query.replicacheCvr.findFirst({
        where: (t, { eq }) => eq(t.id, cookie.cvrId),
      });

      const expectedEntities = await computeCvrEntities(
        tx,
        user.id,
        clientGroup.id,
      );

      // The CVR should have the lastMutationIds for the clients in the group
      assert.partialDeepStrictEqual(cvr, {
        lastMutationIds: { [client.id]: 66 },
        entities: expectedEntities,
      });
    },
  );

  await txTest.todo(`returns lastMutationIDChanges only for changed clients`);

  await txTest(`null cookie, returns skillState patches`, async (tx) => {
    const clientGroupId = nanoid();

    // Create a user
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    const now = new Date();

    const [skillState] = await tx
      .insert(schema.skillState)
      .values([
        {
          userId: user.id,
          dueAt: now,
          srs: null,
          skillId: r.rSkillId().marshal({
            type: SkillType.EnglishToHanzi,
            hanzi: `我`,
          }),
        },
      ])
      .returning();
    invariant(skillState != null);

    const result = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: `3`,
      cookie: null,
    });

    assert.partialDeepStrictEqual(result, {
      cookie: {
        order: 1,
      },
      lastMutationIDChanges: {},
      patch: [
        { op: `clear` },
        {
          op: `put`,
          key: r.skillState.marshalKey({
            skill: skillState.skillId as MarshaledSkillId,
          }),
          value: r.skillState.marshalValue({
            created: skillState.createdAt,
            srs: null,
            due: skillState.dueAt,
          }),
        },
      ],
    });
  });

  await txTest(`handles deletes for skillState`, async (tx) => {
    const clientGroupId = nanoid();

    // Create a user
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    const now = new Date();

    const [skillState] = await tx
      .insert(schema.skillState)
      .values([
        {
          userId: user.id,
          dueAt: now,
          srs: null,
          skillId: r.rSkillId().marshal({
            type: SkillType.EnglishToHanzi,
            hanzi: `我`,
          }),
        },
      ])
      .returning();
    invariant(skillState != null);

    const pull1 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: `3`,
      cookie: null,
    });

    await tx
      .delete(schema.skillState)
      .where(eq(schema.skillState.id, skillState.id));

    assert.ok(`cookie` in pull1);

    const pull2 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: `3`,
      cookie: pull1.cookie,
    });

    assert.partialDeepStrictEqual(pull2, {
      cookie: {
        order: 2,
      },
      lastMutationIDChanges: {},
      patch: [
        {
          op: `del`,
          key: r.skillState.marshalKey({
            skill: skillState.skillId as MarshaledSkillId,
          }),
        },
      ],
    });
  });

  await txTest(`handles deletes for skillRating`, async (tx) => {
    const clientGroupId = nanoid();

    // Create a user
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    const now = new Date();

    const [skillRating] = await tx
      .insert(schema.skillRating)
      .values([
        {
          userId: user.id,
          skillId: r.rSkillId().marshal({
            type: SkillType.EnglishToHanzi,
            hanzi: `我`,
          }),
          rating: r.rFsrsRating.marshal(Rating.Good),
          createdAt: now,
        },
      ])
      .returning();
    invariant(skillRating != null);

    const pull1 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: `3`,
      cookie: null,
    });

    await tx
      .delete(schema.skillRating)
      .where(eq(schema.skillRating.id, skillRating.id));

    assert.ok(`cookie` in pull1);

    const pull2 = await pull(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pullVersion: 1,
      schemaVersion: `3`,
      cookie: pull1.cookie,
    });

    assert.partialDeepStrictEqual(pull2, {
      cookie: {
        order: 2,
      },
      lastMutationIDChanges: {},
      patch: [
        {
          op: `del`,
          key: r.skillRating.marshalKey({
            skill: skillRating.skillId as MarshaledSkillId,
            when: now,
          }),
        },
      ],
    });
  });
});

void test(`dbTest() examples`, async (t) => {
  const dbTest = withDbTest(t);

  await dbTest(`should work with inline fixtures 1`, async (db) => {
    await db.insert(schema.user).values([{ id: `1` }]);

    // Your test logic here
    const users = await db.select().from(schema.user);
    assert.equal(users.length, 1);
  });
});

void test(`computeCvr()`, async (t) => {
  const txTest = withTxTest(t);

  await txTest(`works for non-existant user and client group`, async (tx) => {
    assert.deepEqual(await computeCvrEntities(tx, `1`, ``), {
      client: {},
      skillState: {},
      skillRating: {},
    });
  });

  await txTest(`works for user`, async (tx) => {
    const [user] = await tx
      .insert(schema.user)
      .values([{ id: `1` }])
      .returning();
    invariant(user != null);

    assert.deepEqual(await computeCvrEntities(tx, user.id, ``), {
      client: {},
      skillState: {},
      skillRating: {},
    });
  });

  await txTest(`only includes skillState for the user`, async (tx) => {
    const [user1, user2] = await tx
      .insert(schema.user)
      .values([{ id: `1` }, { id: `2` }])
      .returning();
    invariant(user1 != null && user2 != null);

    const [user1SkillState] = await tx
      .insert(schema.skillState)
      .values([
        {
          userId: user1.id,
          skillId: r.rSkillId().marshal({
            type: SkillType.EnglishToHanzi,
            hanzi: `我`,
          }),
          srs: null,
          dueAt: new Date(),
          createdAt: new Date(),
        },
        {
          userId: user2.id,
          skillId: r.rSkillId().marshal({
            type: SkillType.EnglishToHanzi,
            hanzi: `我`,
          }),
          srs: null,
          dueAt: new Date(),
          createdAt: new Date(),
        },
      ])
      .returning({
        id: schema.skillState.id,
        skillId: schema.skillState.skillId,
        version: sql<string>`${schema.skillState}.xmin`,
      });
    invariant(user1SkillState != null);

    assert.deepEqual(await computeCvrEntities(tx, user1.id, ``), {
      client: {},
      skillRating: {},
      skillState: {
        [user1SkillState.id]:
          user1SkillState.version +
          `:` +
          r.skillState.marshalKey({
            skill: user1SkillState.skillId as MarshaledSkillId,
          }),
      },
    });
  });

  await txTest(`only includes skillRating for the user`, async (tx) => {
    const [user1, user2] = await tx
      .insert(schema.user)
      .values([{ id: `1` }, { id: `2` }])
      .returning();
    invariant(user1 != null && user2 != null);

    const [user1SkillRating] = await tx
      .insert(schema.skillRating)
      .values([
        {
          userId: user1.id,
          skillId: r.rSkillId().marshal({
            type: SkillType.EnglishToHanzi,
            hanzi: `我`,
          }),
          rating: r.rFsrsRating.marshal(Rating.Again),
        },
        {
          userId: user2.id,
          skillId: r.rSkillId().marshal({
            type: SkillType.EnglishToHanzi,
            hanzi: `我`,
          }),
          rating: r.rFsrsRating.marshal(Rating.Good),
        },
      ])
      .returning({
        id: schema.skillRating.id,
        skillId: schema.skillRating.skillId,
        createdAt: schema.skillRating.createdAt,
        version: sql<string>`${schema.skillRating}.xmin`,
      });
    invariant(user1SkillRating != null);

    assert.deepEqual(await computeCvrEntities(tx, user1.id, ``), {
      client: {},
      skillRating: {
        [user1SkillRating.id]:
          user1SkillRating.version +
          `:` +
          r.skillRating.marshalKey({
            skill: user1SkillRating.skillId as MarshaledSkillId,
            when: user1SkillRating.createdAt,
          }),
      },
      skillState: {},
    });
  });
});
