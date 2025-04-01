CREATE TABLE "haohaohow"."hanziPinyinMistake" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"hanzi" text NOT NULL,
	"pinyin" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziPinyinMistake" ADD CONSTRAINT "hanziPinyinMistake_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hanziPinyinMistake_userId_index" ON "haohaohow"."hanziPinyinMistake" USING btree ("userId");