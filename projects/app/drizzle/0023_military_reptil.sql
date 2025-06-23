CREATE TABLE "haohaohow"."userSetting" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"key" text NOT NULL,
	"value" json,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userSetting_userId_key_unique" UNIQUE("userId","key")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."userSetting" ADD CONSTRAINT "userSetting_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;