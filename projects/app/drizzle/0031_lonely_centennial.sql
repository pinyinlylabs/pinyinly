CREATE TABLE "haohaohow"."userSettingHistory" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"key" text NOT NULL,
	"value" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."userSettingHistory" ADD CONSTRAINT "userSettingHistory_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "userSettingHistory_userId_key_index" ON "haohaohow"."userSettingHistory" USING btree ("userId","key");--> statement-breakpoint
CREATE INDEX "userSettingHistory_userId_createdAt_index" ON "haohaohow"."userSettingHistory" USING btree ("userId","createdAt");