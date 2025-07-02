CREATE TABLE "haohaohow"."pinyinSound" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"soundId" text NOT NULL,
	"name" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pinyinSound_userId_soundId_unique" UNIQUE("userId","soundId")
);
--> statement-breakpoint
CREATE TABLE "haohaohow"."pinyinSoundGroup" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"soundGroupId" text NOT NULL,
	"name" text,
	"theme" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pinyinSoundGroup_userId_soundGroupId_unique" UNIQUE("userId","soundGroupId")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."pinyinSound" ADD CONSTRAINT "pinyinSound_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haohaohow"."pinyinSoundGroup" ADD CONSTRAINT "pinyinSoundGroup_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;