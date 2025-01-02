import { pullRequestSchema } from "@/data/rizzle";
import { withDrizzle } from "@/server/lib/db";
import { pull } from "@/server/lib/replicache";

export async function POST(request: Request) {
  // Get the sessionId from the Authorization header.
  const sessionId = request.headers.get(`Authorization`);
  if (sessionId === null) {
    return httpUnauthorized();
  }

  const pullRequest = pullRequestSchema.parse(await request.json());

  const result = await withDrizzle(async (db) => {
    const session = await db.query.authSession.findFirst({
      where: (t, { eq }) => eq(t.id, sessionId),
    });

    if (session == null || session.expiresAt < new Date()) {
      return httpUnauthorized();
    }

    return await db.transaction((tx) => pull(tx, session.userId, pullRequest), {
      isolationLevel: `repeatable read`,
    });
  });

  return Response.json(result);
}

function httpUnauthorized() {
  return new Response(undefined, { status: 401 });
}
