CREATE TABLE "haohaohow"."hanziword_meaning_hint_selected" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"hanziWord" text NOT NULL,
	"selectedHintType" varchar(10) NOT NULL,
	"selectedHintId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hanziword_meaning_hint_selected_userId_hanziWord_unique" UNIQUE("userId","hanziWord")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."custom_hint" RENAME TO "hanziword_meaning_hint";--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziword_meaning_hint" RENAME COLUMN "assetIds" TO "imageIds";--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziword_meaning_hint" DROP CONSTRAINT "custom_hint_userId_customHintId_unique";--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziword_meaning_hint" DROP CONSTRAINT "custom_hint_userId_user_id_fk";
--> statement-breakpoint
DROP INDEX "haohaohow"."custom_hint_userId_index";--> statement-breakpoint
DROP INDEX "haohaohow"."custom_hint_userId_hanziWord_index";--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziword_meaning_hint_selected" ADD CONSTRAINT "hanziword_meaning_hint_selected_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hanziword_meaning_hint_selected_userId_index" ON "haohaohow"."hanziword_meaning_hint_selected" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziword_meaning_hint" ADD CONSTRAINT "hanziword_meaning_hint_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hanziword_meaning_hint_userId_index" ON "haohaohow"."hanziword_meaning_hint" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "hanziword_meaning_hint_userId_hanziWord_index" ON "haohaohow"."hanziword_meaning_hint" USING btree ("userId","hanziWord");--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziword_meaning_hint" ADD CONSTRAINT "hanziword_meaning_hint_userId_customHintId_unique" UNIQUE("userId","customHintId");