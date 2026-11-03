ALTER TABLE "haohaohow"."authPasskey" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskey" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskeyChallenge" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskeyChallenge" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "haohaohow"."authPasskeyChallenge" DROP COLUMN "sessionId";