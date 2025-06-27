CREATE TABLE "haohaohow"."authPasskey" (
	"credentialId" varchar(100) PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"publicKey" text NOT NULL,
	"webauthnUserId" text NOT NULL,
	"transports" text[] DEFAULT '{}',
	"counter" bigint DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"lastUsedAt" timestamp,
	"deviceType" varchar(32),
	"isBackedUp" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."user" ADD COLUMN "name" varchar(30);--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskey" ADD CONSTRAINT "authPasskey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;