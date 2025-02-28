CREATE TABLE "haohaohow"."remoteSync" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"remoteUrl" text NOT NULL,
	"remoteClientGroupId" text NOT NULL,
	"remoteProfileId" text NOT NULL,
	"remoteSessionId" text NOT NULL,
	"lastSyncedMutationIds" json NOT NULL,
	CONSTRAINT "remoteSync_remoteUrl_userId_unique" UNIQUE("remoteUrl","userId")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."remoteSync" ADD CONSTRAINT "remoteSync_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;