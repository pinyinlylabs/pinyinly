CREATE TABLE "haohaohow"."hanziGlossMistake" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"hanzi" text NOT NULL,
	"gloss" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziGlossMistake" ADD CONSTRAINT "hanziGlossMistake_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hanziGlossMistake_userId_index" ON "haohaohow"."hanziGlossMistake" USING btree ("userId");
