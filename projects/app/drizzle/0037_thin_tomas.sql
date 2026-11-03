CREATE TABLE "haohaohow"."authPasskeyChallenge" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"rpId" text NOT NULL,
	"userId" text,
	"sessionId" text,
	"userName" text DEFAULT '' NOT NULL,
	"name" text DEFAULT 'Passkey' NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskey" ALTER COLUMN "credentialId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskey" ADD COLUMN "name" text DEFAULT 'Passkey' NOT NULL;--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskey" ADD COLUMN "rpId" text;