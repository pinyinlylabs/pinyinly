import { relatedPasskeyOrigins } from "@/server/lib/passkey";

export function GET() {
  return Response.json({ origins: relatedPasskeyOrigins });
}
