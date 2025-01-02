import { pushRequestSchema } from "@/data/rizzle";
import { withDrizzle } from "@/server/lib/db";
import { push } from "@/server/lib/replicache";

export async function POST(request: Request) {
  // Get the sessionId from the Authorization header.
  const sessionId = request.headers.get(`Authorization`);
  if (sessionId === null) {
    return httpUnauthorized();
  }

  const pushRequest = pushRequestSchema.parse(await request.json());

  const response = await withDrizzle(async (db) => {
    const session = await db.query.authSession.findFirst({
      where: (t, { eq }) => eq(t.id, sessionId),
    });

    if (session == null || session.expiresAt < new Date()) {
      return httpUnauthorized();
    }

    return await db.transaction((tx) => push(tx, session.userId, pushRequest), {
      isolationLevel: `repeatable read`,
    });
  });

  return response != null ? Response.json(response) : new Response();
}

function httpUnauthorized() {
  return new Response(undefined, { status: 401 });
}
