import { invariant } from "@haohaohow/lib/invariant";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { and, eq } from "drizzle-orm";
import { Lucia, TimeSpan } from "lucia";
import * as schema from "../schema";
import { Drizzle } from "./db";

export function getLucia(db: Drizzle) {
  const adapter = new DrizzlePostgreSQLAdapter(
    db,
    schema.authSession,
    schema.user,
  );
  return new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(365, `d`),
  });
}

export async function getOrCreateUser(
  db: Drizzle,
  options: {
    provider: string;
    providerUserId: string;
  },
) {
  const existingOAuth2 = await db.query.authOAuth2.findFirst({
    where: and(
      eq(schema.authOAuth2.provider, options.provider),
      eq(schema.authOAuth2.providerUserId, options.providerUserId),
    ),
  });

  // TODO: audit logging of when the method was used.

  if (existingOAuth2) {
    return existingOAuth2.userId;
  }

  // Create a new user
  const [newUser] = await db.insert(schema.user).values({}).returning();

  invariant(newUser !== undefined);

  // create a new OAuth2
  const [newOAuth2] = await db
    .insert(schema.authOAuth2)
    .values({
      provider: options.provider,
      providerUserId: options.providerUserId,
      userId: newUser.id,
    })
    .returning();

  invariant(newOAuth2 !== undefined);

  return newUser.id;
}
