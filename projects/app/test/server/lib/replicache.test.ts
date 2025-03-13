import { supportedSchemas, v6 } from "#data/rizzleSchema.ts";
import { englishToHanziWord } from "#data/skills.ts";
import { Drizzle } from "#server/lib/db.ts";
import {
  computeCvrEntities,
  fetchMutations,
  pull,
  push,
} from "#server/lib/replicache.ts";
import * as s from "#server/schema.ts";
import { Rating } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.ts";
import { invariant } from "@haohaohow/lib/invariant";
import { eq, sql } from "drizzle-orm";
import assert from "node:assert/strict";
import { test } from "node:test";
import { withDbTest, withTxTest } from "./dbHelpers";

async function createUser(tx: Drizzle, id: string = nanoid()) {
  const [user] = await tx.insert(s.user).values([{ id }]).returning();
  assert.ok(user != null);
  return user;
}

void test(`push()`, async (t) => {
  for (const schema of supportedSchemas) {
    await t.test(`schemaVersion: ${schema.version}`, async (t) => {
      const txTest = withTxTest(t, { isolationLevel: `repeatable read` });

      await test(`database transaction isolation level`, async (t) => {
        const txTest = withTxTest(t, { isolationLevel: `read committed` });

        await txTest(`fails when using the default`, async (tx) => {
          const result = push(tx, `1`, {
            profileId: ``,
            clientGroupId: ``,
            pushVersion: 1,
            schemaVersion: schema.version,
            mutations: [],
          });

          await assert.rejects(result, /transaction_isolation/);
        });
      });

      await txTest(`handles no mutations`, async (tx) => {
        await push(tx, `1`, {
          profileId: ``,
          clientGroupId: ``,
          pushVersion: 1,
          schemaVersion: schema.version,
          mutations: [],
        });
      });

      await txTest(
        `only allows a client group if it matches the user`,
        async (tx) => {
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
          await assert.rejects(
            push(tx, user2.id, {
              profileId: ``,
              clientGroupId: clientGroup.id,
              pushVersion: 1,
              schemaVersion: schema.version,
              mutations: [mut],
            }),
          );

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

      await txTest(
        `creates a client group and client if one doesn't exist`,
        async (tx) => {
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
          assert.equal(client?.id, clientId);

          const clientGroup = await tx.query.replicacheClientGroup.findFirst({
            where: (t, { eq }) => eq(t.id, clientGroupId),
          });
          assert.equal(clientGroup?.id, clientGroupId);
        },
      );

      await txTest(`initSkillState() should insert to the db`, async (tx) => {
        const clientId = `clientid`;
        const clientGroupId = `clientgroupid`;

        const user = await createUser(tx);

        const now = new Date();

        const mut = {
          id: 1,
          name: `addSkillState`,
          args: schema.initSkillState.marshalArgs({
            skill: englishToHanziWord(`我:i`),
            now,
          }),
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

        const skillState = await tx.query.skillState.findFirst({
          where: (t, { eq }) => eq(t.userId, user.id),
        });
        assert.ok(skillState != null);
        assert.deepEqual(skillState.due, now);
        assert.deepEqual(skillState.createdAt, now);
        assert.equal(skillState.srs, null);
        assert.deepEqual(skillState.skill, englishToHanziWord(`我:i`));
      });

      await txTest(`skips already processed mutations`, async (tx) => {
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
          name: `addSkillState`,
          args: schema.initSkillState.marshalArgs({
            skill: englishToHanziWord(`我:i`),
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

        assert.deepEqual(
          await tx.query.skillState.findMany({
            where: (t, { eq }) => eq(t.userId, user.id),
          }),
          // The mutation SHOULDN'T have done anything, it should be skipped.
          [],
        );
      });

      await txTest(`does not process mutations from the future`, async (tx) => {
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

        await assert.rejects(
          push(tx, user.id, {
            profileId: ``,
            clientGroupId: clientGroup.id,
            pushVersion: 1,
            schemaVersion: schema.version,
            mutations: [mut],
          }),
        );
      });

      await txTest(
        `invalid mutations must still update client.lastMutationID`,
        async (tx) => {
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

      await txTest(
        `returns correct error for invalid push version`,
        async (tx) => {
          const result = await push(tx, `1`, {
            profileId: ``,
            clientGroupId: ``,
            pushVersion: 666,
            schemaVersion: schema.version,
            mutations: [],
          });

          assert.deepEqual(result, {
            error: `VersionNotSupported`,
            versionType: `push`,
          });
        },
      );
    });
  }
});

void test(`pull()`, async (t) => {
  for (const schema of supportedSchemas) {
    await t.test(`schemaVersion: ${schema.version}`, async (t) => {
      const txTest = withTxTest(t, { isolationLevel: `repeatable read` });

      await test(`database transaction isolation level`, async (t) => {
        const txTest = withTxTest(t, { isolationLevel: `read committed` });

        await txTest(`fails when using the default`, async (tx) => {
          const result = pull(tx, `xxx`, {
            profileId: ``,
            clientGroupId: ``,
            pullVersion: 1,
            schemaVersion: schema.version,
            cookie: null,
          });

          await assert.rejects(result, /transaction_isolation/);
        });
      });

      await txTest(`creates a CVR with lastMutationIds`, async (tx) => {
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

        assert.partialDeepStrictEqual(clientGroup, { cvrVersion: 1 });
      });

      await txTest(
        `non-existant client group creates one and stores cvrVersion`,
        async (tx) => {
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
                due: new Date(),
                srs: null,
                skill: englishToHanziWord(`我:i`),
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
          assert.ok(cookie != null);

          const cvr = await tx.query.replicacheCvr.findFirst({
            where: (t, { eq }) => eq(t.id, cookie.cvrId),
          });

          const expectedEntities = await computeCvrEntities(
            tx,
            user.id,
            schema,
          );

          // The CVR should have the lastMutationIds for the clients in the group
          assert.partialDeepStrictEqual(cvr, {
            lastMutationIds: { [client.id]: 66 },
            entities: expectedEntities,
          });
        },
      );

      await txTest(
        `returns lastMutationIdChanges only for changed clients`,
        async (tx) => {
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
          assert.ok(`cookie` in pull1);
          assert.deepEqual(pull1.lastMutationIdChanges, {
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
          assert.ok(`cookie` in pull2);
          assert.deepEqual(pull2.lastMutationIdChanges, {
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
          assert.ok(`cookie` in pull3);
          assert.deepEqual(pull3.lastMutationIdChanges, {
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
          assert.ok(`cookie` in pull4);
          assert.deepEqual(pull4.lastMutationIdChanges, {});
        },
      );

      await txTest(`null cookie, returns skillState patches`, async (tx) => {
        const clientGroupId = nanoid();

        const user = await createUser(tx);

        const now = new Date();

        const [skillState] = await tx
          .insert(s.skillState)
          .values([
            {
              userId: user.id,
              due: now,
              srs: null,
              skill: englishToHanziWord(`我:i`),
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

        assert.partialDeepStrictEqual(result, {
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
                createdAt: skillState.createdAt,
                srs: null,
                due: skillState.due,
              }),
            },
          ],
        });
      });

      await txTest(`handles deletes for skillState`, async (tx) => {
        const clientGroupId = nanoid();

        const user = await createUser(tx);

        const now = new Date();

        const [skillState] = await tx
          .insert(s.skillState)
          .values([
            {
              userId: user.id,
              due: now,
              srs: null,
              skill: englishToHanziWord(`我:i`),
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

        assert.ok(`cookie` in pull1);

        const pull2 = await pull(tx, user.id, {
          profileId: ``,
          clientGroupId,
          pullVersion: 1,
          schemaVersion: schema.version,
          cookie: pull1.cookie,
        });

        assert.partialDeepStrictEqual(pull2, {
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

      await txTest(`handles deletes for skillRating`, async (tx) => {
        const clientGroupId = nanoid();

        const user = await createUser(tx);

        const now = new Date();

        const [skillRating] = await tx
          .insert(s.skillRating)
          .values([
            {
              userId: user.id,
              skill: englishToHanziWord(`我:i`),
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

        await tx
          .delete(s.skillRating)
          .where(eq(s.skillRating.id, skillRating.id));

        assert.ok(`cookie` in pull1);

        const pull2 = await pull(tx, user.id, {
          profileId: ``,
          clientGroupId,
          pullVersion: 1,
          schemaVersion: schema.version,
          cookie: pull1.cookie,
        });

        assert.partialDeepStrictEqual(pull2, {
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
    });
  }
});

void test(`dbTest() examples`, async (t) => {
  const dbTest = withDbTest(t);

  await dbTest(`should work with inline fixtures 1`, async (db) => {
    await db.insert(s.user).values([{ id: `1` }]);

    // Your test logic here
    const users = await db.select().from(s.user);
    assert.equal(users.length, 1);
  });
});

void test(`computeCvr()`, async (t) => {
  for (const schema of supportedSchemas) {
    await t.test(`schemaVersion: ${schema.version}`, async (t) => {
      const txTest = withTxTest(t);

      await txTest(
        `works for non-existant user and client group`,
        async (tx) => {
          assert.deepEqual(await computeCvrEntities(tx, `1`, schema), {
            pinyinFinalAssociation: {},
            pinyinInitialAssociation: {},
            pinyinInitialGroupTheme: {},
            skillState: {},
            skillRating: {},
          });
        },
      );

      await txTest(`works for user`, async (tx) => {
        const user = await createUser(tx);

        assert.deepEqual(await computeCvrEntities(tx, user.id, schema), {
          pinyinFinalAssociation: {},
          pinyinInitialAssociation: {},
          pinyinInitialGroupTheme: {},
          skillState: {},
          skillRating: {},
        });
      });

      await txTest(`only includes skillState for the user`, async (tx) => {
        const user1 = await createUser(tx);
        const user2 = await createUser(tx);

        const [user1SkillState] = await tx
          .insert(s.skillState)
          .values([
            {
              userId: user1.id,
              skill: englishToHanziWord(`我:i`),
              srs: null,
              due: new Date(),
              createdAt: new Date(),
            },
            {
              userId: user2.id,
              skill: englishToHanziWord(`我:i`),
              srs: null,
              due: new Date(),
              createdAt: new Date(),
            },
          ])
          .returning({
            id: s.skillState.id,
            skill: s.skillState.skill,
            version: sql<string>`${s.skillState}.xmin`,
          });
        invariant(user1SkillState != null);

        assert.deepEqual(await computeCvrEntities(tx, user1.id, schema), {
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

      await txTest(`only includes skillRating for the user`, async (tx) => {
        const user1 = await createUser(tx);
        const user2 = await createUser(tx);

        const [user1SkillRating] = await tx
          .insert(s.skillRating)
          .values([
            {
              userId: user1.id,
              skill: englishToHanziWord(`我:i`),
              rating: Rating.Again,
            },
            {
              userId: user2.id,
              skill: englishToHanziWord(`我:i`),
              rating: Rating.Good,
            },
          ])
          .returning({
            id: s.skillRating.id,
            skill: s.skillRating.skill,
            createdAt: s.skillRating.createdAt,
            version: sql<string>`${s.skillRating}.xmin`,
          });
        invariant(user1SkillRating != null);

        assert.deepEqual(await computeCvrEntities(tx, user1.id, schema), {
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

      await txTest(
        `only includes pinyinFinalAssociation for the user`,
        async (tx) => {
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
              version: sql<string>`${s.pinyinFinalAssociation}.xmin`,
            });
          invariant(user1PinyinFinalAssociation != null);

          assert.deepEqual(await computeCvrEntities(tx, user1.id, schema), {
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

      await txTest(
        `only includes pinyinInitialAssociation for the user`,
        async (tx) => {
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
              version: sql<string>`${s.pinyinInitialAssociation}.xmin`,
            });
          invariant(user1PinyinInitialAssociation != null);

          assert.deepEqual(await computeCvrEntities(tx, user1.id, schema), {
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
  }
});

void test(`fetchPushes()`, async (t) => {
  const txTest = withTxTest(t, { isolationLevel: `repeatable read` });

  await txTest(`works for non-existant user and client group`, async (tx) => {
    const clientGroupId = nanoid();
    const clientId = nanoid();

    const user = await createUser(tx);

    // Push a mutation from client 1
    await push(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pushVersion: 1,
      schemaVersion: v6.version,
      mutations: [
        {
          id: 1,
          name: `noop`,
          args: { arg1: `value1` },
          timestamp: 1,
          clientId,
        },
      ],
    });

    assert.deepEqual(
      await fetchMutations(tx, user.id, {
        schemaVersions: [v6.version],
        lastMutationIds: {},
      }),
      {
        mutations: [
          {
            clientGroupId,
            mutations: [
              {
                args: { arg1: `value1` },
                clientId,
                id: 1,
                name: `noop`,
                timestamp: 1,
              },
            ],
            schemaVersion: v6.version,
          },
        ],
      },
    );
  });
});
