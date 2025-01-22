CREATE TABLE "haohaohow"."pinyinInitialGroupTheme" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"groupId" text NOT NULL,
	"themeId" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pinyinInitialGroupTheme_userId_groupId_unique" UNIQUE("userId","groupId")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."pinyinInitialGroupTheme" ADD CONSTRAINT "pinyinInitialGroupTheme_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;