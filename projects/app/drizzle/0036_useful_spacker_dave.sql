CREATE TABLE "haohaohow"."assetPendingUpload" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"assetId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assetPendingUpload_userId_assetId_unique" UNIQUE("userId","assetId")
);
--> statement-breakpoint
DROP TABLE "haohaohow"."asset" CASCADE;--> statement-breakpoint
ALTER TABLE "haohaohow"."assetPendingUpload" ADD CONSTRAINT "assetPendingUpload_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assetPendingUpload_userId_createdAt_index" ON "haohaohow"."assetPendingUpload" USING btree ("userId","createdAt");