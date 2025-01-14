import { functions, inngest } from "@/server/lib/inngest";
import { serve } from "inngest/bun";

const handler = serve({
  client: inngest,
  functions,
});

export const GET = handler;
export const PUT = handler;
export const POST = handler;
