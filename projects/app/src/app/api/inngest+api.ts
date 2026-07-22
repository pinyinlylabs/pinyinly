import { functions, inngest as client } from "@/server/lib/inngest/index";
import { serve } from "inngest/bun";

const handler = serve({ client, functions });

export const GET = handler;
export const PUT = handler;
export const POST = handler;
