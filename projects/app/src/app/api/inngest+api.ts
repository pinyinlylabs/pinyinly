import { functions, inngest } from "@/server/lib/inngest";
import { serve } from "inngest/bun";

const handler = async (req: Request) =>
  await serve({
    client: inngest,
    functions,
  })(req);

export const GET = handler;
export const PUT = handler;
export const POST = handler;
